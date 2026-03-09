import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    projectTypeSchema,
    projectTypeCreateSchema,
    projectTypeUpdateSchema,
    projectTypesArraySchema,
    idParamSchema,
    messageSchema,
    ErrorCode,
    type ProjectTypeSchema,
} from "@beg/validations"
import { projectTypeRepository } from "../db/repositories/projectType.repository"
import { authMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import { ApiException } from "@src/tools/error-handler"
import { audit } from "@src/tools/audit"
import type { Variables } from "@src/types/global"

export const projectTypeRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)

    // Get all project types
    .get(
        "/",
        responseValidator({
            200: projectTypesArraySchema,
        }),
        async (c) => {
            const projectTypes = await projectTypeRepository.findAll()
            return c.render(projectTypes as ProjectTypeSchema[], 200)
        }
    )

    // Get project type by ID
    .get(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: projectTypeSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const projectType = await projectTypeRepository.findById(id)

            if (!projectType) {
                return c.json({ error: "Project type not found" }, 404)
            }

            return c.render(projectType, 200)
        }
    )

    // Create new project type
    .post(
        "/",
        zValidator("json", projectTypeCreateSchema),
        responseValidator({
            201: projectTypeSchema,
        }),
        async (c) => {
            const projectTypeData = c.req.valid("json")

            // Check if project type with this name already exists
            const existingProjectType = await projectTypeRepository.findByName(projectTypeData.name)
            if (existingProjectType) {
                return c.json({ error: "Project type with this name already exists" }, 400)
            }

            const newProjectType = await projectTypeRepository.create(projectTypeData)
            const user = c.get("user")
            audit(user.id, user.email, "create", "projectType", newProjectType.id, { name: newProjectType.name })
            return c.render(newProjectType, 201)
        }
    )

    // Update project type
    .put(
        "/:id",
        zValidator("param", idParamSchema),
        zValidator("json", projectTypeUpdateSchema),
        responseValidator({
            200: projectTypeSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const projectTypeData = c.req.valid("json")

            // Check if project type exists
            const existingProjectType = await projectTypeRepository.findById(id)
            if (!existingProjectType) {
                return c.json({ error: "Project type not found" }, 404)
            }

            // Check if name is being changed and if it already exists
            if (projectTypeData.name) {
                const conflictingProjectType = await projectTypeRepository.findByName(
                    projectTypeData.name
                )
                if (conflictingProjectType && conflictingProjectType.id !== id) {
                    return c.json({ error: "Project type with this name already exists" }, 400)
                }
            }

            const updatedProjectType = await projectTypeRepository.update(id, projectTypeData)
            const user = c.get("user")
            audit(user.id, user.email, "update", "projectType", id, { name: updatedProjectType.name })
            return c.render(updatedProjectType, 200)
        }
    )

    // Delete project type
    .delete(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: messageSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")

            // Check if project type exists
            const existingProjectType = await projectTypeRepository.findById(id)
            if (!existingProjectType) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Project type not found")
            }

            // Check if project type has associated projects
            const hasProjects = await projectTypeRepository.hasProjects(id)
            if (hasProjects) {
                throw new ApiException(
                    409,
                    ErrorCode.CONSTRAINT_VIOLATION,
                    "Cannot delete project type with existing projects"
                )
            }

            await projectTypeRepository.delete(id)
            const user = c.get("user")
            audit(user.id, user.email, "delete", "projectType", id, { name: existingProjectType.name })
            return c.render({ message: "Project type deleted successfully" }, 200)
        }
    )
