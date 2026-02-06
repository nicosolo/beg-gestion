import { z } from "zod"
import { booleanSchema, dateSchema } from "./base"

// Filter schema for project map (includes all project filters plus map bounds)
export const projectMapFilterSchema = z.object({
    name: z.string().optional(),
    referentUserId: z.coerce.number().optional(),
    projectTypeIds: z
        .union([
            z.coerce.string(),
            z.coerce.number(),
            z.array(z.union([z.coerce.string(), z.coerce.number()])),
        ])
        .optional()
        .transform((val) => {
            if (!val) return undefined
            if (Array.isArray(val)) {
                return val.map(Number).filter((n) => n > 0)
            }
            return val
                .toString()
                .split(",")
                .map(Number)
                .filter((n) => n > 0)
        }),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    hasUnbilledTime: booleanSchema.optional().default(false),
    includeArchived: booleanSchema.optional().default(false),
    includeDraft: booleanSchema.optional().default(false),
    // Bounds filtering for viewport
    minLat: z.coerce.number().optional(),
    maxLat: z.coerce.number().optional(),
    minLng: z.coerce.number().optional(),
    maxLng: z.coerce.number().optional(),
    // Limit results (default 1000)
    limit: z.coerce.number().optional(),
})

export type ProjectMapFilter = z.infer<typeof projectMapFilterSchema>
export type ProjectMapFilterInput = z.input<typeof projectMapFilterSchema>

// Lightweight project map item schema for map markers
export const projectMapItemResponseSchema = z.object({
    id: z.number(),
    projectNumber: z.string(),
    subProjectName: z.string().nullable(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    clientName: z.string().nullable(),
    locationName: z.string().nullable(),
    lastActivityDate: dateSchema.nullable(),
    ended: z.boolean().optional(),
    types: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
})

// Array response for map endpoint
export const projectMapArrayResponseSchema = z.array(projectMapItemResponseSchema)

// TypeScript types
export type ProjectMapItemResponse = z.infer<typeof projectMapItemResponseSchema>
export type ProjectMapArrayResponse = z.infer<typeof projectMapArrayResponseSchema>
