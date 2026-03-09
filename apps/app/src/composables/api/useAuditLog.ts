import { auditLogFilterSchema, type AuditLogListResponse } from "@beg/validations"
import { useGet } from "./useAPI"

export function useFetchAuditLogs() {
    return useGet<
        AuditLogListResponse,
        {
            query: typeof auditLogFilterSchema
        }
    >("audit-log", {
        query: auditLogFilterSchema,
    })
}
