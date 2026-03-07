import { eq, sql, like, and, asc, desc } from "drizzle-orm"
import { db } from "../index"
import { locations, projects } from "../schema"
import type { Location, LocationCreate, LocationUpdate, LocationFilter } from "@beg/validations"

export const locationRepository = {
    findAll: async (filter?: LocationFilter) => {
        const {
            page = 1,
            limit = 10,
            name,
            country,
            canton,
            sortBy = "name",
            sortOrder = "asc",
        } = filter || {}
        const offset = (page - 1) * limit

        // Build where conditions
        const whereConditions = []

        // Name filter (case-insensitive search)
        if (name && name.trim()) {
            whereConditions.push(like(locations.name, `%${name}%`))
        }

        // Country filter
        if (country) {
            whereConditions.push(eq(locations.country, country))
        }

        // Canton filter
        if (canton) {
            whereConditions.push(eq(locations.canton, canton))
        }

        // Combine conditions
        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

        // Apply sorting
        const sortColumn = (() => {
            switch (sortBy) {
                case "name":
                    return locations.name
                case "country":
                    return locations.country
                case "canton":
                    return locations.canton
                case "createdAt":
                    return locations.createdAt
                case "updatedAt":
                    return locations.updatedAt
                default:
                    return locations.name
            }
        })()

        const orderBy = sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn)

        // Query with pagination
        const data = await db
            .select({
                id: locations.id,
                name: locations.name,
                country: locations.country,
                canton: locations.canton,
                region: locations.region,
                address: locations.address,
                createdAt: locations.createdAt,
                updatedAt: locations.updatedAt,
            })
            .from(locations)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset)

        // Count total with same filters
        const countQuery = db.select({ count: sql<number>`count(*)` }).from(locations)

        if (whereClause) {
            countQuery.where(whereClause)
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

    findById: async (id: number): Promise<Location | null> => {
        const results = await db
            .select({
                id: locations.id,
                name: locations.name,
                country: locations.country,
                canton: locations.canton,
                region: locations.region,
                address: locations.address,
                createdAt: locations.createdAt,
                updatedAt: locations.updatedAt,
            })
            .from(locations)
            .where(eq(locations.id, id))
        return results[0] || null
    },

    create: async (data: LocationCreate): Promise<Location> => {
        const [newLocation] = await db
            .insert(locations)
            .values({
                name: data.name,
                country: data.country,
                canton: data.canton || null,
                region: data.region || null,
                address: data.address || null,
                updatedAt: new Date(),
                createdAt: new Date(),
            })
            .returning({
                id: locations.id,
                name: locations.name,
                country: locations.country,
                canton: locations.canton,
                region: locations.region,
                address: locations.address,
                createdAt: locations.createdAt,
                updatedAt: locations.updatedAt,
            })

        return newLocation
    },

    update: async (id: number, data: LocationUpdate): Promise<Location | null> => {
        const updateData: Partial<typeof locations.$inferInsert> = {}

        if (data.name !== undefined) updateData.name = data.name
        if (data.country !== undefined) updateData.country = data.country
        if (data.canton !== undefined) updateData.canton = data.canton || null
        if (data.region !== undefined) updateData.region = data.region || null
        if (data.address !== undefined) updateData.address = data.address || null

        const result = await db
            .update(locations)
            .set(updateData)
            .where(eq(locations.id, id))
            .returning({
                id: locations.id,
                name: locations.name,
                country: locations.country,
                canton: locations.canton,
                region: locations.region,
                address: locations.address,
                createdAt: locations.createdAt,
                updatedAt: locations.updatedAt,
            })

        return result[0] || null
    },

    delete: async (id: number): Promise<boolean> => {
        const result = await db
            .delete(locations)
            .where(eq(locations.id, id))
            .returning({ id: locations.id })

        return result.length > 0
    },

    hasProjects: async (id: number): Promise<boolean> => {
        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(projects)
            .where(eq(projects.locationId, id))
        return result.count > 0
    },
}
