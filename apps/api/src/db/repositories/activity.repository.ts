import { and, eq, sql, desc, asc, gte, lte, or } from "drizzle-orm"
import { db } from "../index"
import { activities, activityTypes, projects, users } from "../schema"
import type { ActivityFilter } from "@beg/validations"
import type { Variables } from "@src/types/global"
import { hasRole } from "@src/tools/role-middleware"

// Helper function to update project dates and duration
export async function updateProjectActivityDates(projectId: number) {
    // Get the earliest and latest activity dates, and sum of durations for this project
    const result = await db
        .select({
            firstDate: sql<number>`MIN(${activities.date})`,
            lastDate: sql<number>`MAX(${activities.date})`,
            totalDuration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`,
        })
        .from(activities)
        .where(eq(activities.projectId, projectId))

    const { firstDate, lastDate, totalDuration } = result[0]
    const resultUnbilled = await db
        .select({
            unbilledDuration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`,
        })
        .from(activities)
        .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
        .where(and(eq(activities.billed, false), eq(activities.projectId, projectId)))

    const { unbilledDuration } = resultUnbilled[0]

    const resultUnbilledDisbursement = await db
        .select({
            unbilledDisbursementDuration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`,
        })
        .from(activities)
        .where(and(eq(activities.disbursement, true), eq(activities.projectId, projectId)))

    const { unbilledDisbursementDuration } = resultUnbilledDisbursement[0]
    // Update the project with the calculated values
    await db
        .update(projects)
        .set({
            firstActivityDate: firstDate ? new Date(firstDate * 1000) : null,
            lastActivityDate: lastDate ? new Date(lastDate * 1000) : null,
            totalDuration: totalDuration || 0,
            unBilledDuration: unbilledDuration || 0,
            unBilledDisbursementDuration: unbilledDisbursementDuration || 0,
            updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
}

const selectFields = (user: Variables["user"]) => ({
    id: activities.id,
    date: activities.date,
    duration: activities.duration,
    kilometers: activities.kilometers,
    expenses: activities.expenses,
    rate: activities.rate,
    rateClass: activities.rateClass,
    description: activities.description,
    billed: activities.billed,
    ...(hasRole(user.role, "admin") ? { disbursement: activities.disbursement } : {}),
    createdAt: activities.createdAt,
    updatedAt: activities.updatedAt,
    invoiceId: activities.invoiceId,
    userProjectRole: sql<
        string | null
    >`(SELECT role FROM project_users WHERE projectId = ${projects.id} AND userId = ${user.id} LIMIT 1)`,
    user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        initials: users.initials,
    },
    project: {
        id: projects.id,
        name: projects.name,
        projectNumber: projects.projectNumber,
    },
    activityType: {
        id: activityTypes.id,
        name: activityTypes.name,
        code: activityTypes.code,
        billable: activityTypes.billable,
        adminOnly: activityTypes.adminOnly,
    },
})

const createBaseQuery = (user: Variables["user"]) => {
    const baseQuery = db
        .select(selectFields(user))
        .from(activities)
        .leftJoin(users, eq(activities.userId, users.id))
        .leftJoin(projects, eq(activities.projectId, projects.id))
        .leftJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    return baseQuery
}

const accessControlCondition = (user: Variables["user"]) => {
    if (hasRole(user.role, "admin")) return undefined
    return sql`(EXISTS (SELECT 1 FROM project_users WHERE projectId = ${activities.projectId} AND userId = ${user.id}) OR ${activities.userId} = ${user.id})`
}

const buildFilterComponents = (filter: ActivityFilter, user?: Variables["user"]) => {
    const {
        userId,
        projectId,
        fromDate,
        toDate,
        sortBy = "date",
        sortOrder = "asc",
        includeBilled = false,
        includeUnbilled = false,
        includeDisbursed = false,
        includeNotDisbursed = false,
        activityTypeId,
        invoiceId,
    } = filter

    const whereConditions: any[] = []
    if (userId) whereConditions.push(eq(activities.userId, userId))
    if (projectId) whereConditions.push(eq(activities.projectId, projectId))
    if (fromDate) whereConditions.push(gte(activities.date, fromDate))
    if (toDate) whereConditions.push(lte(activities.date, toDate))
    if (activityTypeId) whereConditions.push(eq(activities.activityTypeId, activityTypeId))
    // Non-admin users cannot see activities with adminOnly activity types

    const billingConditions = []
    if (includeBilled) billingConditions.push(eq(activities.billed, true))
    if (includeUnbilled) billingConditions.push(eq(activities.billed, false))

    // Disbursement filters - only for activities with expenses > 0
    if (includeDisbursed)
        billingConditions.push(
            and(eq(activities.disbursement, true), sql`${activities.expenses} > 0`)
        )
    if (includeNotDisbursed)
        billingConditions.push(
            and(eq(activities.disbursement, false), sql`${activities.expenses} > 0`)
        )
    if (user && !hasRole(user.role, "admin")) {
        whereConditions.push(eq(activityTypes.adminOnly, false))
    }

    if (billingConditions.length > 0) {
        whereConditions.push(or(...billingConditions))
    }

    if (invoiceId) {
        whereConditions.splice(0, whereConditions.length, eq(activities.invoiceId, invoiceId))
    }

    const sortColumn = (() => {
        switch (sortBy) {
            case "date":
                return activities.date
            case "duration":
                return activities.duration
            case "kilometers":
                return activities.kilometers
            case "expenses":
                return activities.expenses
            case "rate":
                return activities.rate
            case "projectId":
                return projects.projectNumber
            case "userId":
                return users.initials
            default:
                return activities.date
        }
    })()

    const sortDirection = sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn)
    const secondarySort = sortOrder === "desc" ? desc(activities.id) : asc(activities.id)

    return {
        whereConditions,
        sortDirection,
        secondarySort,
    }
}

export const activityRepository = {
    findAll: async (user: Variables["user"], filter: ActivityFilter) => {
        const { page = 1, limit = 10 } = filter
        const offset = (page - 1) * limit
        const { whereConditions, sortDirection, secondarySort } = buildFilterComponents(
            filter,
            user
        )

        // Query with conditions
        const baseQuery = createBaseQuery(user)
        const acl = accessControlCondition(user)
        if (acl) whereConditions.push(acl)

        const dataQuery =
            whereConditions.length > 0
                ? baseQuery
                      .where(and(...whereConditions))
                      .orderBy(sortDirection, secondarySort)
                      .limit(limit)
                      .offset(offset)
                : baseQuery.orderBy(sortDirection, secondarySort).limit(limit).offset(offset)

        const data = await dataQuery

        // Count total with same filters and access control
        const countQuery = db
            .select({ count: sql<number>`count(*)` })
            .from(activities)
            .leftJoin(projects, eq(activities.projectId, projects.id))
            .leftJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))

        const [{ count }] = await (whereConditions.length > 0
            ? countQuery.where(and(...whereConditions))
            : countQuery)
        const totalPages = Math.ceil(count / limit)

        // Calculate totals for all filtered activities (without pagination)
        const totalsQuery = db
            .select({
                totalDuration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`,
                totalKilometers: sql<number>`COALESCE(SUM(${activities.kilometers}), 0)`,
                totalExpenses: sql<number>`COALESCE(SUM(${activities.expenses}), 0)`,
            })
            .from(activities)
            .leftJoin(projects, eq(activities.projectId, projects.id))
            .leftJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))

        const [totalsResult] = await (whereConditions.length > 0
            ? totalsQuery.where(and(...whereConditions))
            : totalsQuery)

        const totals = {
            duration: Number(totalsResult.totalDuration),
            kilometers: Number(totalsResult.totalKilometers),
            expenses: Number(totalsResult.totalExpenses),
        }

        return {
            data,
            total: count,
            page,
            limit,
            totalPages,
            totals,
        }
    },

    findAllForExport: async (user: Variables["user"], filter: ActivityFilter) => {
        const { whereConditions, sortDirection, secondarySort } = buildFilterComponents(
            filter,
            user
        )
        const baseQuery = createBaseQuery(user)
        const acl = accessControlCondition(user)
        if (acl) whereConditions.push(acl)

        const dataQuery =
            whereConditions.length > 0
                ? baseQuery.where(and(...whereConditions)).orderBy(sortDirection, secondarySort)
                : baseQuery.orderBy(sortDirection, secondarySort)

        return await dataQuery
    },

    findById: async (id: number, user: Variables["user"]) => {
        const query = db
            .select({
                id: activities.id,
                date: activities.date,
                duration: activities.duration,
                kilometers: activities.kilometers,
                expenses: activities.expenses,
                rate: activities.rate,
                rateClass: activities.rateClass,
                description: activities.description,
                billed: activities.billed,
                ...(hasRole(user.role, "admin") ? { disbursement: activities.disbursement } : {}),
                createdAt: activities.createdAt,
                updatedAt: activities.updatedAt,
                invoiceId: activities.invoiceId,
                userProjectRole: sql<
                    string | null
                >`(SELECT role FROM project_users WHERE projectId = ${projects.id} AND userId = ${user.id} LIMIT 1)`,
                user: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    initials: users.initials,
                },
                project: {
                    id: projects.id,
                    name: projects.name,
                    projectNumber: projects.projectNumber,
                },
                activityType: {
                    id: activityTypes.id,
                    name: activityTypes.name,
                    code: activityTypes.code,
                    billable: activityTypes.billable,
                    adminOnly: activityTypes.adminOnly,
                },
            })
            .from(activities)
            .leftJoin(users, eq(activities.userId, users.id))
            .leftJoin(projects, eq(activities.projectId, projects.id))
            .leftJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))

        // Build where conditions
        const whereConditions = [eq(activities.id, id)]
        // Non-admin users cannot see activities with adminOnly activity types
        if (!hasRole(user.role, "admin")) {
            whereConditions.push(eq(activityTypes.adminOnly, false))
        }

        const result = await query.where(and(...whereConditions))

        return result[0] || null
    },

    create: async (data: typeof activities.$inferInsert) => {
        const [newActivity] = await db.insert(activities).values(data).returning()

        // Update project dates after creating activity
        await updateProjectActivityDates(data.projectId)

        // Return the created activity with relations
        // Note: For create, we assume the user has access since they're creating it
        // The access check will be enforced when reading
        return activityRepository.findById(newActivity.id, {
            id: 0,
            role: "admin",
        } as Variables["user"])
    },

    update: async (id: number, data: Partial<typeof activities.$inferInsert>) => {
        // Get the old project ID before updating
        const [oldActivity] = await db
            .select({ projectId: activities.projectId })
            .from(activities)
            .where(eq(activities.id, id))

        if (!oldActivity) {
            return null
        }

        const [updatedActivity] = await db
            .update(activities)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(activities.id, id))
            .returning()

        if (updatedActivity) {
            // Update project dates after updating activity
            await updateProjectActivityDates(updatedActivity.projectId)

            // If the project was changed, update the old project too
            if (data.projectId && data.projectId !== oldActivity.projectId) {
                await updateProjectActivityDates(oldActivity.projectId)
            }
        }

        // For update, use admin access to bypass filtering since we already checked access
        return activityRepository.findById(id, { id: 0, role: "admin" } as Variables["user"])
    },

    delete: async (id: number) => {
        // Get the activity to know which project to update
        const [activityToDelete] = await db
            .select({ projectId: activities.projectId })
            .from(activities)
            .where(eq(activities.id, id))

        if (!activityToDelete) {
            return false
        }

        // Delete the activity
        await db.delete(activities).where(eq(activities.id, id))

        // Update project dates after deleting activity
        await updateProjectActivityDates(activityToDelete.projectId)

        return true
    },

    bulkUpdate: async (ids: number[], updates: { billed?: boolean; disbursement?: boolean }) => {
        if (ids.length === 0) {
            return 0
        }

        // Perform the bulk update
        await db
            .update(activities)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(
                sql`${activities.id} IN (${sql.join(
                    ids.map((id) => sql`${id}`),
                    sql`, `
                )})`
            )

        // Get all affected project IDs
        const affectedProjects = await db
            .select({ projectId: activities.projectId })
            .from(activities)
            .where(
                sql`${activities.id} IN (${sql.join(
                    ids.map((id) => sql`${id}`),
                    sql`, `
                )})`
            )
            .groupBy(activities.projectId)

        // Update project dates for all affected projects
        for (const project of affectedProjects) {
            await updateProjectActivityDates(project.projectId)
        }

        return ids.length
    },

    // Find activities where the creator is not a member of the project
    // Only returns activities for projects where the requesting user is a manager
    findOrphanedActivities: async (user: Variables["user"]) => {
        return await db
            .selectDistinct({
                project: {
                    id: projects.id,
                    projectNumber: projects.projectNumber,
                    name: projects.name,
                },
                user: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    initials: users.initials,
                },
            })
            .from(activities)
            .innerJoin(projects, eq(activities.projectId, projects.id))
            .innerJoin(users, eq(activities.userId, users.id))
            .where(
                and(
                    // Activity creator is not a project member
                    sql`NOT EXISTS (
                        SELECT 1 FROM project_users
                        WHERE project_users.projectId = ${activities.projectId}
                        AND project_users.userId = ${activities.userId}
                    )`,
                    // Current user is a manager of the project
                    sql`EXISTS (
                        SELECT 1 FROM project_users
                        WHERE project_users.projectId = ${activities.projectId}
                        AND project_users.userId = ${user.id}
                        AND project_users.role = 'manager'
                    )`
                )
            )
            .orderBy(projects.projectNumber)
    },

    // Get monthly hours stats for a user
    getMonthlyStats: async (userId: number, year: number) => {
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31, 23, 59, 59)

        const result = await db
            .select({
                month: sql<number>`CAST(strftime('%m', datetime(${activities.date}, 'unixepoch')) AS INTEGER)`,
                duration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`,
            })
            .from(activities)
            .where(
                and(
                    eq(activities.userId, userId),
                    gte(activities.date, startDate),
                    lte(activities.date, endDate)
                )
            )
            .groupBy(sql`strftime('%m', datetime(${activities.date}, 'unixepoch'))`)
            .orderBy(sql`strftime('%m', datetime(${activities.date}, 'unixepoch'))`)

        // Fill in missing months with 0
        const months = Array.from({ length: 12 }, (_, i) => {
            const found = result.find((r) => r.month === i + 1)
            return { month: i + 1, duration: found?.duration ?? 0 }
        })

        const totalDuration = months.reduce((sum, m) => sum + m.duration, 0)

        return { year, months, totalDuration }
    },
}
