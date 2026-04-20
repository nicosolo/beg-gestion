import { buildXlsx, type XlsxSheetData, type XlsxCellValue } from "./xlsx-writer"
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

interface ColumnDef {
    header: string
    key: string
    width: number
    numFmt?: string
    getValue: (invoice: InvoiceResponse) => string | number | Date | null
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

function getColumns(): ColumnDef[] {
    return [
        {
            header: "N° Facture",
            key: "invoiceNumber",
            width: 18,
            getValue: (i) => i.invoiceNumber || i.reference || "",
        },
        {
            header: "Client",
            key: "client",
            width: 25,
            getValue: (i) => i.project?.client?.name ?? "",
        },
        {
            header: "N° Mandat",
            key: "projectNumber",
            width: 12,
            getValue: (i) => i.project?.projectNumber ?? "",
        },
        {
            header: "Mandat",
            key: "projectName",
            width: 30,
            getValue: (i) => i.project?.name ?? "",
        },
        { header: "Objet", key: "reference", width: 35, getValue: (i) => i.reference ?? "" },
        {
            header: "Type",
            key: "type",
            width: 14,
            getValue: (i) => TYPE_LABELS[i.type] ?? i.type,
        },
        {
            header: "Date",
            key: "issueDate",
            width: 12,
            numFmt: "dd.mm.yyyy",
            getValue: (i) => (i.issueDate ? new Date(i.issueDate) : ""),
        },
        {
            header: "Total HT",
            key: "totalHT",
            width: 14,
            numFmt: "#,##0.00",
            getValue: (i) => i.totalHT ?? 0,
        },
        {
            header: "TVA",
            key: "vatAmount",
            width: 12,
            numFmt: "#,##0.00",
            getValue: (i) => i.vatAmount ?? 0,
        },
        {
            header: "Total TTC",
            key: "totalTTC",
            width: 14,
            numFmt: "#,##0.00",
            getValue: (i) => i.totalTTC ?? 0,
        },
        {
            header: "Statut",
            key: "status",
            width: 12,
            getValue: (i) => STATUS_LABELS[i.status] ?? i.status,
        },
        {
            header: "Responsable",
            key: "inChargeUser",
            width: 12,
            getValue: (i) => i.inChargeUser?.initials ?? "",
        },
    ]
}

function buildSheetData(sheetName: string, invoices: InvoiceResponse[]): XlsxSheetData {
    const columns = getColumns()
    const rows: XlsxCellValue[][] = []

    // Header row
    rows.push(
        columns.map((col) => ({
            value: col.header,
            bold: true,
            verticalAlignment: "center" as const,
        }))
    )

    // Data rows
    for (const invoice of invoices) {
        rows.push(columns.map((col) => ({ value: col.getValue(invoice) })))
    }

    // Totals row
    const hasData = invoices.length > 0
    const firstDataRow = 2
    const lastDataRow = hasData ? firstDataRow + invoices.length - 1 : firstDataRow - 1
    const sumKeys = ["totalHT", "vatAmount", "totalTTC"]

    rows.push(
        columns.map((col, c) => {
            if (c === 0) {
                return { value: "Total", bold: true, horizontalAlignment: "right" as const }
            }
            if (sumKeys.includes(col.key)) {
                const colLetter = getColumnLetter(c)
                if (hasData) {
                    return {
                        value: null,
                        formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})`,
                        bold: true,
                    }
                }
                return { value: 0, bold: true }
            }
            return { value: "" }
        })
    )

    return {
        name: sheetName,
        columns: columns.map((col) => ({ width: col.width, numFmt: col.numFmt })),
        rows,
        freezeRow: 1,
    }
}

export async function buildInvoicesWorkbook(
    invoices: InvoiceResponse[],
    options: InvoiceExportOptions = {}
) {
    const sheets: XlsxSheetData[] = []

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
            sheets.push(buildSheetData(sheetName, userInvoices))
        }

        if (sheets.length === 0) {
            sheets.push(buildSheetData("Factures", []))
        }
    } else {
        sheets.push(buildSheetData("Factures", invoices))
    }

    return buildXlsx(sheets)
}
