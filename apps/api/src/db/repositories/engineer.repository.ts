import { eq, sql, like, and } from "drizzle-orm"
import { db } from "../index"
import { engineers, projects } from "../schema"
import type { EngineerFilter, EngineerCreateInput, EngineerUpdateInput } from "@beg/validations"
import { rebuildSearchForRelatedProjects } from "../fts"

export const engineerRepository = {
    findAll: async (filter: EngineerFilter) => {
        const { page = 1, limit = 10, name, sortBy = "name", sortOrder = "asc" } = filter
        const offset = (page - 1) * limit

        // Build conditions
        const conditions = []
        if (name) {
            conditions.push(like(engineers.name, `%${name}%`))
        }

        // Query with pagination and filters
        const query = db
            .select({
                id: engineers.id,
                name: engineers.name,
                createdAt: engineers.createdAt,
                updatedAt: engineers.updatedAt,
            })
            .from(engineers)

        if (conditions.length > 0) {
            query.where(and(...conditions))
        }

        // Apply sorting
        if (sortBy === "name") {
            query.orderBy(sortOrder === "desc" ? sql`${engineers.name} DESC` : engineers.name)
        } else if (sortBy === "createdAt") {
            query.orderBy(
                sortOrder === "desc" ? sql`${engineers.createdAt} DESC` : engineers.createdAt
            )
        }

        const data = await query.limit(limit).offset(offset)

        // Count total with same conditions
        const countQuery = db.select({ count: sql<number>`count(*)` }).from(engineers)
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
                id: engineers.id,
                name: engineers.name,
                createdAt: engineers.createdAt,
                updatedAt: engineers.updatedAt,
            })
            .from(engineers)
            .where(eq(engineers.id, id))
        return results[0] || null
    },

    create: async (data: EngineerCreateInput) => {
        const result = await db
            .insert(engineers)
            .values({
                name: data.name,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning({
                id: engineers.id,
                name: engineers.name,
                createdAt: engineers.createdAt,
                updatedAt: engineers.updatedAt,
            })
        return result[0]
    },

    update: async (id: number, data: EngineerUpdateInput) => {
        const result = await db
            .update(engineers)
            .set({
                name: data.name,
                updatedAt: new Date(),
            })
            .where(eq(engineers.id, id))
            .returning({
                id: engineers.id,
                name: engineers.name,
                createdAt: engineers.createdAt,
                updatedAt: engineers.updatedAt,
            })

        if (result[0]) {
            await rebuildSearchForRelatedProjects("engineer", id)
        }

        return result[0] || null
    },

    delete: async (id: number) => {
        await db.delete(engineers).where(eq(engineers.id, id))
    },

    hasProjects: async (id: number) => {
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(projects)
            .where(eq(projects.engineerId, id))
        return result.count > 0
    },
}
