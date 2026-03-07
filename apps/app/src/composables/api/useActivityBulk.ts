import { z } from "zod"
import { usePatch } from "./useAPI"
import type { ActivityBulkUpdateResponse } from "@beg/validations"

// Schema for bulk update request
const activityBulkUpdateSchema = z.object({
    ids: z.array(z.number()),
    updates: z.object({
        billed: z.boolean().optional(),
        disbursement: z.boolean().optional(),
    }),
})

export function useBulkUpdateActivities() {
    return usePatch<
        ActivityBulkUpdateResponse,
        {
            body: typeof activityBulkUpdateSchema
        }
    >("activity/bulk", {
        body: activityBulkUpdateSchema,
    })
}
