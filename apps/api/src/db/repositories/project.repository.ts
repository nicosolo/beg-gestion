import {
    eq,
    sql,
    like,
    and,
    or,
    gte,
    lte,
    asc,
    desc,
    inArray,
    lt,
    gt,
    ne,
    type SQL,
} from "drizzle-orm"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"
import { db } from "../index"
import {
    projects,
    clients,
    companies,
    engineers,
    locations,
    projectTypes,
    projectProjectTypes,
    users,
    projectUsers,
} from "../schema"
import {
    type ProjectFilter,
    type ProjectListResponse,
    type ProjectResponse,
    type ProjectCreateInput,
    type ProjectUpdateInput,
    ErrorCode,
} from "@beg/validations"

export const projectRepository = {
    // Check if a user is a manager of a specific project
    isProjectManager: async (projectId: number, userId: number): Promise<boolean> => {
        const result = await db
            .select({ userId: projectUsers.userId })
            .from(projectUsers)
            .where(
                and(
                    eq(projectUsers.projectId, projectId),
                    eq(projectUsers.userId, userId),
                    eq(projectUsers.role, "manager")
                )
            )
            .execute()

        return result.length > 0
    },

    findAll: async (filters?: ProjectFilter): Promise<ProjectListResponse> => {
        const {
            page = 1,
            limit = 10,
            text,
            includeArchived = false,
            referentUserId,
            projectTypeIds,
            fromDate,
            toDate,
            sortBy = "name",
            sortOrder = "asc",
            hasUnbilledTime = undefined,
            status,
        } = filters || {}
        const offset = (page - 1) * limit

        // Build where conditions
        const whereConditions = []

        // Status filter
        if (status) {
            whereConditions.push(eq(projects.status, status))
        } else {
            // By default exclude "offer" projects
            whereConditions.push(ne(projects.status, "offer"))
        }

        // Name filter (case-insensitive search)
        // Split search terms: numbers match projectNumber, text matches name
        if (text && text.trim()) {
            const terms = text.trim().split(/\s+/)
            const numberTerms = terms.filter((t) => /^\d+$/.test(t))
            const textTerms = terms.filter((t) => !/^\d+$/.test(t))

            const conditions = []

            // Match number terms against projectNumber
            if (numberTerms.length > 0) {
                const numberPattern = numberTerms.join("%")
                conditions.push(like(projects.projectNumber, `${numberPattern}%`))
            }

            // Match text terms against name and related entities (accent-insensitive)
            if (textTerms.length > 0) {
                const textPattern = `%${textTerms.join("%")}%`
                conditions.push(
                    or(
                        sql`${projects.name} LIKE ${textPattern}`,
                        sql`${projects.subProjectName} LIKE ${textPattern}`,
                        sql`${clients.name} LIKE ${textPattern}`,
                        sql`${locations.name} LIKE ${textPattern}`,
                        sql`${locations.region} LIKE ${textPattern}`,
                        sql`${locations.address} LIKE ${textPattern}`,
                        sql`${engineers.name} LIKE ${textPattern}`,
                        sql`${companies.name} LIKE ${textPattern}`,
                        sql`EXISTS (SELECT 1 FROM ${projectUsers} pu JOIN ${users} u ON pu.userId = u.id WHERE pu.projectId = ${projects.id} AND (${sql`u.firstName`} LIKE ${textPattern} OR ${sql`u.lastName`} LIKE ${textPattern} OR ${sql`u.initials`} LIKE ${textPattern}))`,
                        sql`EXISTS (SELECT 1 FROM ${projectProjectTypes} ppt JOIN ${projectTypes} pt ON ppt.projectTypeId = pt.id WHERE ppt.projectId = ${projects.id} AND ${sql`pt.name`} LIKE ${textPattern})`
                    )
                )
            }

            // If only numbers or only text, also try matching full string against both
            if (numberTerms.length === 0 || textTerms.length === 0) {
                const fullPattern = `%${terms.join("%")}%`
                whereConditions.push(
                    or(
                        sql`${projects.name} LIKE ${fullPattern}`,
                        like(projects.projectNumber, `${terms.join("%")}%`),
                        sql`${projects.subProjectName} LIKE ${fullPattern}`,
                        sql`${clients.name} LIKE ${fullPattern}`,
                        sql`${locations.name} LIKE ${fullPattern}`,
                        sql`${locations.region} LIKE ${fullPattern}`,
                        sql`${locations.address} LIKE ${fullPattern}`,
                        sql`${engineers.name} LIKE ${fullPattern}`,
                        sql`${companies.name} LIKE ${fullPattern}`,
                        sql`EXISTS (SELECT 1 FROM ${projectUsers} pu JOIN ${users} u ON pu.userId = u.id WHERE pu.projectId = ${projects.id} AND (${sql`u.firstName`} LIKE ${fullPattern} OR ${sql`u.lastName`} LIKE ${fullPattern} OR ${sql`u.initials`} LIKE ${fullPattern}))`,
                        sql`EXISTS (SELECT 1 FROM ${projectProjectTypes} ppt JOIN ${projectTypes} pt ON ppt.projectTypeId = pt.id WHERE ppt.projectId = ${projects.id} AND ${sql`pt.name`} LIKE ${fullPattern})`,
                        ...(conditions.length > 0 ? [and(...conditions)] : [])
                    )
                )
            } else {
                // Both number and text terms - require both to match their respective fields
                whereConditions.push(and(...conditions))
            }
        }

        // Date filters - filter by project start date
        if (fromDate) {
            whereConditions.push(gte(projects.startDate, fromDate))
        }
        if (toDate) {
            whereConditions.push(lte(projects.startDate, toDate))
        }

        // Ended filter
        if (!includeArchived) {
            whereConditions.push(eq(projects.archived, false))
        }

        if (hasUnbilledTime === true) {
            whereConditions.push(gt(projects.unBilledDuration, 0))
        }

        // Project type filter - filter projects that have at least one of the specified types
        if (projectTypeIds && projectTypeIds.length > 0) {
            whereConditions.push(
                sql`(SELECT COUNT(DISTINCT ppt.projectTypeId) FROM ${projectProjectTypes} ppt
                    WHERE ppt.projectId = ${projects.id}
                    AND ppt.projectTypeId IN (${sql.join(
                        projectTypeIds.map((id) => sql`${id}`),
                        sql`, `
                    )})) = ${projectTypeIds.length}`
            )
        }

        // Note: archived filter is not implemented as projects table doesn't have archived field
        // This appears to be a legacy filter from the old system

        // Apply sorting
        const sortColumn = (() => {
            switch (sortBy) {
                case "projectNumber":
                    return projects.projectNumber
                case "name":
                    return projects.name
                case "totalDuration":
                    // For unbilled duration, we'll sort by project name as fallback
                    // since calculating unbilled duration requires complex aggregation
                    return projects.totalDuration
                case "unBilledDuration":
                    // For unbilled duration, we'll sort by project name as fallback
                    // since calculating unbilled duration requires complex aggregation
                    return projects.unBilledDuration
                case "firstActivityDate":
                    // Sort by project start date as approximation for first activity
                    return projects.firstActivityDate
                case "lastActivityDate":
                    // Sort by project updated date as approximation for last activity
                    return projects.lastActivityDate
                case "createdAt":
                    return projects.createdAt
                default:
                    return projects.name
            }
        })()

        // Create custom sort order to prioritize projectNumber matches when searching by name
        const sortExpressions = []

        // If searching by name, add priority sort for exact projectNumber matches
        if (text && text.trim()) {
            const terms = text.trim().split(/\s+/)
            const numberTerms = terms.filter((t) => /^\d+$/.test(t))

            // Prioritize exact projectNumber match for number terms
            if (numberTerms.length > 0) {
                const exactNumber = numberTerms[0] // First number for exact match
                sortExpressions.push(
                    sql`CASE
                            WHEN ${projects.projectNumber} = ${exactNumber} THEN 0
                            WHEN ${projects.projectNumber} LIKE ${exactNumber + "%"} THEN 1
                            ELSE 2
                        END`
                )
            } else {
                // No number terms - use original logic for text-only search
                const searchTokens = terms.join("%")
                const namePattern = `%${searchTokens}%`
                sortExpressions.push(
                    sql`CASE
                            WHEN ${projects.subProjectName} LIKE ${namePattern} THEN 0
                            WHEN ${projects.projectNumber} LIKE ${terms.join("%") + "%"} THEN 1
                            WHEN ${projects.name} LIKE ${namePattern} THEN 2
                            WHEN ${clients.name} LIKE ${namePattern} OR ${locations.name} LIKE ${namePattern} OR ${locations.region} LIKE ${namePattern} OR ${engineers.name} LIKE ${namePattern} OR ${companies.name} LIKE ${namePattern} THEN 3
                            ELSE 4
                        END`
                )
            }
        }

        // Add the main sort column
        const sortDirection = sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn)
        sortExpressions.push(sortDirection)

        // Build the main query with a subquery to filter by project manager if needed
        let baseQuery = db
            .select({
                id: projects.id,
                projectNumber: projects.projectNumber,
                subProjectName: projects.subProjectName,
                name: projects.name,
                startDate: projects.startDate,
                remark: projects.remark,
                invoicingAddress: projects.invoicingAddress,
                latitude: projects.latitude,
                longitude: projects.longitude,
                status: projects.status,
                archived: projects.archived,
                createdAt: projects.createdAt,
                updatedAt: projects.updatedAt,
                firstActivityDate: projects.firstActivityDate,
                lastActivityDate: projects.lastActivityDate,
                totalDuration: projects.totalDuration,
                unBilledDuration: projects.unBilledDuration,
                unBilledDisbursementDuration: projects.unBilledDisbursementDuration,
                offerAmount: projects.offerAmount,
                ended: projects.ended,
                location: {
                    id: locations.id,
                    name: locations.name,
                    country: locations.country,
                    canton: locations.canton,
                    region: locations.region,
                    address: locations.address,
                },
                client: {
                    id: clients.id,
                    name: clients.name,
                },
                engineer: {
                    id: engineers.id,
                    name: engineers.name,
                },
                company: {
                    id: companies.id,
                    name: companies.name,
                },
            })
            .from(projects)
            .leftJoin(locations, eq(projects.locationId, locations.id))
            .leftJoin(clients, eq(projects.clientId, clients.id))
            .leftJoin(engineers, eq(projects.engineerId, engineers.id))
            .leftJoin(companies, eq(projects.companyId, companies.id))

        // Add project manager filter (access control removed: all users can see all projects)
        const hasManagerFilter = referentUserId !== undefined && referentUserId

        if (hasManagerFilter) {
            // Filter by manager: show projects managed by referentUserId
            baseQuery = baseQuery.innerJoin(
                projectUsers,
                and(
                    eq(projectUsers.projectId, projects.id),
                    eq(projectUsers.userId, referentUserId),
                    eq(projectUsers.role, "manager")
                )
            )
        }

        // Execute query with conditional where clause
        const rawData =
            whereConditions.length > 0
                ? await baseQuery
                      .where(and(...whereConditions))
                      .orderBy(...sortExpressions)
                      .limit(limit)
                      .offset(offset)
                      .execute()
                : await baseQuery
                      .orderBy(...sortExpressions)
                      .limit(limit)
                      .offset(offset)
                      .execute()

        // Get all unique project IDs
        const projectIds = rawData.map((p) => p.id)

        // Fetch all project users (managers and members) for these projects in one query
        const allProjectUsers =
            projectIds.length > 0
                ? await db
                      .select({
                          projectId: projectUsers.projectId,
                          id: users.id,
                          firstName: users.firstName,
                          lastName: users.lastName,
                          initials: users.initials,
                          role: projectUsers.role,
                      })
                      .from(projectUsers)
                      .innerJoin(users, eq(projectUsers.userId, users.id))
                      .where(inArray(projectUsers.projectId, projectIds))
                      .execute()
                : []

        const { managersMap, membersMap } = allProjectUsers.reduce(
            (acc, pu) => {
                const userInfo = {
                    id: pu.id,
                    firstName: pu.firstName,
                    lastName: pu.lastName,
                    initials: pu.initials,
                }

                if (pu.role === "manager") {
                    if (!acc.managersMap.has(pu.projectId)) {
                        acc.managersMap.set(pu.projectId, [])
                    }
                    acc.managersMap.get(pu.projectId)!.push(userInfo)
                } else if (pu.role === "member") {
                    if (!acc.membersMap.has(pu.projectId)) {
                        acc.membersMap.set(pu.projectId, [])
                    }
                    acc.membersMap.get(pu.projectId)!.push(userInfo)
                }

                return acc
            },
            {
                managersMap: new Map<number, any[]>(),
                membersMap: new Map<number, any[]>(),
            }
        )

        // Fetch all project types for these projects
        const allProjectTypes =
            projectIds.length > 0
                ? await db
                      .select({
                          projectId: projectProjectTypes.projectId,
                          id: projectTypes.id,
                          name: projectTypes.name,
                      })
                      .from(projectProjectTypes)
                      .innerJoin(
                          projectTypes,
                          eq(projectProjectTypes.projectTypeId, projectTypes.id)
                      )
                      .where(inArray(projectProjectTypes.projectId, projectIds))
                      .execute()
                : []

        // Group types by project
        const typesMap = allProjectTypes.reduce((acc, pt) => {
            if (!acc.has(pt.projectId)) {
                acc.set(pt.projectId, [])
            }
            acc.get(pt.projectId)!.push({ id: pt.id, name: pt.name })
            return acc
        }, new Map<number, { id: number; name: string }[]>())

        // Attach project managers, members and types to each project
        const data = rawData.map((project) => ({
            ...project,
            projectManagers: managersMap.get(project.id) || [],
            projectMembers: membersMap.get(project.id) || [],
            types: typesMap.get(project.id) || [],
        }))

        // Count total with same filters (excluding pagination)
        let countQuery = db
            .select({ count: sql<number>`count(DISTINCT ${projects.id})` })
            .from(projects)
            .leftJoin(locations, eq(projects.locationId, locations.id))
            .leftJoin(clients, eq(projects.clientId, clients.id))
            .leftJoin(engineers, eq(projects.engineerId, engineers.id))
            .leftJoin(companies, eq(projects.companyId, companies.id))
            .$dynamic()

        // Apply same manager filter as main query
        if (hasManagerFilter) {
            countQuery = countQuery.innerJoin(
                projectUsers,
                and(
                    eq(projectUsers.projectId, projects.id),
                    eq(projectUsers.userId, referentUserId),
                    eq(projectUsers.role, "manager")
                )
            )
        }

        const [{ count }] = await (
            whereConditions.length > 0 ? countQuery.where(and(...whereConditions)) : countQuery
        ).execute()

        const totalPages = Math.ceil(count / limit)

        return {
            data,
            total: count,
            page,
            limit,
            totalPages,
        }
    },

    findById: async (id: number): Promise<ProjectResponse | null> => {
        let query = db
            .select({
                id: projects.id,
                projectNumber: projects.projectNumber,
                subProjectName: projects.subProjectName,
                name: projects.name,
                startDate: projects.startDate,
                remark: projects.remark,
                invoicingAddress: projects.invoicingAddress,
                latitude: projects.latitude,
                longitude: projects.longitude,
                status: projects.status,
                archived: projects.archived,
                createdAt: projects.createdAt,
                updatedAt: projects.updatedAt,
                firstActivityDate: projects.firstActivityDate,
                lastActivityDate: projects.lastActivityDate,
                totalDuration: projects.totalDuration,
                unBilledDuration: projects.unBilledDuration,
                unBilledDisbursementDuration: projects.unBilledDisbursementDuration,
                offerAmount: projects.offerAmount,
                ended: projects.ended,
                location: {
                    id: locations.id,
                    name: locations.name,
                    country: locations.country,
                    canton: locations.canton,
                    region: locations.region,
                    address: locations.address,
                },
                client: {
                    id: clients.id,
                    name: clients.name,
                },
                engineer: {
                    id: engineers.id,
                    name: engineers.name,
                },
                company: {
                    id: companies.id,
                    name: companies.name,
                },
            })
            .from(projects)
            .leftJoin(locations, eq(projects.locationId, locations.id))
            .leftJoin(clients, eq(projects.clientId, clients.id))
            .leftJoin(engineers, eq(projects.engineerId, engineers.id))
            .leftJoin(companies, eq(projects.companyId, companies.id))

        // Access control removed: all users can see all projects

        const results = await query.where(eq(projects.id, id)).execute()
        if (!results[0]) return null

        const project = results[0]

        // Fetch project users (managers and members) using junction table
        const projectUsersList = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                initials: users.initials,
                role: projectUsers.role,
            })
            .from(projectUsers)
            .innerJoin(users, eq(projectUsers.userId, users.id))
            .where(eq(projectUsers.projectId, id))
            .execute()

        // Separate managers and members
        const managers = projectUsersList
            .filter((u) => u.role === "manager")
            .map((u) => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                initials: u.initials,
            }))

        const members = projectUsersList
            .filter((u) => u.role === "member")
            .map((u) => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                initials: u.initials,
            }))

        // Fetch project types
        const projectTypesList = await db
            .select({
                id: projectTypes.id,
                name: projectTypes.name,
            })
            .from(projectProjectTypes)
            .innerJoin(projectTypes, eq(projectProjectTypes.projectTypeId, projectTypes.id))
            .where(eq(projectProjectTypes.projectId, id))
            .execute()

        return {
            ...project,
            projectManagers: managers,
            projectMembers: members,
            types: projectTypesList,
        } as ProjectResponse
    },

    create: async (data: ProjectCreateInput): Promise<number | null> => {
        // Handle parent project data copying if parentProjectId is provided
        let parentProjectData = null
        if (data.parentProjectId) {
            const [parent] = await db
                .select()
                .from(projects)
                .where(eq(projects.id, data.parentProjectId))
                .execute()

            if (!parent) {
                throw new Error("Parent project not found")
            }
            parentProjectData = parent
        }

        // Check for duplicate project number + subProjectName combination
        // Skip check for draft projects (projectNumber is null or empty)
        if (data.projectNumber && data.projectNumber.trim() !== "") {
            const whereConditions = [eq(projects.projectNumber, data.projectNumber)]
            if (data.subProjectName) {
                whereConditions.push(eq(projects.subProjectName, data.subProjectName))
            } else {
                // If no subProjectName, check if main project exists
                const existing = await db
                    .select({ id: projects.id })
                    .from(projects)
                    .where(
                        and(
                            eq(projects.projectNumber, data.projectNumber),
                            sql`${projects.subProjectName} IS NULL`
                        )
                    )
                    .execute()

                if (existing.length > 0) {
                    throw new Error("Project number already exists")
                }
            }

            if (data.subProjectName) {
                const existing = await db
                    .select({ id: projects.id })
                    .from(projects)
                    .where(and(...whereConditions))
                    .execute()

                if (existing.length > 0) {
                    throw new Error(
                        "Sub-project with this name already exists for this project number"
                    )
                }
            }
        }

        // Get project managers and members from data or parent project
        let managerUserIds: number[] = []
        let memberUserIds: number[] = []

        if (data.projectManagers && data.projectManagers.length > 0) {
            managerUserIds = data.projectManagers
        } else if (parentProjectData) {
            // Fetch parent project managers
            const parentManagers = await db
                .select({ userId: projectUsers.userId })
                .from(projectUsers)
                .where(
                    and(
                        eq(projectUsers.projectId, parentProjectData.id),
                        eq(projectUsers.role, "manager")
                    )
                )
                .execute()
            managerUserIds = parentManagers.map((pm) => pm.userId)
        }

        if (data.projectMembers && data.projectMembers.length > 0) {
            memberUserIds = data.projectMembers
        } else if (parentProjectData) {
            // Fetch parent project members
            const parentMembers = await db
                .select({ userId: projectUsers.userId })
                .from(projectUsers)
                .where(
                    and(
                        eq(projectUsers.projectId, parentProjectData.id),
                        eq(projectUsers.role, "member")
                    )
                )
                .execute()
            memberUserIds = parentMembers.map((pm) => pm.userId)
        }

        // Insert the new project, using parent data if provided
        const projectData = parentProjectData
            ? {
                  projectNumber: parentProjectData.projectNumber,
                  subProjectName: data.subProjectName || null,
                  name: data.name,
                  startDate: data.startDate || parentProjectData.startDate,
                  locationId: data.locationId || parentProjectData.locationId,
                  clientId: data.clientId || parentProjectData.clientId,
                  engineerId: data.engineerId || parentProjectData.engineerId,
                  companyId: data.companyId || parentProjectData.companyId,
                  remark: data.remark || parentProjectData.remark,
                  status: data.status || parentProjectData.status || "active",
                  ended: data.ended ?? parentProjectData.ended,
                  archived: data.archived ?? parentProjectData.archived,
                  invoicingAddress: data.invoicingAddress || parentProjectData.invoicingAddress,
                  offerAmount:
                      data.offerAmount !== undefined
                          ? data.offerAmount
                          : (parentProjectData.offerAmount ?? null),
                  latitude:
                      data.latitude !== undefined
                          ? data.latitude
                          : (parentProjectData.latitude ?? null),
                  longitude:
                      data.longitude !== undefined
                          ? data.longitude
                          : (parentProjectData.longitude ?? null),
                  createdAt: new Date(),
                  updatedAt: new Date(),
              }
            : {
                  projectNumber: data.projectNumber,
                  subProjectName: data.subProjectName || null,
                  name: data.name,
                  startDate: data.startDate,
                  locationId: data.locationId || null,
                  clientId: data.clientId || null,
                  engineerId: data.engineerId || null,
                  companyId: data.companyId || null,
                  remark: data.remark || null,
                  status: data.status || "active",
                  ended: data.ended || false,
                  archived: data.archived || false,
                  invoicingAddress: data.invoicingAddress || null,
                  offerAmount: data.offerAmount ?? null,
                  latitude: data.latitude ?? null,
                  longitude: data.longitude ?? null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
              }

        const [newProject] = await db
            .insert(projects)
            .values(projectData)
            .returning({ id: projects.id })
            .execute()

        // Insert project users (managers and members) into junction table
        const projectUsersToInsert: Array<{
            projectId: number
            userId: number
            role: "manager" | "member"
            createdAt: Date
            updatedAt: Date
        }> = []

        // Add managers
        if (managerUserIds.length > 0) {
            managerUserIds.forEach((userId) => {
                projectUsersToInsert.push({
                    projectId: newProject.id,
                    userId,
                    role: "manager" as const,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
            })
        }

        // Add members
        if (memberUserIds.length > 0) {
            memberUserIds.forEach((userId) => {
                projectUsersToInsert.push({
                    projectId: newProject.id,
                    userId,
                    role: "member" as const,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
            })
        }

        // Insert all project users at once
        if (projectUsersToInsert.length > 0) {
            await db.insert(projectUsers).values(projectUsersToInsert).execute()
        }

        // Insert project types into junction table
        // Get type IDs from data or parent project
        let typeIds: number[] = data.projectTypeIds || []
        if (typeIds.length === 0 && parentProjectData) {
            const parentTypes = await db
                .select({ projectTypeId: projectProjectTypes.projectTypeId })
                .from(projectProjectTypes)
                .where(eq(projectProjectTypes.projectId, parentProjectData.id))
                .execute()
            typeIds = parentTypes.map((pt) => pt.projectTypeId)
        }

        if (typeIds.length > 0) {
            const projectTypesToInsert = typeIds.map((typeId) => ({
                projectId: newProject.id,
                projectTypeId: typeId,
                createdAt: new Date(),
                updatedAt: new Date(),
            }))
            await db.insert(projectProjectTypes).values(projectTypesToInsert).execute()
        }

        return newProject.id
    },

    update: async (id: number, data: ProjectUpdateInput): Promise<number | null> => {
        // Build update object, filtering out undefined values (excluding projectManagers and projectMembers)
        const updateData: any = {}
        if (data.projectNumber !== undefined) updateData.projectNumber = data.projectNumber
        if (data.subProjectName !== undefined)
            updateData.subProjectName = data.subProjectName || null
        if (data.name !== undefined) updateData.name = data.name
        if (data.startDate !== undefined) updateData.startDate = data.startDate
        if (data.locationId !== undefined) updateData.locationId = data.locationId || null
        if (data.clientId !== undefined) updateData.clientId = data.clientId || null
        if (data.engineerId !== undefined) updateData.engineerId = data.engineerId || null
        if (data.companyId !== undefined) updateData.companyId = data.companyId || null
        if (data.remark !== undefined) updateData.remark = data.remark || null
        if (data.invoicingAddress !== undefined) updateData.invoicingAddress = data.invoicingAddress
        if (data.status !== undefined) updateData.status = data.status
        if (data.ended !== undefined) updateData.ended = data.ended
        if (data.archived !== undefined) updateData.archived = data.archived
        if (data.latitude !== undefined) updateData.latitude = data.latitude
        if (data.longitude !== undefined) updateData.longitude = data.longitude
        if (data.offerAmount !== undefined) updateData.offerAmount = data.offerAmount
        console.log(data, updateData)

        // Update the project
        await db
            .update(projects)
            .set({
                ...updateData,
                updatedAt: new Date(),
            })
            .where(eq(projects.id, id))
            .execute()

        // Update project managers if provided
        if (data.projectManagers !== undefined) {
            // Delete existing project managers
            await db
                .delete(projectUsers)
                .where(and(eq(projectUsers.projectId, id), eq(projectUsers.role, "manager")))
                .execute()

            // Insert new project managers
            if (data.projectManagers.length > 0) {
                const managersToInsert = data.projectManagers.map((userId) => ({
                    projectId: id,
                    userId,
                    role: "manager" as const,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
                await db.insert(projectUsers).values(managersToInsert).execute()
            }
        }

        // Update project members if provided
        if (data.projectMembers !== undefined) {
            // Delete existing project members
            await db
                .delete(projectUsers)
                .where(and(eq(projectUsers.projectId, id), eq(projectUsers.role, "member")))
                .execute()

            // Insert new project members
            if (data.projectMembers.length > 0) {
                const membersToInsert = data.projectMembers.map((userId) => ({
                    projectId: id,
                    userId,
                    role: "member" as const,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
                await db.insert(projectUsers).values(membersToInsert).execute()
            }
        }

        // Update project types if provided
        if (data.projectTypeIds !== undefined) {
            // Delete existing project types
            await db
                .delete(projectProjectTypes)
                .where(eq(projectProjectTypes.projectId, id))
                .execute()

            // Insert new project types
            if (data.projectTypeIds.length > 0) {
                const typesToInsert = data.projectTypeIds.map((typeId) => ({
                    projectId: id,
                    projectTypeId: typeId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
                await db.insert(projectProjectTypes).values(typesToInsert).execute()
            }
        }

        return id
    },

    // Add a user as a member to a project (if not already a member)
    addMember: async (projectId: number, userId: number) => {
        // Check if user is already a member or manager
        const existing = await db
            .select()
            .from(projectUsers)
            .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, userId)))
            .limit(1)

        if (existing.length > 0) {
            // User already has a role in this project
            return false
        }

        // Add as member
        await db.insert(projectUsers).values({
            projectId,
            userId,
            role: "member",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        return true
    },
}
