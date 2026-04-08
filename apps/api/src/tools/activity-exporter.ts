import ExcelJS from "exceljs"
import type { ActivityResponse } from "@beg/validations"

interface ActivityExportOptions {
    includeDisbursementColumn?: boolean
    perUser?: boolean
}

const toExcelBoolean = (value?: boolean | null) => (value ? "Oui" : "Non")

/**
 * Convert column index (0-based) to Excel column letter (A, B, C, ..., Z, AA, AB, ...)
 */
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

/**
 * Get column letter by column key from worksheet
 */
function getColumnLetterByKey(columns: Partial<ExcelJS.Column>[], key: string): string | undefined {
    const index = columns.findIndex((col) => col.key === key)
    return index >= 0 ? getColumnLetter(index) : undefined
}

function createWorksheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    activities: ActivityResponse[],
    options: ActivityExportOptions = {}
) {
    const worksheet = workbook.addWorksheet(sheetName)

    const columns: Partial<ExcelJS.Column>[] = [
        { header: "Date", key: "date", width: 10, style: { numFmt: "dd.mm.yyyy" } },
        { header: "Collaborateur", key: "user", width: 8 },
        { header: "Description", key: "description", width: 45 },
        { header: "Classe tarifaire", key: "rateClass", width: 6 },
        { header: "Tarif", key: "rate", width: 6, style: { numFmt: "#,##0.00" } },
        { header: "No Mandat", key: "projectNumber", width: 8 },
        { header: "Mandat", key: "projectName", width: 24 },
        { header: "Activité", key: "activityCode", width: 18 },
        { header: "Heures", key: "duration", width: 14, style: { numFmt: "0.00" } },
        { header: "Kilomètres", key: "kilometers", width: 14, style: { numFmt: "0" } },
        { header: "Frais", key: "expenses", width: 14, style: { numFmt: "#,##0.00" } },
        { header: "Facturé", key: "billed", width: 12 },
    ]

    if (options.includeDisbursementColumn) {
        columns.push({ header: "Débours", key: "disbursement", width: 12 })
    }

    worksheet.columns = columns

    for (const activity of activities) {
        worksheet.addRow({
            date: activity.date ? new Date(activity.date) : undefined,
            user: activity.user?.initials ?? "",
            rateClass: activity.rateClass ?? "",
            rate: activity.rate ?? 0,
            projectNumber: activity.project?.projectNumber ?? "",
            projectName: activity.project?.name ?? "",
            activityCode: activity.activityType?.code ?? "",
            duration: activity.duration ?? 0,

            kilometers: activity.kilometers ?? 0,
            expenses: activity.expenses ?? 0,
            description: activity.description ?? "",
            billed: toExcelBoolean(activity.billed),
            ...(options.includeDisbursementColumn
                ? { disbursement: toExcelBoolean(activity.disbursement) }
                : {}),
        })
    }

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: "middle" }
    worksheet.views = [{ state: "frozen", ySplit: 1 }]

    worksheet.getColumn("description").alignment = { wrapText: true }

    const hasData = activities.length > 0
    const firstDataRow = 2
    const lastDataRow = hasData ? firstDataRow + activities.length - 1 : firstDataRow - 1

    // Get column letters dynamically based on column keys
    const durationCol = getColumnLetterByKey(columns, "duration")
    const kilometersCol = getColumnLetterByKey(columns, "kilometers")
    const expensesCol = getColumnLetterByKey(columns, "expenses")
    const totalsRow = worksheet.addRow({
        date: "Total",
        duration:
            hasData && durationCol
                ? { formula: `SUM(${durationCol}${firstDataRow}:${durationCol}${lastDataRow})` }
                : 0,
        rate: "",
        kilometers:
            hasData && kilometersCol
                ? {
                      formula: `SUM(${kilometersCol}${firstDataRow}:${kilometersCol}${lastDataRow})`,
                  }
                : 0,
        expenses:
            hasData && expensesCol
                ? { formula: `SUM(${expensesCol}${firstDataRow}:${expensesCol}${lastDataRow})` }
                : 0,
        billed: "",
        ...(options.includeDisbursementColumn ? { disbursement: "" } : {}),
    })

    totalsRow.font = { bold: true }
    totalsRow.getCell("A").alignment = { horizontal: "right" }
}

export async function buildActivitiesWorkbook(
    activities: ActivityResponse[],
    options: ActivityExportOptions = {}
) {
    const workbook = new ExcelJS.Workbook()

    if (options.perUser) {
        // Group activities by user
        const activitiesByUser = activities.reduce(
            (acc, activity) => {
                const userId = activity.user?.id
                const userName = activity.user
                    ? `${activity.user.firstName} ${activity.user.lastName} (${activity.user.initials})`
                    : "Unknown"

                if (!userId) {
                    return acc
                }

                if (!acc[userId]) {
                    acc[userId] = {
                        userName,
                        activities: [],
                    }
                }

                acc[userId].activities.push(activity)
                return acc
            },
            {} as Record<number, { userName: string; activities: ActivityResponse[] }>
        )

        // Create a worksheet for each user
        for (const [, { userName, activities: userActivities }] of Object.entries(
            activitiesByUser
        )) {
            // Excel sheet names: max 31 chars, no special chars
            const sheetName = userName.replace(/[\\/*?[\]:]/g, "").substring(0, 31) || "Sans nom"
            createWorksheet(workbook, sheetName, userActivities, options)
        }

        // Ensure workbook has at least one sheet
        if (workbook.worksheets.length === 0) {
            createWorksheet(workbook, "Heures", [], options)
        }
    } else {
        // Create a single worksheet with all activities
        createWorksheet(workbook, "Heures", activities, options)
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
}
