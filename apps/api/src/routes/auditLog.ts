import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { auditLogFilterSchema, auditLogListResponseSchema } from "@beg/validations"
import { auditLogRepository } from "@src/db/repositories/auditLog.repository"
import { authMiddleware } from "@src/tools/auth-middleware"
import { roleMiddleware } from "@src/tools/role-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "@src/types/global"

export const auditLogRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .use("/*", roleMiddleware("admin"))
    .get(
        "/",
        zValidator("query", auditLogFilterSchema),
        responseValidator({
            200: auditLogListResponseSchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const result = await auditLogRepository.findAll(filter)
            return c.render(result, 200)
        }
    )
