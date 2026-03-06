import { z } from "zod"
import { timestampsSchema, classPresetsSchema } from "./base"

// Activity type creation schema
export const activityTypeCreateSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    billable: z.coerce.boolean(),
    adminOnly: z.coerce.boolean().optional().default(false),
    classPresets: classPresetsSchema.optional().nullable(),
    defaultDuration: z.coerce.number().positive().optional().nullable(),
})

// Activity type update schema (makes most fields optional)
export const activityTypeUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    billable: z.coerce.boolean().optional(),
    adminOnly: z.coerce.boolean().optional(),
    classPresets: classPresetsSchema.optional().nullable(),
    defaultDuration: z.coerce.number().positive().optional().nullable(),
})

// Activity type response schema
export const activityTypeResponseSchema = z
    .object({
        id: z.coerce.number(),
        name: z.string(),
        code: z.string(),
        billable: z.boolean(),
        adminOnly: z.boolean(),
        classPresets: classPresetsSchema.nullable(),
        defaultDuration: z.coerce.number().nullable(),
    })
    .merge(timestampsSchema)

// Array response for getting all activity types
export const activityTypesArrayResponseSchema = z.array(activityTypeResponseSchema)

export type ActivityTypeCreateInput = z.infer<typeof activityTypeCreateSchema>
export type ActivityTypeUpdateInput = z.infer<typeof activityTypeUpdateSchema>
export type ActivityTypeResponse = z.infer<typeof activityTypeResponseSchema>
