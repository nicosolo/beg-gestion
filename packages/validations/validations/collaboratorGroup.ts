import { z } from "zod"
import { paginationSchema } from "./pagination"
import { timestampsSchema } from "./base"

// Base collaborator group schema
export const collaboratorGroupSchema = z
    .object({
        id: z.number(),
        name: z.string(),
    })
    .merge(timestampsSchema)

// Create schema
export const collaboratorGroupCreateSchema = z.object({
    name: z.string().min(1, "Name is required"),
})

// Update schema
export const collaboratorGroupUpdateSchema = collaboratorGroupCreateSchema.partial()

// Filter schema
export const collaboratorGroupFilterSchema = z
    .object({
        name: z.string().optional(),
        sortBy: z.enum(["name", "createdAt"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
    })
    .merge(paginationSchema)

export const collaboratorGroupResponseSchema = collaboratorGroupSchema

export type CollaboratorGroup = z.infer<typeof collaboratorGroupSchema>
export type CollaboratorGroupCreateInput = z.infer<typeof collaboratorGroupCreateSchema>
export type CollaboratorGroupUpdateInput = z.infer<typeof collaboratorGroupUpdateSchema>
export type CollaboratorGroupResponse = z.infer<typeof collaboratorGroupResponseSchema>
export type CollaboratorGroupFilter = z.infer<typeof collaboratorGroupFilterSchema>
export type CollaboratorGroupFilterInput = z.input<typeof collaboratorGroupFilterSchema>
