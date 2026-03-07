import { eq, sql, like, and } from "drizzle-orm"
import { db } from "../index"
import { clients, invoices, projects } from "../schema"
import type { ClientFilter, ClientCreateInput, ClientUpdateInput } from "@beg/validations"

export const clientRepository = {
    findAll: async (filter: ClientFilter) => {
        const { page = 1, limit = 10, name, sortBy = "name", sortOrder = "asc" } = filter
        const offset = (page - 1) * limit

        // Build conditions
        const conditions = []
        if (name) {
            conditions.push(like(clients.name, `%${name}%`))
        }

        // Query with pagination and filters
        const query = db
            .select({
                id: clients.id,
                name: clients.name,
                createdAt: clients.createdAt,
                updatedAt: clients.updatedAt,
            })
            .from(clients)

        if (conditions.length > 0) {
            query.where(and(...conditions))
        }

        // Apply sorting
        if (sortBy === "name") {
            query.orderBy(sortOrder === "desc" ? sql`${clients.name} DESC` : clients.name)
        } else if (sortBy === "createdAt") {
            query.orderBy(sortOrder === "desc" ? sql`${clients.createdAt} DESC` : clients.createdAt)
        }

        const data = await query.limit(limit).offset(offset)

        // Count total with same conditions
        const countQuery = db.select({ count: sql<number>`count(*)` }).from(clients)
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
                id: clients.id,
                name: clients.name,
                createdAt: clients.createdAt,
                updatedAt: clients.updatedAt,
            })
            .from(clients)
            .where(eq(clients.id, id))
        return results[0] || null
    },

    create: async (data: ClientCreateInput) => {
        const result = await db
            .insert(clients)
            .values({
                name: data.name,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning({
                id: clients.id,
                name: clients.name,
                createdAt: clients.createdAt,
                updatedAt: clients.updatedAt,
            })
        return result[0]
    },

    update: async (id: number, data: ClientUpdateInput) => {
        const result = await db
            .update(clients)
            .set({
                name: data.name,
                updatedAt: new Date(),
            })
            .where(eq(clients.id, id))
            .returning({
                id: clients.id,
                name: clients.name,
                createdAt: clients.createdAt,
                updatedAt: clients.updatedAt,
            })
        return result[0] || null
    },

    delete: async (id: number) => {
        await db.delete(clients).where(eq(clients.id, id))
    },

    hasInvoices: async (id: number) => {
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(invoices)
            .innerJoin(projects, eq(invoices.projectId, projects.id))
            .where(eq(projects.clientId, id))
        return result.count > 0
    },

    hasProjects: async (id: number) => {
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(projects)
            .where(eq(projects.clientId, id))
        return result.count > 0
    },
}
