import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    collaboratorGroupFilterSchema,
    collaboratorGroupSchema,
    collaboratorGroupCreateSchema,
    collaboratorGroupUpdateSchema,
    createPageResponseSchema,
} from "@beg/validations"
import { collaboratorGroupRepository } from "../db/repositories/collaboratorGroup.repository"
import { authMiddleware, adminOnlyMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "@src/types/global"
import { ErrorCode } from "@beg/validations"
import { ApiException } from "@src/tools/error-handler"
import { audit } from "@src/tools/audit"

const collaboratorGroupResponseArraySchema = createPageResponseSchema(collaboratorGroupSchema)

export const collaboratorGroupRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        zValidator("query", collaboratorGroupFilterSchema),
        responseValidator({
            200: collaboratorGroupResponseArraySchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const result = await collaboratorGroupRepository.findAll(filter)
            return c.render(result, 200)
        }
    )

    .get(
        "/:id",
        responseValidator({
            200: collaboratorGroupSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const group = await collaboratorGroupRepository.findById(id)
            if (!group) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Collaborator group not found")
            }

            return c.render(group, 200)
        }
    )

    .post(
        "/",
        adminOnlyMiddleware,
        zValidator("json", collaboratorGroupCreateSchema),
        responseValidator({
            201: collaboratorGroupSchema,
        }),
        async (c) => {
            const data = c.req.valid("json")
            const group = await collaboratorGroupRepository.create(data)
            const user = c.get("user")
            audit(user.id, user.initials, "create", "collaboratorGroup", group.id, {
                name: group.name,
            })
            return c.render(group, 201)
        }
    )

    .put(
        "/:id",
        adminOnlyMiddleware,
        zValidator("json", collaboratorGroupUpdateSchema),
        responseValidator({
            200: collaboratorGroupSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const data = c.req.valid("json")
            const group = await collaboratorGroupRepository.update(id, data)
            if (!group) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Collaborator group not found")
            }

            const user = c.get("user")
            audit(user.id, user.initials, "update", "collaboratorGroup", id, { name: group.name })
            return c.render(group, 200)
        }
    )

    .delete("/:id", adminOnlyMiddleware, async (c) => {
        const id = parseInt(c.req.param("id"))
        if (isNaN(id)) {
            throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
        }

        const group = await collaboratorGroupRepository.findById(id)
        if (!group) {
            throw new ApiException(404, ErrorCode.NOT_FOUND, "Collaborator group not found")
        }

        const hasUsers = await collaboratorGroupRepository.hasUsers(id)
        if (hasUsers) {
            throw new ApiException(
                409,
                ErrorCode.CONSTRAINT_VIOLATION,
                "Cannot delete collaborator group with assigned users"
            )
        }

        await collaboratorGroupRepository.delete(id)
        const user = c.get("user")
        audit(user.id, user.initials, "delete", "collaboratorGroup", id, { name: group.name })
        return c.json({ success: true }, 200)
    })
