import { buildXlsx, type XlsxSheetData, type XlsxCellValue } from "./xlsx-writer"
import type { ActivityResponse } from "@beg/validations"

interface ActivityExportOptions {
    includeDisbursementColumn?: boolean
    perUser?: boolean
}

interface ColumnDef {
    header: string
    key: string
    width: number
    numFmt?: string
    getValue: (activity: ActivityResponse) => string | number | Date | null
}

const toExcelBoolean = (value?: boolean | null) => (value ? "Oui" : "Non")

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

function getColumns(includeDisbursement: boolean): ColumnDef[] {
    const cols: ColumnDef[] = [
        {
            header: "Date",
            key: "date",
            width: 10,
            numFmt: "dd.mm.yyyy",
            getValue: (a) => (a.date ? new Date(a.date) : ""),
        },
        { header: "Collaborateur", key: "user", width: 8, getValue: (a) => a.user?.initials ?? "" },
        {
            header: "Description",
            key: "description",
            width: 45,
            getValue: (a) => a.description ?? "",
        },
        { header: "Classe tarifaire", key: "rateClass", width: 6, getValue: (a) => a.rateClass ?? "" },
        { header: "Tarif", key: "rate", width: 6, numFmt: "#,##0.00", getValue: (a) => a.rate ?? 0 },
        { header: "No Mandat", key: "projectNumber", width: 8, getValue: (a) => a.project?.projectNumber ?? "" },
        { header: "Mandat", key: "projectName", width: 24, getValue: (a) => a.project?.name ?? "" },
        { header: "Activité", key: "activityCode", width: 18, getValue: (a) => a.activityType?.code ?? "" },
        { header: "Heures", key: "duration", width: 14, numFmt: "0.00", getValue: (a) => a.duration ?? 0 },
        { header: "Kilomètres", key: "kilometers", width: 14, numFmt: "0", getValue: (a) => a.kilometers ?? 0 },
        { header: "Frais", key: "expenses", width: 14, numFmt: "#,##0.00", getValue: (a) => a.expenses ?? 0 },
        { header: "Facturé", key: "billed", width: 12, getValue: (a) => toExcelBoolean(a.billed) },
    ]

    if (includeDisbursement) {
        cols.push({
            header: "Débours",
            key: "disbursement",
            width: 12,
            getValue: (a) => toExcelBoolean(a.disbursement),
        })
    }

    return cols
}

function buildSheetData(
    sheetName: string,
    activities: ActivityResponse[],
    options: ActivityExportOptions
): XlsxSheetData {
    const columns = getColumns(options.includeDisbursementColumn ?? false)

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
    for (const activity of activities) {
        rows.push(
            columns.map((col) => {
                const cell: XlsxCellValue = { value: col.getValue(activity) }
                if (col.key === "description") cell.wrapText = true
                return cell
            })
        )
    }

    // Totals row
    const hasData = activities.length > 0
    const firstDataRow = 2
    const lastDataRow = hasData ? firstDataRow + activities.length - 1 : firstDataRow - 1
    const sumKeys = ["duration", "kilometers", "expenses"]

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

export async function buildActivitiesWorkbook(
    activities: ActivityResponse[],
    options: ActivityExportOptions = {}
) {
    const sheets: XlsxSheetData[] = []

    if (options.perUser) {
        const activitiesByUser = activities.reduce(
            (acc, activity) => {
                const userId = activity.user?.id
                const userName = activity.user
                    ? `${activity.user.firstName} ${activity.user.lastName} (${activity.user.initials})`
                    : "Unknown"

                if (!userId) return acc
                if (!acc[userId]) acc[userId] = { userName, activities: [] }
                acc[userId].activities.push(activity)
                return acc
            },
            {} as Record<number, { userName: string; activities: ActivityResponse[] }>
        )

        const entries = Object.entries(activitiesByUser)
        if (entries.length === 0) {
            sheets.push(buildSheetData("Heures", [], options))
        } else {
            for (const [, { userName, activities: userActivities }] of entries) {
                const sheetName =
                    userName.replace(/[\\/*?[\]:]/g, "").substring(0, 31) || "Sans nom"
                sheets.push(buildSheetData(sheetName, userActivities, options))
            }
        }
    } else {
        sheets.push(buildSheetData("Heures", activities, options))
    }

    return buildXlsx(sheets)
}
