import { z } from "zod"
import { createPageResponseSchema, paginationSchema } from "./pagination"

export const auditLogResponseSchema = z.object({
    id: z.number(),
    userId: z.number().nullable(),
    userEmail: z.string(),
    action: z.string(),
    entity: z.string(),
    entityId: z.number().nullable(),
    meta: z.record(z.unknown()).nullable(),
    createdAt: z.date(),
})

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>

export const auditLogFilterSchema = paginationSchema.extend({
    entity: z.string().optional(),
    action: z.string().optional(),
    userId: z.coerce.number().int().positive().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
})

export type AuditLogFilter = z.infer<typeof auditLogFilterSchema>

export const auditLogListResponseSchema = createPageResponseSchema(auditLogResponseSchema)

export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>
