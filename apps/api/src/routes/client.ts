import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { 
    clientFilterSchema, 
    clientSchema, 
    clientCreateSchema,
    clientUpdateSchema,
    createPageResponseSchema 
} from "@beg/validations"
import { clientRepository } from "../db/repositories/client.repository"
import { authMiddleware, adminOnlyMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "@src/types/global"
import { ErrorCode } from "@beg/validations"
import { ApiException } from "@src/tools/error-handler"
import { audit } from "@src/tools/audit"

const clientResponseArraySchema = createPageResponseSchema(clientSchema)

export const clientRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        zValidator("query", clientFilterSchema),
        responseValidator({
            200: clientResponseArraySchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const result = await clientRepository.findAll(filter)
            return c.render(result, 200)
        }
    )

    .get(
        "/:id",
        responseValidator({
            200: clientSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const client = await clientRepository.findById(id)
            if (!client) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Client not found")
            }

            return c.render(client, 200)
        }
    )

    .post(
        "/",
        adminOnlyMiddleware,
        zValidator("json", clientCreateSchema),
        responseValidator({
            201: clientSchema,
        }),
        async (c) => {
            const data = c.req.valid("json")
            const client = await clientRepository.create(data)
            const user = c.get("user")
            audit(user.id, user.initials, "create", "client", client.id, { name: client.name })
            return c.render(client, 201)
        }
    )

    .put(
        "/:id",
        adminOnlyMiddleware,
        zValidator("json", clientUpdateSchema),
        responseValidator({
            200: clientSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const data = c.req.valid("json")
            const client = await clientRepository.update(id, data)
            if (!client) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Client not found")
            }

            const user = c.get("user")
            audit(user.id, user.initials, "update", "client", id, { name: client.name })
            return c.render(client, 200)
        }
    )

    .delete(
        "/:id",
        adminOnlyMiddleware,
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            // Check if client exists
            const client = await clientRepository.findById(id)
            if (!client) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Client not found")
            }

            // Check if client has invoices or projects
            const hasInvoices = await clientRepository.hasInvoices(id)
            const hasProjects = await clientRepository.hasProjects(id)
            
            if (hasInvoices || hasProjects) {
                throw new ApiException(
                    409,
                    ErrorCode.CONSTRAINT_VIOLATION,
                    "Cannot delete client with existing invoices or projects"
                )
            }

            await clientRepository.delete(id)
            const user = c.get("user")
            audit(user.id, user.initials, "delete", "client", id, { name: client.name })
            return c.json({ success: true }, 200)
        }
    )
