import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    projectFilterSchema,
    projectExportFilterSchema,
    projectListResponse,
    projectResponseSchema,
    projectCreateSchema,
    projectUpdateSchema,
    projectMapArrayResponseSchema,
    projectMapFilterSchema,
    subProjectNamesResponseSchema,
    type ProjectListResponse,
    type ProjectResponse,
    type ProjectMapArrayResponse,
    successSchema,
} from "@beg/validations"
import { projectRepository } from "../db/repositories/project.repository"
import { authMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "@src/types/global"
import { throwNotFound, throwForbidden, throwInternalError } from "@src/tools/error-handler"
import { hasRole } from "@src/tools/role-middleware"
import { findProjectFoldersAcrossRoots } from "@src/tools/project-folder-finder"
import { buildProjectsWorkbook } from "@src/tools/project-exporter"
import { audit } from "@src/tools/audit"

export const projectRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        zValidator("query", projectFilterSchema),
        responseValidator({
            200: projectListResponse,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const result = await projectRepository.findAll(filter)
            return c.render(result as ProjectListResponse, 200)
        }
    )
    .get("/export", zValidator("query", projectExportFilterSchema), async (c) => {
        const filter = c.req.valid("query")

        // Use findAll without pagination to get all matching projects
        const result = await projectRepository.findAll({ ...filter, limit: 10000 })

        const buffer = await buildProjectsWorkbook(result.data, {
            perUser: filter.perUser ?? false,
        })

        const today = new Date().toISOString().split("T")[0]
        const filename = `mandats-${today}.xlsx`

        const headers = new Headers({
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": buffer.byteLength.toString(),
        })

        return new Response(buffer, {
            status: 200,
            headers,
        })
    })
    .get(
        "/map",
        zValidator("query", projectMapFilterSchema),
        responseValidator({
            200: projectMapArrayResponseSchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")

            const result = await projectRepository.findAll({
                ...filter,
                sortBy: "lastActivityDate",
                sortOrder: "desc",
                page: 1,
                limit: filter.limit ?? 100,
            })

            const mapData = result.data
                .filter((p) => p.latitude != null && p.longitude != null)
                .map((project) => ({
                id: project.id,
                projectNumber: project.projectNumber,
                subProjectName: project.subProjectName ?? null,
                name: project.name,
                latitude: project.latitude!,
                longitude: project.longitude!,
                clientName: project.client?.name ?? null,
                locationName: project.location?.name ?? null,
                lastActivityDate: project.lastActivityDate,
                ended: project.ended ?? false,
                types: project.types ?? [],
            }))

            return c.render(mapData as ProjectMapArrayResponse, 200)
        }
    )
    .get(
        "/sub-project-names",
        responseValidator({
            200: subProjectNamesResponseSchema,
        }),
        async (c) => {
            const names = await projectRepository.getDistinctSubProjectNames()
            return c.render(names, 200)
        }
    )
    .get(
        "/:id",
        responseValidator({
            200: projectResponseSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw throwNotFound("Project not found")
            }

            const project = await projectRepository.findById(id)
            if (!project) {
                throw throwNotFound("Project not found")
            }

            return c.render(project as ProjectResponse, 200)
        }
    )
    .get("/:id/folder", async (c) => {
        const id = parseInt(c.req.param("id"))
        if (isNaN(id)) {
            return c.json({ error: "Invalid project ID" }, 400)
        }

        // First get the project to obtain its project number
        const project = await projectRepository.findById(id)
        if (!project || !project.projectNumber) {
            return c.json({ error: "Project not found" }, 404)
        }

        try {
            // Search for folder across all configured roots
            const matches = await findProjectFoldersAcrossRoots(project.projectNumber)

            return c.json({
                projectId: id,
                projectNumber: project.projectNumber,
                found: matches.length > 0,
                matches,
            })
        } catch (error) {
            console.error("Project folder search error:", error)
            return c.json(
                {
                    error: "Failed to search for project folder",
                    details: error instanceof Error ? error.message : String(error),
                },
                500
            )
        }
    })
    .post(
        "/",
        zValidator("json", projectCreateSchema),
        responseValidator({
            201: projectResponseSchema,
        }),
        async (c) => {
            const data = c.req.valid("json")
            const user = c.get("user")
            const isAdmin = hasRole(user.role, "admin")
            if (!isAdmin && !data.projectManagers?.includes(user.id)) {
                data.projectManagers = [...(data.projectManagers || []), user.id]
            }
            try {
                const projectId = await projectRepository.create(data)
                if (!projectId) {
                    throw throwInternalError("Failed to create project")
                }
                const project = await projectRepository.findById(projectId)
                if (!project) {
                    throw throwNotFound("Project not found")
                }
                audit(user.id, user.initials, "create", "project", projectId, {
                    name: project.name,
                })
                return c.render(project as ProjectResponse, 201)
            } catch (error: unknown) {
                console.error("Error creating project:", error)
                if (error instanceof Error && error.message === "Project number already exists") {
                    return c.json({ error: error.message }, 409)
                }
                return c.json({ error: "Failed to create project" }, 500)
            }
        }
    )
    .put(
        "/:id",
        zValidator("json", projectUpdateSchema),
        responseValidator({
            200: projectResponseSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                return c.json({ error: "Invalid ID" }, 400)
            }

            const data = c.req.valid("json")
            const user = c.get("user")

            // Authorization checks
            const isAdmin = hasRole(user.role, "admin")
            const isManager = await projectRepository.isProjectManager(id, user.id)
            const isEacEditor =
                user.role === "user_eac" && (await projectRepository.isEacProject(id))

            // If user is not admin, not a project manager, and not user_eac on an EAC project, deny
            if (!isAdmin && !isManager && !isEacEditor) {
                throw throwForbidden("You do not have permission to update this project")
            }

            const projectId = await projectRepository.update(id, data)
            if (!projectId) {
                throw throwInternalError("Failed to update project")
            }
            const project = await projectRepository.findById(projectId)
            if (!project) {
                throw throwNotFound("Project not found")
            }
            audit(user.id, user.initials, "update", "project", id, { name: project.name })
            return c.render(project as ProjectResponse, 200)
        }
    )
    // Add a member to a project (for project managers to add users who have activities)
    .post(
        "/:id/members/:userId",
        responseValidator({
            200: successSchema,
        }),
        async (c) => {
            const projectId = parseInt(c.req.param("id"))
            const userId = parseInt(c.req.param("userId"))
            const user = c.get("user")

            if (isNaN(projectId) || isNaN(userId)) {
                throw throwNotFound("Invalid project or user ID")
            }

            // Check if user is admin or project manager
            const isAdmin = hasRole(user.role, "admin")
            const isManager = await projectRepository.isProjectManager(projectId, user.id)

            if (!isAdmin && !isManager) {
                throw throwForbidden("You do not have permission to add members to this project")
            }

            // Add user as member
            await projectRepository.addMember(projectId, userId)

            return c.render({ success: true }, 200)
        }
    )
