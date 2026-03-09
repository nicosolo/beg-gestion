import { db } from "@src/db"
import { auditLogs } from "@src/db/schema"
import { desc, eq, and, gte, lte, type SQL } from "drizzle-orm"
import type { AuditLogFilter } from "@beg/validations"

export const auditLogRepository = {
    async findAll(filter: AuditLogFilter) {
        const page = filter.page ?? 1
        const limit = filter.limit ?? 20
        const offset = (page - 1) * limit

        const conditions: SQL[] = []

        if (filter.entity) {
            conditions.push(eq(auditLogs.entity, filter.entity))
        }
        if (filter.action) {
            conditions.push(eq(auditLogs.action, filter.action))
        }
        if (filter.userId) {
            conditions.push(eq(auditLogs.userId, filter.userId))
        }
        if (filter.fromDate) {
            conditions.push(gte(auditLogs.createdAt, new Date(filter.fromDate)))
        }
        if (filter.toDate) {
            conditions.push(lte(auditLogs.createdAt, new Date(filter.toDate)))
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined

        const [data, countResult] = await Promise.all([
            db
                .select()
                .from(auditLogs)
                .where(where)
                .orderBy(desc(auditLogs.createdAt))
                .limit(limit)
                .offset(offset),
            db
                .select({ id: auditLogs.id })
                .from(auditLogs)
                .where(where),
        ])

        const total = countResult.length

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    },
}
