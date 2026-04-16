import { z } from "zod"
import { timestampsSchema, classPresetsSchema, classSchema, collaboratorTypeSchema } from "./base"

// Activity type creation schema
export const activityTypeCreateSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    billable: z.coerce.boolean(),
    adminOnly: z.coerce.boolean().optional().default(false),
    classPresets: classPresetsSchema.optional().nullable(),
    defaultDuration: z.coerce.number().positive().optional().nullable(),
    applyClasses: z.coerce.boolean().optional().default(false),
})

// Activity type update schema (makes most fields optional)
export const activityTypeUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    billable: z.coerce.boolean().optional(),
    adminOnly: z.coerce.boolean().optional(),
    classPresets: classPresetsSchema.optional().nullable(),
    defaultDuration: z.coerce.number().positive().optional().nullable(),
    applyClasses: z.coerce.boolean().optional().default(false),
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

// Class preset preview schemas
export const classPresetPreviewRequestSchema = z.object({
    activityId: z.number().optional(),
    classPresets: classPresetsSchema,
})

export const classPresetPreviewItemSchema = z.object({
    userId: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    initials: z.string(),
    collaboratorType: collaboratorTypeSchema.nullable(),
    currentClass: classSchema.nullable(),
    newClass: classSchema.nullable(),
    action: z.enum(["add", "update", "remove", "unchanged"]),
})

export const classPresetPreviewResponseSchema = z.object({
    changes: z.array(classPresetPreviewItemSchema),
})

export type ClassPresetPreviewRequest = z.infer<typeof classPresetPreviewRequestSchema>
export type ClassPresetPreviewItem = z.infer<typeof classPresetPreviewItemSchema>
export type ClassPresetPreviewResponse = z.infer<typeof classPresetPreviewResponseSchema>
