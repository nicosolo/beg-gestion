import { db } from "../index"
import { workloads, users } from "../schema"
import { eq, and, gte, lte, desc } from "drizzle-orm"
import { ApiException } from "@src/tools/error-handler"

export const workloadRepository = {
    async findAll(filters?: { userId?: number; year?: number; month?: number }) {
        let query = db
            .select({
                id: workloads.id,
                userId: workloads.userId,
                year: workloads.year,
                month: workloads.month,
                workload: workloads.workload,
                createdAt: workloads.createdAt,
                updatedAt: workloads.updatedAt,
                user: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    initials: users.initials,
                },
            })
            .from(workloads)
            .leftJoin(users, eq(workloads.userId, users.id))
            .$dynamic()

        const conditions = []
        if (filters?.userId) {
            conditions.push(eq(workloads.userId, filters.userId))
        }
        if (filters?.year) {
            conditions.push(eq(workloads.year, filters.year))
        }
        if (filters?.month) {
            conditions.push(eq(workloads.month, filters.month))
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions))
        }

        return query.orderBy(desc(workloads.year), desc(workloads.month), workloads.userId)
    },

    async findById(id: number) {
        const result = await db
            .select({
                id: workloads.id,
                userId: workloads.userId,
                year: workloads.year,
                month: workloads.month,
                workload: workloads.workload,
                createdAt: workloads.createdAt,
                updatedAt: workloads.updatedAt,
                user: {
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    initials: users.initials,
                },
            })
            .from(workloads)
            .leftJoin(users, eq(workloads.userId, users.id))
            .where(eq(workloads.id, id))
            .limit(1)

        return result[0] || null
    },

    async findByUserYearMonth(userId: number, year: number, month: number) {
        const result = await db
            .select()
            .from(workloads)
            .where(
                and(
                    eq(workloads.userId, userId),
                    eq(workloads.year, year),
                    eq(workloads.month, month)
                )
            )
            .limit(1)

        return result[0] || null
    },

    async findByUserYearRange(userId: number, startYear: number, endYear: number) {
        return db
            .select()
            .from(workloads)
            .where(
                and(
                    eq(workloads.userId, userId),
                    gte(workloads.year, startYear),
                    lte(workloads.year, endYear)
                )
            )
            .orderBy(desc(workloads.year), desc(workloads.month))
    },

    async create(data: { userId: number; year: number; month: number; workload: number }) {
        // Check if workload already exists for this user/year/month
        const existing = await this.findByUserYearMonth(data.userId, data.year, data.month)
        if (existing) {
            throw new ApiException(
                400,
                "ALREADY_EXISTS",
                `Workload already exists for user ${data.userId} in ${data.month}/${data.year}`
            )
        }

        const result = await db
            .insert(workloads)
            .values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning()

        return result[0]
    },

    async update(
        id: number,
        data: {
            userId?: number
            year?: number
            month?: number
            workload?: number
        }
    ) {
        // If updating user/year/month, check for conflicts
        if (data.userId !== undefined || data.year !== undefined || data.month !== undefined) {
            const current = await this.findById(id)
            if (!current) {
                throw new ApiException(404, "NOT_FOUND", "Workload not found")
            }

            const userId = data.userId ?? current.userId
            const year = data.year ?? current.year
            const month = data.month ?? current.month

            const existing = await this.findByUserYearMonth(userId, year, month)
            if (existing && existing.id !== id) {
                throw new ApiException(
                    400,
                    "ALREADY_EXISTS",
                    `Workload already exists for user ${userId} in ${month}/${year}`
                )
            }
        }

        const result = await db
            .update(workloads)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(workloads.id, id))
            .returning()

        return result[0] || null
    },

    async delete(id: number) {
        const result = await db.delete(workloads).where(eq(workloads.id, id)).returning()
        return result[0] || null
    },

    async bulkCreate(
        data: Array<{
            userId: number
            year: number
            month: number
            workload: number
        }>
    ) {
        if (data.length === 0) return []

        const values = data.map((item) => ({
            ...item,
            createdAt: new Date(),
            updatedAt: new Date(),
        }))

        return db.insert(workloads).values(values).returning()
    },

    async deleteByUser(userId: number) {
        return db.delete(workloads).where(eq(workloads.userId, userId)).returning()
    },
}
