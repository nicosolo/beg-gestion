import { buildXlsx, type XlsxSheetData, type XlsxCellValue } from "./xlsx-writer"
import type { ProjectResponse } from "@beg/validations"

interface ProjectExportOptions {
    perUser?: boolean
}

interface ColumnDef {
    header: string
    key: string
    width: number
    numFmt?: string
    getValue: (project: ProjectResponse) => string | number | Date | null
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
        { header: "No Mandat", key: "projectNumber", width: 12, getValue: (p) => p.projectNumber ?? "" },
        { header: "Nom", key: "name", width: 35, getValue: (p) => p.name ?? "" },
        {
            header: "Responsable",
            key: "manager",
            width: 15,
            getValue: (p) =>
                p.projectManagers?.length
                    ? p.projectManagers.map((m) => `${m.firstName} ${m.lastName}`).join(", ")
                    : "",
        },
        { header: "Client", key: "client", width: 25, getValue: (p) => p.client?.name ?? "" },
        { header: "Ingénieur", key: "engineer", width: 20, getValue: (p) => p.engineer?.name ?? "" },
        { header: "Localité", key: "location", width: 20, getValue: (p) => p.location?.name ?? "" },
        {
            header: "Date de début",
            key: "startDate",
            width: 14,
            numFmt: "dd.mm.yyyy",
            getValue: (p) => (p.startDate ? new Date(p.startDate) : ""),
        },
        {
            header: "Première activité",
            key: "firstActivityDate",
            width: 14,
            numFmt: "dd.mm.yyyy",
            getValue: (p) => (p.firstActivityDate ? new Date(p.firstActivityDate) : ""),
        },
        {
            header: "Dernière activité",
            key: "lastActivityDate",
            width: 14,
            numFmt: "dd.mm.yyyy",
            getValue: (p) => (p.lastActivityDate ? new Date(p.lastActivityDate) : ""),
        },
        {
            header: "Total heures",
            key: "totalDuration",
            width: 12,
            numFmt: "0.00",
            getValue: (p) => p.totalDuration ?? 0,
        },
        {
            header: "Heures non facturées",
            key: "unBilledDuration",
            width: 18,
            numFmt: "0.00",
            getValue: (p) => p.unBilledDuration ?? 0,
        },
    ]
}

function buildSheetData(sheetName: string, projects: ProjectResponse[]): XlsxSheetData {
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
    for (const project of projects) {
        rows.push(columns.map((col) => ({ value: col.getValue(project) })))
    }

    // Totals row
    const hasData = projects.length > 0
    const firstDataRow = 2
    const lastDataRow = hasData ? firstDataRow + projects.length - 1 : firstDataRow - 1
    const sumKeys = ["totalDuration", "unBilledDuration"]

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

export async function buildProjectsWorkbook(
    projects: ProjectResponse[],
    options: ProjectExportOptions = {}
) {
    const sheets: XlsxSheetData[] = []

    if (options.perUser) {
        const projectsByManager = projects.reduce(
            (acc, project) => {
                const managers = project.projectManagers ?? []

                if (managers.length === 0) {
                    const key = "no-manager"
                    if (!acc[key]) acc[key] = { managerName: "Sans responsable", projects: [] }
                    acc[key].projects.push(project)
                    return acc
                }

                for (const manager of managers) {
                    const key = manager.id
                    const managerName = `${manager.firstName} ${manager.lastName} (${manager.initials})`
                    if (!acc[key]) acc[key] = { managerName, projects: [] }
                    acc[key].projects.push(project)
                }

                return acc
            },
            {} as Record<string | number, { managerName: string; projects: ProjectResponse[] }>
        )

        for (const [, { managerName, projects: managerProjects }] of Object.entries(
            projectsByManager
        )) {
            const sheetName = managerName.substring(0, 31)
            sheets.push(buildSheetData(sheetName, managerProjects))
        }
    } else {
        sheets.push(buildSheetData("Mandats", projects))
    }

    return buildXlsx(sheets)
}
