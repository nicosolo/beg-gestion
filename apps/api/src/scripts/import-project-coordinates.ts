import { convertLv95ToWgs84 } from "@src/utils/coordinates"
import { db } from "../db"
import { projects } from "../db/schema"
import { and, eq } from "drizzle-orm"

interface CsvRow {
    projectNumber: string
    subProjectName: string | null
    easting: number | null
    northing: number | null
    commune?: string
    info?: string
}

function parseCsv(input: string): CsvRow[] {
    const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

    if (lines.length <= 1) {
        return []
    }

    const [, ...dataLines] = lines

    return dataLines.map((line) => {
        const columns = line.split(",")

        const projectNumber = columns[0]?.trim() ?? ""
        const subProjectName = columns[1]?.trim() || null
        const easting = columns[2] ? Number(columns[2]) : null
        const northing = columns[3] ? Number(columns[3]) : null

        return {
            projectNumber,
            subProjectName,
            easting: Number.isFinite(easting) ? easting : null,
            northing: Number.isFinite(northing) ? northing : null,
            commune: columns[4]?.trim(),
            info: columns[5]?.trim(),
        }
    })
}

async function updateProjectCoordinates(row: CsvRow) {
    if (!row.projectNumber) {
        console.warn("Skipping row without project number", row)
        return
    }

    const easting = row.easting
    const northing = row.northing
    let latitude = null
    let longitude = null

    if (latitude === null && longitude === null && easting !== null && northing !== null) {
        const converted = convertLv95ToWgs84(easting!, northing!)
        if (converted && converted.latitude !== null && converted.longitude !== null) {
            latitude = converted.latitude
            longitude = converted.longitude
        }
    }

    if (latitude === null || latitude === null) {
        console.warn(
            `Skipping project ${row.projectNumber}${row.subProjectName ? `/${row.subProjectName}` : ""} (missing coordinates)`
        )
        return
    }

    const matchConditions = [eq(projects.projectNumber, row.projectNumber)]

    const projectList = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(...matchConditions))
        .execute()

    if (projectList.length === 0) {
        console.warn(
            `Project not found: ${row.projectNumber}${row.subProjectName ? `/${row.subProjectName}` : ""}`
        )
        return
    }

    for (const project of projectList) {
        await db
            .update(projects)
            .set({
                latitude: latitude,
                longitude: longitude,
            })
            .where(eq(projects.id, project.id))
            .execute()

        console.log(
            `Updated project ${row.projectNumber}${row.subProjectName ? `/${row.subProjectName}` : ""} with lat=${latitude}, lng=${longitude}`
        )
    }
}

export async function importProjectCoordinatesFromCsv(csvInput: string) {
    const rows = parseCsv(csvInput)

    for (const row of rows) {
        await updateProjectCoordinates(row)
    }
}

async function main() {
    const stdin = await new Response(Bun.stdin.stream()).text()

    await importProjectCoordinatesFromCsv(stdin)
}

if (import.meta.main) {
    main()
        .then(() => {
            console.log("Coordinate import completed")
            process.exit(0)
        })
        .catch((error) => {
            console.error("Failed to import coordinates", error)
            process.exit(1)
        })
}
