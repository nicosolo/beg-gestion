import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    engineerFilterSchema,
    engineerSchema,
    engineerCreateSchema,
    engineerUpdateSchema,
    createPageResponseSchema,
} from "@beg/validations"
import { engineerRepository } from "../db/repositories/engineer.repository"
import { authMiddleware, adminOnlyMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "@src/types/global"
import { ErrorCode } from "@beg/validations"
import { ApiException } from "@src/tools/error-handler"
import { audit } from "@src/tools/audit"

const engineerResponseArraySchema = createPageResponseSchema(engineerSchema)

export const engineerRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        zValidator("query", engineerFilterSchema),
        responseValidator({
            200: engineerResponseArraySchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const result = await engineerRepository.findAll(filter)
            return c.render(result, 200)
        }
    )

    .get(
        "/:id",
        responseValidator({
            200: engineerSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const engineer = await engineerRepository.findById(id)
            if (!engineer) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Engineer not found")
            }

            return c.render(engineer, 200)
        }
    )

    .post(
        "/",
        adminOnlyMiddleware,
        zValidator("json", engineerCreateSchema),
        responseValidator({
            201: engineerSchema,
        }),
        async (c) => {
            const data = c.req.valid("json")
            const engineer = await engineerRepository.create(data)
            const user = c.get("user")
            audit(user.id, user.email, "create", "engineer", engineer.id, { name: engineer.name })
            return c.render(engineer, 201)
        }
    )

    .put(
        "/:id",
        adminOnlyMiddleware,
        zValidator("json", engineerUpdateSchema),
        responseValidator({
            200: engineerSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const data = c.req.valid("json")
            const engineer = await engineerRepository.update(id, data)
            if (!engineer) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Engineer not found")
            }

            const user = c.get("user")
            audit(user.id, user.email, "update", "engineer", id, { name: engineer.name })
            return c.render(engineer, 200)
        }
    )

    .delete("/:id", adminOnlyMiddleware, async (c) => {
        const id = parseInt(c.req.param("id"))
        if (isNaN(id)) {
            throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
        }

        // Check if engineer exists
        const engineer = await engineerRepository.findById(id)
        if (!engineer) {
            throw new ApiException(404, ErrorCode.NOT_FOUND, "Engineer not found")
        }

        // Check if engineer has projects
        const hasProjects = await engineerRepository.hasProjects(id)

        if (hasProjects) {
            throw new ApiException(
                409,
                ErrorCode.CONSTRAINT_VIOLATION,
                "Cannot delete engineer with existing projects"
            )
        }

        await engineerRepository.delete(id)
        const user = c.get("user")
        audit(user.id, user.email, "delete", "engineer", id, { name: engineer.name })
        return c.json({ success: true }, 200)
    })
