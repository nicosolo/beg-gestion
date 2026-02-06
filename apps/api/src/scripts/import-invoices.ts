import { db } from "../db"
import {
    invoices,
    invoiceRates,
    invoiceOffers,
    invoiceAdjudications,
    invoiceSituations,
    invoiceDocuments,
    projects,
    users,
} from "../db/schema"
import { eq, and } from "drizzle-orm"
import fs from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import type { InvoiceType, BillingMode, InvoiceStatus } from "@beg/validations"
import { storeFileFromPath } from "../services/file-storage.service"

// Base path for mandats in container
const MANDATS_BASE_PATH = "/mandats"

// Map legacy edtVisa index to user initials
const VISA_USER_INITIALS: Record<string, string> = {
    "0": "fp",
    "1": "js",
    "2": "mo",
}

interface FabData {
    internal: Record<string, string>
    datas: Record<string, string>
}

interface GridRow {
    [key: string]: string
}

interface RateClassData {
    rateClass: string
    baseHours: number
    adjustedHours: number
    hourlyRate: number
    amount: number
}

interface AttachedFile {
    filename: string
    date: Date | null
    amount: number
    remark: string
    filePath: string | null
}

// Parse .fab file content (INI-like format)
function parseFabFile(content: string): FabData {
    const result: FabData = {
        internal: {},
        datas: {},
    }

    let currentSection: "internal" | "datas" | null = null

    const lines = content.split(/\r?\n/)

    for (const line of lines) {
        const trimmed = line.trim()

        // Section headers
        if (trimmed === "[INTERNAL]") {
            currentSection = "internal"
            continue
        } else if (trimmed === "[DATAS]") {
            currentSection = "datas"
            continue
        } else if (trimmed === "[CHECK]") {
            currentSection = null
            continue
        }

        // Key=value pairs
        if (currentSection && trimmed.includes("=")) {
            const eqIndex = trimmed.indexOf("=")
            const key = trimmed.substring(0, eqIndex)
            const value = trimmed.substring(eqIndex + 1)

            if (currentSection === "internal") {
                result.internal[key] = value
            } else if (currentSection === "datas") {
                result.datas[key] = value
            }
        }
    }

    return result
}

// Parse date in DD.MM.YY or DD.MM.YYYY format
function parseFabDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === "") return null

    const parts = dateStr.split(".")
    if (parts.length !== 3) return null

    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // 0-indexed
    let year = parseInt(parts[2], 10)

    // Convert 2-digit year to 4-digit
    if (year < 100) {
        year = year <= 30 ? 2000 + year : 1900 + year
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null

    return new Date(year, month, day)
}

// Parse Swiss number format: 3'493.75 or 4'590.00 → 3493.75 or 4590.00
function parseSwissNumber(str: string): number {
    if (!str || str.trim() === "") return 0
    // Remove apostrophes and special chars, keep decimal point
    const cleaned = str
        .replace(/[']/g, "")
        .replace(/,/g, ".")
        .replace(/[^\d.-]/g, "")
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
}

// Convert Windows path to Unix path and verify existence
function convertWindowsPath(windowsPath: string): string | null {
    if (!windowsPath || windowsPath.trim() === "") return null

    // Replace N:\Mandats\ with /mandats/
    let unixPath = windowsPath
        .replace(/^[A-Za-z]:\\Mandats\\/i, MANDATS_BASE_PATH + "/")
        .replace(/\\/g, "/")

    // Verify file exists
    if (!existsSync(unixPath)) {
        console.warn(`File not found: ${unixPath}`)
        return null
    }

    return unixPath
}

// Parse multiline fields (edtAdresse0, edtAdresse1, etc.)
function parseMultiline(data: Record<string, string>, prefix: string): string {
    const countKey = `${prefix}count`
    const count = parseInt(data[countKey] || "0", 10)

    const lines: string[] = []
    for (let i = 0; i < count; i++) {
        const line = data[`${prefix}${i}`]?.trim()
        if (line !== undefined) {
            lines.push(line)
        }
    }

    return lines.join("\n")
}

// Parse rate classes from grdFacture (starts at row 2, ends when "Total h." is found)
function parseRateClasses(data: Record<string, string>): RateClassData[] {
    const rateClasses: RateClassData[] = []

    // Scan from row 2 until we hit "Total h."
    for (let row = 2; row < 50; row++) {
        const cellValue = data[`grdFacture${row}.0`]?.trim()

        // Stop when we reach "Total h."
        if (cellValue === "Total h.") break

        // Skip if not a single character (rate class letter)
        if (!cellValue || cellValue.length !== 1) continue

        const baseHours = parseSwissNumber(data[`grdFacture${row}.1`])
        const adjustedHours = parseSwissNumber(data[`grdFacture${row}.2`])
        const hourlyRate = parseSwissNumber(data[`grdFacture${row}.3`])
        const amount = parseSwissNumber(data[`grdFacture${row}.4`])

        // Only add if there's any data
        if (baseHours > 0 || adjustedHours > 0 || amount > 0) {
            rateClasses.push({
                rateClass: cellValue,
                baseHours,
                adjustedHours,
                hourlyRate,
                amount,
            })
        }
    }

    return rateClasses
}

// Parse attached files grid (grdOffres, grdAdjudications, grdDocuments)
function parseAttachedFiles(
    data: Record<string, string>,
    prefix: string,
    hasAmount: boolean = true
): AttachedFile[] {
    const files: AttachedFile[] = []
    const rowCount = parseInt(data[`${prefix}RowCount`] || "0", 10)

    // Start at row 1 (row 0 is header)
    for (let row = 1; row < rowCount; row++) {
        const filename = data[`${prefix}${row}.0`] || ""
        const dateStr = data[`${prefix}${row}.1`] || ""
        const amountStr = hasAmount ? data[`${prefix}${row}.2`] || "" : ""
        const remark = data[`${prefix}${row}.3`] || ""
        const windowsPath = data[`${prefix}${row}.4`] || ""

        // Skip empty rows or counter rows (just a number in first column)
        if (!filename || /^\d+$/.test(filename)) continue

        const filePath = convertWindowsPath(windowsPath)

        files.push({
            filename,
            date: parseFabDate(dateStr),
            amount: parseSwissNumber(amountStr),
            remark,
            filePath,
        })
    }

    return files
}

// Map edtType to InvoiceType
// DFM Items: 0='Facture', 1='Facture finale', 2='Situation', 3='Acompte'
function mapInvoiceType(edtType: string): InvoiceType {
    switch (edtType) {
        case "0":
            return "invoice"
        case "1":
            return "final_invoice"
        case "2":
            return "situation"
        case "3":
            return "deposit"
        default:
            return "invoice"
    }
}

// Map edtMode to BillingMode
function mapBillingMode(edtMode: string): BillingMode {
    switch (edtMode) {
        case "0":
            return "accordingToData"
        case "1":
            return "accordingToOffer"
        case "2":
            return "accordingToInvoice"
        case "3":
            return "fixedPrice"
        default:
            return "accordingToData"
    }
}

// Map edtVisa and edtBon to InvoiceStatus
// - vise: if edtBon=1 (approved) AND visa user is set
// - draft: otherwise
function mapInvoiceStatus(edtVisa: string, edtBon: string): InvoiceStatus {
    const isApproved = edtBon === "1"
    const hasVisaUser = !!VISA_USER_INITIALS[edtVisa]
    return isApproved && hasVisaUser ? "sent" : "controle"
}

// Get visa user ID from legacy edtVisa index
async function getVisaUserId(edtVisa: string): Promise<number | null> {
    const initials = VISA_USER_INITIALS[edtVisa]
    if (!initials) return null

    const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.initials, initials))
        .limit(1)

    return user?.id ?? null
}

// Get user ID from initials (for edtResponsable)
async function getUserIdByInitials(initials: string): Promise<number | null> {
    if (!initials || initials.trim() === "") return null

    const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.initials, initials.toLowerCase().trim()))
        .limit(1)

    return user?.id ?? null
}

// Generate invoice number from filename
function generateInvoiceNumber(filename: string): string {
    // Remove .fab extension and replace spaces with -
    return path.basename(filename, ".fab")
}

// Parse pnlCode to extract projectNumber and optional subProjectName
// e.g., "7011 INF" -> { projectNumber: "7011", subProjectName: "INF" }
// e.g., "7000" -> { projectNumber: "7000", subProjectName: null }
function parseProjectCode(code: string): { projectNumber: string; subProjectName: string | null } {
    const trimmed = code.trim()
    const spaceIndex = trimmed.indexOf(" ")

    if (spaceIndex === -1) {
        return { projectNumber: trimmed, subProjectName: null }
    }

    return {
        projectNumber: trimmed.substring(0, spaceIndex),
        subProjectName: trimmed.substring(spaceIndex + 1).trim() || null,
    }
}

// Import a single invoice from a .fab file
async function importInvoiceFromFab(fabPath: string): Promise<boolean> {
    try {
        // Read file as binary buffer, then decode with Windows-1252
        const buffer = await fs.readFile(fabPath)
        const decoder = new TextDecoder("windows-1252")
        const content = decoder.decode(buffer)
        const fabData = parseFabFile(content)

        // Use pnlCode (project number + optional subProjectName) to find the project
        const rawCode = fabData.datas["pnlCode"] || fabData.internal["Code"] || ""
        if (!rawCode) {
            console.warn(`No valid pnlCode or Code in ${fabPath}`)
            return false
        }

        const { projectNumber, subProjectName } = parseProjectCode(rawCode)

        // Find project by projectNumber and optionally subProjectName
        let project: { id: number } | undefined

        if (subProjectName) {
            // Query with subProjectName filter
            const subProjectResults = await db
                .select({ id: projects.id })
                .from(projects)
                .where(
                    and(
                        eq(projects.projectNumber, projectNumber),
                        eq(projects.subProjectName, subProjectName)
                    )
                )
                .limit(1)

            project = subProjectResults[0]
        } else {
            // No subProjectName - look for project without subProjectName or take first match
            const mainProjectResults = await db
                .select({ id: projects.id, subProjectName: projects.subProjectName })
                .from(projects)
                .where(eq(projects.projectNumber, projectNumber))

            // Prefer project without subProjectName, otherwise take first
            project = mainProjectResults.find((p) => !p.subProjectName) || mainProjectResults[0]
        }

        if (!project) {
            console.warn(
                `Project ${projectNumber}${subProjectName ? "/" + subProjectName : ""} not found for ${fabPath}`
            )
            return false
        }

        const projectId = project.id

        const invoiceNumber = generateInvoiceNumber(path.basename(fabPath))
        const reference = fabData.internal["Code"] || ""

        // Check for existing invoice and delete if found (replace mode)
        const existingInvoice = await db
            .select({ id: invoices.id })
            .from(invoices)
            .where(
                and(eq(invoices.projectId, projectId), eq(invoices.invoiceNumber, invoiceNumber))
            )
            .limit(1)

        if (existingInvoice.length > 0) {
            console.log(`Replacing existing invoice ${invoiceNumber} for project ${projectId}`)
            await db.delete(invoices).where(eq(invoices.id, existingInvoice[0].id))
        }

        // Parse dates
        const periodStart = parseFabDate(fabData.internal["De"]) || new Date()
        const periodEnd = parseFabDate(fabData.internal["A"]) || new Date()
        const visaDate = parseFabDate(fabData.datas["edtVisaDate"])
        const issueDate = parseFabDate(fabData.datas["edtLast"]) || visaDate || new Date()

        // Parse multiline fields
        const clientAddress = parseMultiline(fabData.datas, "edtAdresse")
        const recipientAddress = parseMultiline(fabData.datas, "edtEnvoi")
        const otherServices = parseMultiline(fabData.datas, "edtPrestations")
        const note = parseMultiline(fabData.datas, "edtComment")

        // Parse rate grid values
        const d = fabData.datas
        const feesBase = parseSwissNumber(d["grdFacture8.1"])
        const feesTotal = parseSwissNumber(d["grdFacture8.4"])
        const feesOthers = parseSwissNumber(d["grdFacture9.4"])
        const feesAdjusted = parseSwissNumber(d["grdFacture10.4"])
        const feesDiscountPercentage = parseSwissNumber(d["grdFacture11.3"]) || null
        const feesDiscountAmount = parseSwissNumber(d["grdFacture11.4"]) || null
        const feesFinalTotal = parseSwissNumber(d["grdFacture12.4"])

        const expensesTravelBase = parseSwissNumber(d["grdFacture16.1"])
        const expensesTravelAdjusted = parseSwissNumber(d["grdFacture16.2"])
        const expensesTravelRateRaw = parseSwissNumber(d["grdFacture16.3"])
        const expensesTravelRate = expensesTravelRateRaw > 0 ? expensesTravelRateRaw : 0.65 // Default 0.65 = 65
        const expensesTravelAmount = parseSwissNumber(d["grdFacture16.4"])

        const expensesOtherBase = parseSwissNumber(d["grdFacture17.1"])
        const expensesOtherAmount = parseSwissNumber(d["grdFacture17.4"])

        const expensesPackagePercentage = parseSwissNumber(d["grdFacture20.3"])
        const expensesPackageAmount = parseSwissNumber(d["grdFacture20.4"])
        const expensesThirdPartyAmount = parseSwissNumber(d["grdFacture21.4"])

        const expensesTotalExpenses = parseSwissNumber(d["grdFacture22.4"])

        const totalHT = parseSwissNumber(d["grdFacture24.4"])
        const vatRateRaw = parseSwissNumber(d["grdFacture25.3"])
        const vatRate = vatRateRaw > 0 ? vatRateRaw : 8 // Default 8% = 800
        const vatAmount = parseSwissNumber(d["grdFacture25.4"])
        const totalTTC = parseSwissNumber(d["grdFacture26.4"])

        // Get visa user ID
        const visaByUserId = await getVisaUserId(d["edtVisa"] || "")

        // Get in charge user ID from edtResponsable (user initials)
        const inChargeUserId = await getUserIdByInitials(d["edtResponsable"] || "")

        // Insert invoice
        const [insertedInvoice] = await db
            .insert(invoices)
            .values({
                projectId,
                invoiceNumber,
                reference: d["edtObjet"] || "",
                type: mapInvoiceType(d["edtType"]),
                billingMode: mapBillingMode(d["edtMode"]),
                status: mapInvoiceStatus(d["edtVisa"] || "", d["edtBon"] || "0"),
                issueDate,
                dueDate: null,
                periodStart,
                periodEnd,
                period: d["edtPériode"] || d["edtPeriode"] || "",
                clientAddress,
                recipientAddress,
                description: otherServices,
                note,
                otherServices: "",
                visaDate,
                visaByUserId,
                inChargeUserId,
                legacyInvoicePath: fabPath.replace("/mandats/", ""),
                feesBase,
                feesAdjusted,
                feesTotal,
                feesOthers,
                feesFinalTotal,
                feesDiscountPercentage,
                feesDiscountAmount,
                expensesTravelBase,
                expensesTravelAdjusted,
                expensesTravelRate,
                expensesTravelAmount,
                expensesOtherBase,
                expensesOtherAmount,
                expensesThirdPartyAmount,
                expensesPackagePercentage,
                expensesPackageAmount,
                expensesTotalExpenses,
                feesMultiplicationFactor: 1,
                totalHT,
                vatRate,
                vatAmount,
                totalTTC,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning({ id: invoices.id })

        const invoiceId = insertedInvoice.id

        // Insert rate classes
        const rateClasses = parseRateClasses(fabData.datas)
        if (rateClasses.length > 0) {
            await db.insert(invoiceRates).values(
                rateClasses.map((rc) => ({
                    invoiceId,
                    rateClass: rc.rateClass,
                    baseMinutes: Math.round(rc.baseHours * 60),
                    adjustedMinutes: Math.round(rc.adjustedHours * 60),
                    hourlyRate: Math.round(rc.hourlyRate),
                    amount: Math.round(rc.amount),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            )
        }
        const folderId = crypto.randomUUID()
        // Insert offers
        const offers = parseAttachedFiles(fabData.datas, "grdOffres", true)
        const validOffers = offers.filter((o) => o.filePath)
        if (validOffers.length > 0) {
            const storedOffers = await Promise.all(
                validOffers.map(async (o) => ({
                    invoiceId,
                    file: await storeFileFromPath(o.filePath!, "invoice", folderId),
                    date: o.date || new Date(),
                    amount: Math.round(o.amount),
                    remark: o.remark,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            )
            await db.insert(invoiceOffers).values(storedOffers)
        }

        // Insert adjudications
        const adjudications = parseAttachedFiles(fabData.datas, "grdAdjudications", true)
        const validAdjudications = adjudications.filter((a) => a.filePath)
        if (validAdjudications.length > 0) {
            const storedAdjudications = await Promise.all(
                validAdjudications.map(async (a) => ({
                    invoiceId,
                    file: await storeFileFromPath(a.filePath!, "invoice", folderId),
                    date: a.date || new Date(),
                    amount: Math.round(a.amount),
                    remark: a.remark,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            )
            await db.insert(invoiceAdjudications).values(storedAdjudications)
        }

        // Insert situations
        const situations = parseAttachedFiles(fabData.datas, "grdSituations", true)
        const validSituations = situations.filter((s) => s.filePath)
        if (validSituations.length > 0) {
            const storedSituations = await Promise.all(
                validSituations.map(async (s) => ({
                    invoiceId,
                    file: await storeFileFromPath(s.filePath!, "invoice", folderId),
                    date: s.date || new Date(),
                    amount: Math.round(s.amount),
                    remark: s.remark,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            )
            await db.insert(invoiceSituations).values(storedSituations)
        }

        // Insert documents
        const documents = parseAttachedFiles(fabData.datas, "grdDocuments", false)
        const validDocuments = documents.filter((d) => d.filePath)
        if (validDocuments.length > 0) {
            const storedDocuments = await Promise.all(
                validDocuments.map(async (doc) => ({
                    invoiceId,
                    file: await storeFileFromPath(doc.filePath!, "invoice", folderId),
                    date: doc.date || new Date(),
                    remark: doc.remark,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            )
            await db.insert(invoiceDocuments).values(storedDocuments)
        }

        console.log(`Imported invoice ${invoiceNumber} for project ${projectId}`)
        return true
    } catch (error) {
        console.error(`Error importing ${fabPath}:`, error)
        return false
    }
}

// Find all .fab files recursively
async function findFabFiles(dir: string): Promise<string[]> {
    const fabFiles: string[] = []

    async function walk(currentDir: string) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true })

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name)

                if (entry.isDirectory()) {
                    await walk(fullPath)
                } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".fab")) {
                    console.log(`Found .fab file: ${fullPath}`)
                    fabFiles.push(fullPath)
                }
            }
        } catch (error) {
            console.warn(`Cannot read directory ${currentDir}:`, error)
        }
    }

    await walk(dir)
    return fabFiles
}

// Main import function
export async function importInvoices(mandatsDir: string = MANDATS_BASE_PATH): Promise<void> {
    console.log(`Searching for .fab files in ${mandatsDir}...`)

    const fabFiles = await findFabFiles(mandatsDir)
    console.log(`Found ${fabFiles.length} .fab files`)

    let imported = 0
    let failed = 0

    for (const fabFile of fabFiles) {
        const success = await importInvoiceFromFab(fabFile)
        if (success) {
            imported++
        } else {
            failed++
        }
    }

    console.log(`Invoice import complete: ${imported} imported, ${failed} failed`)
}

// Standalone script entry point
async function main() {
    const mandatsDir = process.argv[2] || MANDATS_BASE_PATH
    await importInvoices(mandatsDir)
}

if (import.meta.main) {
    main()
        .then(() => {
            console.log("Invoice import completed")
            process.exit(0)
        })
        .catch((error) => {
            console.error("Failed to import invoices", error)
            process.exit(1)
        })
}
