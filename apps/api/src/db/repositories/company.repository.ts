import { eq, sql, like, and } from "drizzle-orm"
import { db } from "../index"
import { companies, projects } from "../schema"
import type { CompanyFilter, CompanyCreateInput, CompanyUpdateInput } from "@beg/validations"
import { rebuildSearchForRelatedProjects } from "../fts"

export const companyRepository = {
    findAll: async (filter: CompanyFilter) => {
        const { page = 1, limit = 10, name, sortBy = "name", sortOrder = "asc" } = filter
        const offset = (page - 1) * limit

        // Build conditions
        const conditions = []
        if (name) {
            conditions.push(like(companies.name, `%${name}%`))
        }

        // Query with pagination and filters
        const query = db
            .select({
                id: companies.id,
                name: companies.name,
                createdAt: companies.createdAt,
                updatedAt: companies.updatedAt,
            })
            .from(companies)

        if (conditions.length > 0) {
            query.where(and(...conditions))
        }

        // Apply sorting
        if (sortBy === "name") {
            query.orderBy(sortOrder === "desc" ? sql`${companies.name} DESC` : companies.name)
        } else if (sortBy === "createdAt") {
            query.orderBy(
                sortOrder === "desc" ? sql`${companies.createdAt} DESC` : companies.createdAt
            )
        }

        const data = await query.limit(limit).offset(offset)

        // Count total with same conditions
        const countQuery = db.select({ count: sql<number>`count(*)` }).from(companies)
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
                id: companies.id,
                name: companies.name,
                createdAt: companies.createdAt,
                updatedAt: companies.updatedAt,
            })
            .from(companies)
            .where(eq(companies.id, id))
        return results[0] || null
    },

    create: async (data: CompanyCreateInput) => {
        const result = await db
            .insert(companies)
            .values({
                name: data.name,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning({
                id: companies.id,
                name: companies.name,
                createdAt: companies.createdAt,
                updatedAt: companies.updatedAt,
            })
        return result[0]
    },

    update: async (id: number, data: CompanyUpdateInput) => {
        const result = await db
            .update(companies)
            .set({
                name: data.name,
                updatedAt: new Date(),
            })
            .where(eq(companies.id, id))
            .returning({
                id: companies.id,
                name: companies.name,
                createdAt: companies.createdAt,
                updatedAt: companies.updatedAt,
            })

        if (result[0]) {
            await rebuildSearchForRelatedProjects("company", id)
        }

        return result[0] || null
    },

    delete: async (id: number) => {
        await db.delete(companies).where(eq(companies.id, id))
    },

    hasProjects: async (id: number) => {
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(projects)
            .where(eq(projects.companyId, id))
        return result.count > 0
    },
}
