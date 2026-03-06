import { z } from "zod"

// Base schemas for entities
export const dateSchema = z.coerce.date()
export const nullableDateSchema = z.any()
export const booleanSchema = z.union([
    z.boolean(),
    z.string().transform((val) => val === "true"),
    z.literal("").transform(() => false),
])
export type DateSchema = z.infer<typeof dateSchema>
export type NullableDateSchema = z.infer<typeof nullableDateSchema>
// ID parameter schema
export const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export type IdParamSchema = z.infer<typeof idParamSchema>

// Class type
export const classSchema = z.enum(["A", "B", "C", "D", "E", "F", "G", "R", "Z"])

// Collaborator type
export const collaboratorTypeSchema = z.enum([
    "cadre",
    "chefDeProjet",
    "collaborateur",
    "operateur",
    "secretaire",
    "stagiaire",
])

export type CollaboratorType = z.infer<typeof collaboratorTypeSchema>

// Class presets: maps each collaborator type to a rate class
export const classPresetsSchema = z.object({
    cadre: classSchema,
    chefDeProjet: classSchema,
    collaborateur: classSchema,
    operateur: classSchema,
    secretaire: classSchema,
    stagiaire: classSchema,
})

export type ClassPresets = z.infer<typeof classPresetsSchema>

export type ClassSchema = z.infer<typeof classSchema>

export const successSchema = z.object({
    success: z.boolean(),
})

export type SuccessResponse = z.infer<typeof successSchema>

export const messageSchema = z.object({
    message: z.string(),
})

export type MessageResponse = z.infer<typeof messageSchema>

// Timestamps schema for entities
export const timestampsSchema = z.object({
    createdAt: dateSchema,
    updatedAt: dateSchema,
})
// Timestamps schema for entities
export const nullableTimestampsSchema = z.object({
    createdAt: nullableDateSchema,
    updatedAt: nullableDateSchema,
})

export type TimestampsSchema = z.infer<typeof timestampsSchema>
