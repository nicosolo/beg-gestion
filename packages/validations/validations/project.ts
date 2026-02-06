import { z } from "zod"
import { paginationSchema, createPageResponseSchema } from "./pagination"
import { booleanSchema, dateSchema, nullableTimestampsSchema, timestampsSchema } from "./base"

export const projectStatusEnum = ["offer", "draft", "active"] as const
export type ProjectStatus = (typeof projectStatusEnum)[number]

// Base project filter schema without pagination
const projectBaseFilterSchema = z.object({
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
            // Handle both string (single value or comma-separated) and array
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
    sortBy: z
        .enum([
            "name",
            "unBilledDuration",
            "firstActivityDate",
            "lastActivityDate",
            "totalDuration",
            "projectNumber",
            "createdAt",
        ])
        .optional()
        .default("name"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
    hasUnbilledTime: booleanSchema.optional().default(false),
    includeArchived: booleanSchema.optional().default(false),
    status: z.enum(projectStatusEnum).optional(),
})

// Project filter schema for listing (includes pagination)
export const projectFilterSchema = projectBaseFilterSchema.merge(paginationSchema)

export type ProjectFilter = z.infer<typeof projectFilterSchema>
export type ProjectFilterInput = z.input<typeof projectFilterSchema>

// Project export filter schema (extends base filter with export-specific options)
export const projectExportFilterSchema = projectBaseFilterSchema.extend({
    perUser: booleanSchema.default(false).optional(),
})

export type ProjectExportFilter = z.infer<typeof projectExportFilterSchema>
export type ProjectExportFilterInput = z.input<typeof projectExportFilterSchema>

// Project response schema with nested objects
export const projectResponseSchema = z
    .object({
        id: z.number(),
        projectNumber: z.string().nullable(),
        subProjectName: z.string().nullable(),
        name: z.string(),
        startDate: dateSchema,
        remark: z.string().nullable(),
        invoicingAddress: z.string().nullable(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        location: z
            .object({
                id: z.number(),
                name: z.string(),
                country: z.string().nullable(),
                canton: z.string().nullable(),
                region: z.string().nullable(),
                address: z.string().nullable(),
            })
            .nullable(),
        client: z
            .object({
                id: z.number(),
                name: z.string(),
            })
            .nullable(),
        engineer: z
            .object({
                id: z.number(),
                name: z.string(),
            })
            .nullable(),
        company: z
            .object({
                id: z.number(),
                name: z.string(),
            })
            .nullable(),
        types: z.array(
            z.object({
                id: z.number(),
                name: z.string(),
            })
        ),
        projectManagers: z.array(
            z.object({
                id: z.number(),
                firstName: z.string(),
                lastName: z.string(),
                initials: z.string(),
            })
        ),
        projectMembers: z
            .array(
                z.object({
                    id: z.number(),
                    firstName: z.string(),
                    lastName: z.string(),
                    initials: z.string(),
                })
            )
            .optional(),
        totalDuration: z.number().nullable(),
        unBilledDuration: z.number().nullable(),
        unBilledDisbursementDuration: z.number().nullable(),
        offerAmount: z.number().nullable(),
        firstActivityDate: z.coerce.date().nullable(),
        lastActivityDate: z.coerce.date().nullable(),
        ended: z.boolean().nullable(),
        archived: z.boolean().nullable(),
        status: z.enum(projectStatusEnum),
    })
    .merge(nullableTimestampsSchema)

export type ProjectResponse = z.infer<typeof projectResponseSchema>

export const projectListResponse = createPageResponseSchema(projectResponseSchema)

export type ProjectListResponse = z.infer<typeof projectListResponse>

// Project create schema
export const projectCreateSchema = z.object({
    projectNumber: z.string().min(1).optional().nullable(),
    subProjectName: z.string().optional(),
    parentProjectId: z.number().positive().optional().nullable(),
    name: z.string().min(1),
    startDate: dateSchema,
    projectTypeIds: z.array(z.number().positive()).min(1),
    locationId: z.number().positive().optional().nullable(),
    clientId: z.number().positive().optional().nullable(),
    engineerId: z.number().positive().optional().nullable(),
    companyId: z.number().positive().optional().nullable(),
    projectManagers: z.array(z.number().positive()).optional().default([]),
    projectMembers: z.array(z.number().positive()).optional().default([]),
    remark: z.string().optional(),
    invoicingAddress: z.string().optional(),
    offerAmount: z.number().optional().nullable(),
    status: z.enum(projectStatusEnum).optional().default("active"),
    ended: z.boolean().optional().default(false),
    archived: z.boolean().optional().default(false),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
})

// Project update schema - all fields optional
export const projectUpdateSchema = projectCreateSchema.partial()

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>

export const projectTypeCreateSchema = z.object({
    name: z.string().min(1),
})
// Project Type schema
export const projectTypeSchema = z
    .object({
        id: z.number(),
        name: z.string(),
    })
    .merge(timestampsSchema)

// Project Type update schema
export const projectTypeUpdateSchema = z.object({
    name: z.string().min(1).optional(),
})

// Array response for getting all project types
export const projectTypesArraySchema = z.array(projectTypeSchema)

export type ProjectTypeSchema = z.infer<typeof projectTypeSchema>
export type ProjectTypeCreateInput = z.infer<typeof projectTypeCreateSchema>
export type ProjectTypeUpdateInput = z.infer<typeof projectTypeUpdateSchema>
