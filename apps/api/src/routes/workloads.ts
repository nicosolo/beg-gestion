import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    workloadCreateSchema,
    workloadUpdateSchema,
    workloadFilterSchema,
    workloadResponseSchema,
    workloadArrayResponseSchema,
    idParamSchema,
    type WorkloadResponse,
    type WorkloadArrayResponse,
} from "@beg/validations"
import { z } from "zod"
import { workloadRepository } from "../db/repositories/workload.repository"
import { authMiddleware } from "../tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "../types/global"
import { roleMiddleware, hasRole } from "@src/tools/role-middleware"
import { audit } from "@src/tools/audit"

// Create the app and apply auth middleware to all routes
export const workloadRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)

    // Get all workloads (admin can see all, users can see their own)
    .get(
        "/",
        zValidator("query", workloadFilterSchema),
        responseValidator({
            200: workloadArrayResponseSchema,
        }),
        async (c) => {
            const user = c.get("user")
            const filters = c.req.valid("query")

            // Non-admins can only see their own workloads
            const finalFilters = {
                ...filters,
                ...(!hasRole(user.role, "admin") ? { userId: user.id } : {}),
            }

            const workloads = await workloadRepository.findAll(finalFilters)
            return c.render(workloads as WorkloadArrayResponse, 200)
        }
    )

    // Get a specific workload (admin can see all, users can see their own)
    .get(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: workloadResponseSchema,
        }),
        async (c) => {
            const user = c.get("user")
            const { id } = c.req.valid("param")

            const workload = await workloadRepository.findById(id)

            if (!workload) {
                return c.json({ error: "Workload not found" }, 404)
            }

            // Non-admins can only see their own workloads
            if (!hasRole(user.role, "admin") && workload.userId !== user.id) {
                return c.json({ error: "Forbidden" }, 403)
            }

            return c.render(workload as WorkloadResponse, 200)
        }
    )

    // Create a new workload (admin only)
    .post(
        "/",
        roleMiddleware("admin"),
        zValidator("json", workloadCreateSchema),
        responseValidator({
            201: workloadResponseSchema,
        }),
        async (c) => {
            const workloadData = c.req.valid("json")

            const workload = await workloadRepository.create(workloadData)
            const user = c.get("user")
            audit(user.id, user.email, "create", "workload", workload.id)
            return c.render(workload as WorkloadResponse, 201)
        }
    )

    // Bulk create workloads (admin only)
    .post(
        "/bulk",
        roleMiddleware("admin"),
        zValidator("json", z.array(workloadCreateSchema)),
        responseValidator({
            201: workloadArrayResponseSchema,
        }),
        async (c) => {
            const workloadsData = c.req.valid("json")

            const workloads = await workloadRepository.bulkCreate(workloadsData)
            const user = c.get("user")
            audit(user.id, user.email, "create", "workload", null, { count: workloads.length })
            return c.render(workloads as WorkloadArrayResponse, 201)
        }
    )

    // Update a workload (admin only)
    .put(
        "/:id",
        roleMiddleware("admin"),
        zValidator("param", idParamSchema),
        zValidator("json", workloadUpdateSchema),
        responseValidator({
            200: workloadResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const workloadData = c.req.valid("json")

            const workload = await workloadRepository.update(id, workloadData)

            if (!workload) {
                return c.json({ error: "Workload not found" }, 404)
            }

            const user = c.get("user")
            audit(user.id, user.email, "update", "workload", id)
            return c.render(workload as WorkloadResponse, 200)
        }
    )

    // Delete a workload (admin only)
    .delete("/:id", roleMiddleware("admin"), zValidator("param", idParamSchema), async (c) => {
        const { id } = c.req.valid("param")

        const workload = await workloadRepository.delete(id)

        if (!workload) {
            return c.json({ error: "Workload not found" }, 404)
        }

        const user = c.get("user")
        audit(user.id, user.email, "delete", "workload", id)
        return c.json({ message: "Workload deleted successfully" }, 200)
    })

export default workloadRoutes
