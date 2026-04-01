import { eq, sql, ne, and, asc } from "drizzle-orm"
import { db } from "../index"
import { activityTypes, activities } from "../schema"
import type {
    ActivityTypeResponse,
    ActivityTypeCreateInput,
    ActivityTypeUpdateInput,
} from "@beg/validations"

interface FindAllOptions {
    excludeArchived?: boolean // Exclude activity types with code "x"
}

export const activityTypeRepository = {
    findAll: async (options: FindAllOptions = {}): Promise<ActivityTypeResponse[]> => {
        const { excludeArchived = false } = options

        const conditions = []
        if (excludeArchived) {
            conditions.push(ne(activityTypes.code, "x"))
        }

        return await db
            .select({
                id: activityTypes.id,
                name: activityTypes.name,
                code: activityTypes.code,
                billable: activityTypes.billable,
                adminOnly: activityTypes.adminOnly,
                classPresets: activityTypes.classPresets,
                defaultDuration: activityTypes.defaultDuration,
                createdAt: activityTypes.createdAt,
                updatedAt: activityTypes.updatedAt,
            })
            .from(activityTypes)
            .orderBy(asc(activityTypes.code), asc(activityTypes.name))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(activityTypes.name))
    },

    findById: async (id: number) => {
        const results = await db
            .select({
                id: activityTypes.id,
                name: activityTypes.name,
                code: activityTypes.code,
                billable: activityTypes.billable,
                adminOnly: activityTypes.adminOnly,
                classPresets: activityTypes.classPresets,
                defaultDuration: activityTypes.defaultDuration,
                createdAt: activityTypes.createdAt,
                updatedAt: activityTypes.updatedAt,
            })
            .from(activityTypes)
            .where(eq(activityTypes.id, id))
        return results[0] || null
    },

    findByCode: async (code: string) => {
        const results = await db
            .select({
                id: activityTypes.id,
                name: activityTypes.name,
                code: activityTypes.code,
                billable: activityTypes.billable,
                adminOnly: activityTypes.adminOnly,
                classPresets: activityTypes.classPresets,
                defaultDuration: activityTypes.defaultDuration,
                createdAt: activityTypes.createdAt,
                updatedAt: activityTypes.updatedAt,
            })
            .from(activityTypes)
            .where(eq(activityTypes.code, code))
        return results[0] || null
    },

    create: async (activityTypeData: ActivityTypeCreateInput): Promise<ActivityTypeResponse> => {
        const [newActivityType] = await db
            .insert(activityTypes)
            .values({
                name: activityTypeData.name,
                code: activityTypeData.code,
                billable: activityTypeData.billable,
                adminOnly: activityTypeData.adminOnly ?? false,
                classPresets: activityTypeData.classPresets ?? null,
                defaultDuration: activityTypeData.defaultDuration ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning({
                id: activityTypes.id,
                name: activityTypes.name,
                code: activityTypes.code,
                billable: activityTypes.billable,
                adminOnly: activityTypes.adminOnly,
                classPresets: activityTypes.classPresets,
                defaultDuration: activityTypes.defaultDuration,
                createdAt: activityTypes.createdAt,
                updatedAt: activityTypes.updatedAt,
            })

        return newActivityType
    },

    update: async (
        id: number,
        activityTypeData: Partial<ActivityTypeUpdateInput>
    ): Promise<ActivityTypeResponse> => {
        const updateData: Partial<typeof activityTypes.$inferInsert> = {}

        if (activityTypeData.name) updateData.name = activityTypeData.name
        if (activityTypeData.code) updateData.code = activityTypeData.code
        if (activityTypeData.billable !== undefined) updateData.billable = activityTypeData.billable
        if (activityTypeData.adminOnly !== undefined)
            updateData.adminOnly = activityTypeData.adminOnly
        if (activityTypeData.classPresets !== undefined)
            updateData.classPresets = activityTypeData.classPresets ?? null
        if (activityTypeData.defaultDuration !== undefined)
            updateData.defaultDuration = activityTypeData.defaultDuration ?? null
        updateData.updatedAt = new Date()
        const [updatedActivityType] = await db
            .update(activityTypes)
            .set(updateData)
            .where(eq(activityTypes.id, id))
            .returning({
                id: activityTypes.id,
                name: activityTypes.name,
                code: activityTypes.code,
                billable: activityTypes.billable,
                adminOnly: activityTypes.adminOnly,
                classPresets: activityTypes.classPresets,
                defaultDuration: activityTypes.defaultDuration,
                createdAt: activityTypes.createdAt,
                updatedAt: activityTypes.updatedAt,
            })

        return updatedActivityType
    },

    delete: async (id: number): Promise<void> => {
        await db.delete(activityTypes).where(eq(activityTypes.id, id))
    },

    hasActivities: async (id: number): Promise<boolean> => {
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(activities)
            .where(eq(activities.activityTypeId, id))
        return result.count > 0
    },
}
