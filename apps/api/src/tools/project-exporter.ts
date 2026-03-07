/* eslint-disable */
// @ts-nocheck
import ExcelJS from "exceljs"
import type { ProjectResponse } from "@beg/validations"

interface ProjectExportOptions {
    perUser?: boolean
}

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
    projects: ProjectResponse[],
    options: ProjectExportOptions = {}
) {
    const worksheet = workbook.addWorksheet(sheetName)

    const columns: Partial<ExcelJS.Column>[] = [
        { header: "No Mandat", key: "projectNumber", width: 12 },
        { header: "Nom", key: "name", width: 35 },
        { header: "Responsable", key: "manager", width: 15 },
        { header: "Client", key: "client", width: 25 },
        { header: "Ingénieur", key: "engineer", width: 20 },
        { header: "Localité", key: "location", width: 20 },
        { header: "Date de début", key: "startDate", width: 14, style: { numFmt: "dd.mm.yyyy" } },
        {
            header: "Première activité",
            key: "firstActivityDate",
            width: 14,
            style: { numFmt: "dd.mm.yyyy" },
        },
        {
            header: "Dernière activité",
            key: "lastActivityDate",
            width: 14,
            style: { numFmt: "dd.mm.yyyy" },
        },
        { header: "Total heures", key: "totalDuration", width: 12, style: { numFmt: "0.00" } },
        {
            header: "Heures non facturées",
            key: "unBilledDuration",
            width: 18,
            style: { numFmt: "0.00" },
        },
    ]

    worksheet.columns = columns

    for (const project of projects) {
        worksheet.addRow({
            projectNumber: project.projectNumber ?? "",
            name: project.name ?? "",
            manager: project.projectManager
                ? `${project.projectManager.firstName} ${project.projectManager.lastName}`
                : "",
            client: project.client?.name ?? "",
            engineer: project.engineer?.name ?? "",
            location: project.location?.name ?? "",
            startDate: project.startDate ? new Date(project.startDate) : undefined,
            firstActivityDate: project.firstActivityDate
                ? new Date(project.firstActivityDate)
                : undefined,
            lastActivityDate: project.lastActivityDate
                ? new Date(project.lastActivityDate)
                : undefined,
            totalDuration: project.totalDuration ?? 0,
            unBilledDuration: project.unBilledDuration ?? 0,
        })
    }

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: "middle" }
    worksheet.views = [{ state: "frozen", ySplit: 1 }]

    const hasData = projects.length > 0
    const firstDataRow = 2
    const lastDataRow = hasData ? firstDataRow + projects.length - 1 : firstDataRow - 1

    // Get column letters dynamically based on column keys
    const totalDurationCol = getColumnLetterByKey(columns, "totalDuration")
    const unBilledDurationCol = getColumnLetterByKey(columns, "unBilledDuration")

    const totalsRow = worksheet.addRow({
        projectNumber: "Total",
        totalDuration:
            hasData && totalDurationCol
                ? {
                      formula: `SUM(${totalDurationCol}${firstDataRow}:${totalDurationCol}${lastDataRow})`,
                  }
                : 0,
        unBilledDuration:
            hasData && unBilledDurationCol
                ? {
                      formula: `SUM(${unBilledDurationCol}${firstDataRow}:${unBilledDurationCol}${lastDataRow})`,
                  }
                : 0,
    })

    totalsRow.font = { bold: true }
    totalsRow.getCell("A").alignment = { horizontal: "right" }

    // Ensure empty numeric cells display zero instead of blank
    for (const columnKey of ["totalDuration", "unBilledDuration"]) {
        const column = worksheet.getColumn(columnKey)
        column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
            if (rowNumber > 1 && typeof cell.value === "number") {
                cell.value = Number(cell.value)
            }
        })
    }
}

export async function buildProjectsWorkbook(
    projects: ProjectResponse[],
    options: ProjectExportOptions = {}
) {
    const workbook = new ExcelJS.Workbook()

    if (options.perUser) {
        // Group projects by manager
        const projectsByManager = projects.reduce(
            (acc, project) => {
                const managerId = project.projectManager?.id
                const managerName = project.projectManager
                    ? `${project.projectManager.firstName} ${project.projectManager.lastName} (${project.projectManager.initials})`
                    : "Sans responsable"

                const key = managerId ?? "no-manager"

                if (!acc[key]) {
                    acc[key] = {
                        managerName,
                        projects: [],
                    }
                }

                acc[key].projects.push(project)
                return acc
            },
            {} as Record<string | number, { managerName: string; projects: ProjectResponse[] }>
        )

        // Create a worksheet for each manager
        for (const [managerId, { managerName, projects: managerProjects }] of Object.entries(
            projectsByManager
        )) {
            const sheetName = managerName.substring(0, 31) // Excel sheet name limit
            createWorksheet(workbook, sheetName, managerProjects, options)
        }
    } else {
        // Create a single worksheet with all projects
        createWorksheet(workbook, "Mandats", projects, options)
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
}
