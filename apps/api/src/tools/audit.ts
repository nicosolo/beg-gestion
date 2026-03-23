import { db } from "@src/db"
import { auditLogs } from "@src/db/schema"

export type AuditAction =
    | "create"
    | "update"
    | "delete"
    | "login_success"
    | "login_failure"
    | "prune"

export type AuditEntity =
    | "auth"
    | "activity"
    | "activityType"
    | "project"
    | "invoice"
    | "client"
    | "company"
    | "engineer"
    | "location"
    | "user"
    | "rate"
    | "projectType"
    | "vatRate"
    | "monthlyHours"
    | "workload"
    | "snapshot"

export function audit(
    userId: number | null,
    userInitials: string,
    action: AuditAction,
    entity: AuditEntity,
    entityId?: number | null,
    meta?: Record<string, unknown>
) {
    try {
        db.insert(auditLogs)
            .values({
                userId,
                userInitials,
                action,
                entity,
                entityId: entityId ?? null,
                meta: meta ?? null,
            })
            .run()
    } catch {
        // fire-and-forget — never throw
    }
}
