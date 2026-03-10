import { sqlite, db } from "./index"
import {
    projects,
    clients,
    locations,
    engineers,
    companies,
    projectProjectTypes,
    projectTypes,
    projectUsers,
    users,
    activities,
    invoices,
} from "./schema"
import { eq } from "drizzle-orm"

const FTS_CREATE_SQL = `CREATE VIRTUAL TABLE IF NOT EXISTS project_search USING fts5(
  project_id UNINDEXED,
  project_name,
  sub_project_name,
  project_number,
  remark,
  client_name,
  location_text,
  engineer_name,
  company_name,
  project_types,
  manager_names,
  manager_initials,
  member_names,
  member_initials,
  activity_descriptions,
  invoice_text,
  tokenize='unicode61 remove_diacritics 2'
)`

export function createFtsTable() {
    // Drop and recreate if schema changed (FTS5 tables can't be altered)
    const row = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='project_search'").get() as { sql: string } | null
    if (row && !row.sql.includes("manager_initials")) {
        sqlite.exec("DROP TABLE project_search")
    }
    sqlite.exec(FTS_CREATE_SQL)
}

async function getProjectFtsData(projectId: number) {
    const [project] = await db
        .select({
            id: projects.id,
            name: projects.name,
            subProjectName: projects.subProjectName,
            projectNumber: projects.projectNumber,
            remark: projects.remark,
            clientName: clients.name,
            locationName: locations.name,
            locationRegion: locations.region,
            locationAddress: locations.address,
            engineerName: engineers.name,
            companyName: companies.name,
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .leftJoin(locations, eq(projects.locationId, locations.id))
        .leftJoin(engineers, eq(projects.engineerId, engineers.id))
        .leftJoin(companies, eq(projects.companyId, companies.id))
        .where(eq(projects.id, projectId))

    if (!project) return null

    const types = await db
        .select({ name: projectTypes.name })
        .from(projectProjectTypes)
        .innerJoin(projectTypes, eq(projectProjectTypes.projectTypeId, projectTypes.id))
        .where(eq(projectProjectTypes.projectId, projectId))

    const puList = await db
        .select({
            firstName: users.firstName,
            lastName: users.lastName,
            initials: users.initials,
            role: projectUsers.role,
        })
        .from(projectUsers)
        .innerJoin(users, eq(projectUsers.userId, users.id))
        .where(eq(projectUsers.projectId, projectId))

    const activityDescs = await db
        .select({ description: activities.description })
        .from(activities)
        .where(eq(activities.projectId, projectId))

    const invoiceData = await db
        .select({
            invoiceNumber: invoices.invoiceNumber,
            reference: invoices.reference,
            description: invoices.description,
            note: invoices.note,
            otherServices: invoices.otherServices,
        })
        .from(invoices)
        .where(eq(invoices.projectId, projectId))

    const locationText = [project.locationName, project.locationRegion, project.locationAddress]
        .filter(Boolean)
        .join(" ")

    const typesText = types.map((t) => t.name).join(" ")

    const managers = puList.filter((u) => u.role === "manager")
    const members = puList.filter((u) => u.role === "member")

    const managerNames = managers.map((u) => `${u.firstName} ${u.lastName}`).join(" ")
    const managerInitials = managers.map((u) => u.initials).join(" ")
    const memberNames = members.map((u) => `${u.firstName} ${u.lastName}`).join(" ")
    const memberInitials = members.map((u) => u.initials).join(" ")

    const activityText = activityDescs
        .map((a) => a.description)
        .filter(Boolean)
        .join(" ")
        .substring(0, 10000)

    const invoiceText = invoiceData
        .map((i) =>
            [i.invoiceNumber, i.reference, i.description, i.note, i.otherServices]
                .filter(Boolean)
                .join(" ")
        )
        .join(" ")

    return {
        projectId: project.id,
        projectName: project.name || "",
        subProjectName: project.subProjectName || "",
        projectNumber: project.projectNumber || "",
        remark: project.remark || "",
        clientName: project.clientName || "",
        locationText,
        engineerName: project.engineerName || "",
        companyName: project.companyName || "",
        projectTypes: typesText,
        managerNames,
        managerInitials,
        memberNames,
        memberInitials,
        activityDescriptions: activityText,
        invoiceText,
    }
}

export async function rebuildProjectSearchIndex(projectId: number) {
    const data = await getProjectFtsData(projectId)
    if (!data) return

    sqlite.prepare("DELETE FROM project_search WHERE project_id = ?").run(projectId)
    sqlite
        .prepare(
            `INSERT INTO project_search (project_id, project_name, sub_project_name, project_number, remark, client_name, location_text, engineer_name, company_name, project_types, manager_names, manager_initials, member_names, member_initials, activity_descriptions, invoice_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
            data.projectId,
            data.projectName,
            data.subProjectName,
            data.projectNumber,
            data.remark,
            data.clientName,
            data.locationText,
            data.engineerName,
            data.companyName,
            data.projectTypes,
            data.managerNames,
            data.managerInitials,
            data.memberNames,
            data.memberInitials,
            data.activityDescriptions,
            data.invoiceText
        )
}

export async function deleteProjectSearchIndex(projectId: number) {
    sqlite.prepare("DELETE FROM project_search WHERE project_id = ?").run(projectId)
}

export async function rebuildAllProjectSearchIndex() {
    const allProjects = await db.select({ id: projects.id }).from(projects)

    sqlite.exec("DELETE FROM project_search")

    for (const project of allProjects) {
        await rebuildProjectSearchIndex(project.id)
    }

    console.log(`Rebuilt FTS index for ${allProjects.length} projects`)
}

export async function rebuildSearchForRelatedProjects(
    entityType: "client" | "location" | "engineer" | "company",
    entityId: number
) {
    const column = {
        client: projects.clientId,
        location: projects.locationId,
        engineer: projects.engineerId,
        company: projects.companyId,
    }[entityType]

    const relatedProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(column, entityId))

    for (const project of relatedProjects) {
        await rebuildProjectSearchIndex(project.id)
    }
}
