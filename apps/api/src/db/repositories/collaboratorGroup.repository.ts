import { eq, sql, like, and } from "drizzle-orm"
import { db } from "../index"
import { collaboratorGroups, users } from "../schema"
import type {
    CollaboratorGroupFilter,
    CollaboratorGroupCreateInput,
    CollaboratorGroupUpdateInput,
} from "@beg/validations"

export const collaboratorGroupRepository = {
    findAll: async (filter: CollaboratorGroupFilter) => {
        const { page = 1, limit = 100, name, sortBy = "name", sortOrder = "asc" } = filter
        const offset = (page - 1) * limit

        const conditions = []
        if (name) {
            conditions.push(like(collaboratorGroups.name, `%${name}%`))
        }

        const query = db
            .select({
                id: collaboratorGroups.id,
                name: collaboratorGroups.name,
                createdAt: collaboratorGroups.createdAt,
                updatedAt: collaboratorGroups.updatedAt,
            })
            .from(collaboratorGroups)

        if (conditions.length > 0) {
            query.where(and(...conditions))
        }

        if (sortBy === "name") {
            query.orderBy(
                sortOrder === "desc" ? sql`${collaboratorGroups.name} DESC` : collaboratorGroups.name
            )
        } else if (sortBy === "createdAt") {
            query.orderBy(
                sortOrder === "desc"
                    ? sql`${collaboratorGroups.createdAt} DESC`
                    : collaboratorGroups.createdAt
            )
        }

        const data = await query.limit(limit).offset(offset)

        const countQuery = db.select({ count: sql<number>`count(*)` }).from(collaboratorGroups)
        if (conditions.length > 0) {
            countQuery.where(and(...conditions))
        }
        const [{ count }] = await countQuery

        const totalPages = Math.ceil(count / limit)

        return {
            data,
            total: count,
            page,
            limit,
            totalPages,
        }
    },

    findById: async (id: number) => {
        const results = await db
            .select({
                id: collaboratorGroups.id,
                name: collaboratorGroups.name,
                createdAt: collaboratorGroups.createdAt,
                updatedAt: collaboratorGroups.updatedAt,
            })
            .from(collaboratorGroups)
            .where(eq(collaboratorGroups.id, id))
        return results[0] || null
    },

    create: async (data: CollaboratorGroupCreateInput) => {
        const result = await db
            .insert(collaboratorGroups)
            .values({
                name: data.name,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning({
                id: collaboratorGroups.id,
                name: collaboratorGroups.name,
                createdAt: collaboratorGroups.createdAt,
                updatedAt: collaboratorGroups.updatedAt,
            })
        return result[0]
    },

    update: async (id: number, data: CollaboratorGroupUpdateInput) => {
        const result = await db
            .update(collaboratorGroups)
            .set({
                name: data.name,
                updatedAt: new Date(),
            })
            .where(eq(collaboratorGroups.id, id))
            .returning({
                id: collaboratorGroups.id,
                name: collaboratorGroups.name,
                createdAt: collaboratorGroups.createdAt,
                updatedAt: collaboratorGroups.updatedAt,
            })

        return result[0] || null
    },

    delete: async (id: number) => {
        await db.delete(collaboratorGroups).where(eq(collaboratorGroups.id, id))
    },

    hasUsers: async (id: number) => {
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.groupId, id))
        return result.count > 0
    },
}
