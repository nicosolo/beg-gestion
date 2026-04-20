import ExcelJS from "exceljs"
import type { InvoiceResponse } from "@beg/validations"

interface InvoiceExportOptions {
    perUser?: boolean
}

const STATUS_LABELS: Record<string, string> = {
    draft: "Préparation",
    controle: "Contrôle",
    vise: "Visée",
    sent: "Envoyée",
}

const TYPE_LABELS: Record<string, string> = {
    invoice: "Facture",
    final_invoice: "Facture finale",
    situation: "Situation",
    deposit: "Acompte",
}

function getColumnLetter(index: number): string {
    let letter = ""
    let num = index + 1

    while (num > 0) {
        const remainder = (num - 1) % 26
        letter = String.fromCharCode(65 + remainder) + letter
        num = Math.floor((num - 1) / 26)
    }

    return letter
}

function getColumnLetterByKey(columns: Partial<ExcelJS.Column>[], key: string): string | undefined {
    const index = columns.findIndex((col) => col.key === key)
    return index >= 0 ? getColumnLetter(index) : undefined
}

function createWorksheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    invoices: InvoiceResponse[]
) {
    const worksheet = workbook.addWorksheet(sheetName)

    const columns: Partial<ExcelJS.Column>[] = [
        { header: "N° Facture", key: "invoiceNumber", width: 18 },
        { header: "Client", key: "client", width: 25 },
        { header: "N° Mandat", key: "projectNumber", width: 12 },
        { header: "Mandat", key: "projectName", width: 30 },
        { header: "Objet", key: "reference", width: 35 },
        { header: "Type", key: "type", width: 14 },
        { header: "Date", key: "issueDate", width: 12, style: { numFmt: "dd.mm.yyyy" } },
        { header: "Total HT", key: "totalHT", width: 14, style: { numFmt: "#,##0.00" } },
        { header: "TVA", key: "vatAmount", width: 12, style: { numFmt: "#,##0.00" } },
        { header: "Total TTC", key: "totalTTC", width: 14, style: { numFmt: "#,##0.00" } },
        { header: "Statut", key: "status", width: 12 },
        { header: "Responsable", key: "inChargeUser", width: 12 },
    ]

    worksheet.columns = columns

    for (const invoice of invoices) {
        worksheet.addRow({
            invoiceNumber: invoice.invoiceNumber || invoice.reference || "",
            client: invoice.project?.client?.name ?? "",
            projectNumber: invoice.project?.projectNumber ?? "",
            projectName: invoice.project?.name ?? "",
            reference: invoice.reference ?? "",
            type: TYPE_LABELS[invoice.type] ?? invoice.type,
            issueDate: invoice.issueDate ? new Date(invoice.issueDate) : undefined,
            totalHT: invoice.totalHT ?? 0,
            vatAmount: invoice.vatAmount ?? 0,
            totalTTC: invoice.totalTTC ?? 0,
            status: STATUS_LABELS[invoice.status] ?? invoice.status,
            inChargeUser: invoice.inChargeUser?.initials ?? "",
        })
    }

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: "middle" }
    worksheet.views = [{ state: "frozen", ySplit: 1 }]

    const hasData = invoices.length > 0
    const firstDataRow = 2
    const lastDataRow = hasData ? firstDataRow + invoices.length - 1 : firstDataRow - 1

    const totalHTCol = getColumnLetterByKey(columns, "totalHT")
    const vatAmountCol = getColumnLetterByKey(columns, "vatAmount")
    const totalTTCCol = getColumnLetterByKey(columns, "totalTTC")

    const totalsRow = worksheet.addRow({
        invoiceNumber: "Total",
        totalHT:
            hasData && totalHTCol
                ? { formula: `SUM(${totalHTCol}${firstDataRow}:${totalHTCol}${lastDataRow})` }
                : 0,
        vatAmount:
            hasData && vatAmountCol
                ? { formula: `SUM(${vatAmountCol}${firstDataRow}:${vatAmountCol}${lastDataRow})` }
                : 0,
        totalTTC:
            hasData && totalTTCCol
                ? { formula: `SUM(${totalTTCCol}${firstDataRow}:${totalTTCCol}${lastDataRow})` }
                : 0,
    })

    totalsRow.font = { bold: true }
    totalsRow.getCell("A").alignment = { horizontal: "right" }
}

export async function buildInvoicesWorkbook(
    invoices: InvoiceResponse[],
    options: InvoiceExportOptions = {}
) {
    const workbook = new ExcelJS.Workbook()

    if (options.perUser) {
        const invoicesByUser = invoices.reduce(
            (acc, invoice) => {
                const userId = invoice.inChargeUser?.id
                const userName = invoice.inChargeUser
                    ? `${invoice.inChargeUser.firstName} ${invoice.inChargeUser.lastName} (${invoice.inChargeUser.initials})`
                    : null

                const key = userId ?? "no-user"
                const name = userName ?? "Sans responsable"

                if (!acc[key]) {
                    acc[key] = { userName: name, invoices: [] }
                }
                acc[key].invoices.push(invoice)
                return acc
            },
            {} as Record<string | number, { userName: string; invoices: InvoiceResponse[] }>
        )

        for (const [, { userName, invoices: userInvoices }] of Object.entries(invoicesByUser)) {
            const sheetName =
                userName.replace(/[\\/*?[\]:]/g, "").substring(0, 31) || "Sans nom"
            createWorksheet(workbook, sheetName, userInvoices)
        }

        if (workbook.worksheets.length === 0) {
            createWorksheet(workbook, "Factures", [])
        }
    } else {
        createWorksheet(workbook, "Factures", invoices)
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
}
