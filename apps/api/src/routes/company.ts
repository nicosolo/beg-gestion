import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { 
    companyFilterSchema, 
    companySchema, 
    companyCreateSchema,
    companyUpdateSchema,
    createPageResponseSchema 
} from "@beg/validations"
import { companyRepository } from "../db/repositories/company.repository"
import { authMiddleware, adminOnlyMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "@src/types/global"
import { ErrorCode } from "@beg/validations"
import { ApiException } from "@src/tools/error-handler"
import { audit } from "@src/tools/audit"

const companyResponseArraySchema = createPageResponseSchema(companySchema)

export const companyRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        zValidator("query", companyFilterSchema),
        responseValidator({
            200: companyResponseArraySchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const result = await companyRepository.findAll(filter)
            return c.render(result, 200)
        }
    )

    .get(
        "/:id",
        responseValidator({
            200: companySchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const company = await companyRepository.findById(id)
            if (!company) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Company not found")
            }

            return c.render(company, 200)
        }
    )

    .post(
        "/",
        adminOnlyMiddleware,
        zValidator("json", companyCreateSchema),
        responseValidator({
            201: companySchema,
        }),
        async (c) => {
            const data = c.req.valid("json")
            const company = await companyRepository.create(data)
            const user = c.get("user")
            audit(user.id, user.initials, "create", "company", company.id, { name: company.name })
            return c.render(company, 201)
        }
    )

    .put(
        "/:id",
        adminOnlyMiddleware,
        zValidator("json", companyUpdateSchema),
        responseValidator({
            200: companySchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const data = c.req.valid("json")
            const company = await companyRepository.update(id, data)
            if (!company) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Company not found")
            }

            const user = c.get("user")
            audit(user.id, user.initials, "update", "company", id, { name: company.name })
            return c.render(company, 200)
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

            // Check if company exists
            const company = await companyRepository.findById(id)
            if (!company) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Company not found")
            }

            // Check if company has projects
            const hasProjects = await companyRepository.hasProjects(id)
            
            if (hasProjects) {
                throw new ApiException(
                    409,
                    ErrorCode.CONSTRAINT_VIOLATION,
                    "Cannot delete company with existing projects"
                )
            }

            await companyRepository.delete(id)
            const user = c.get("user")
            audit(user.id, user.initials, "delete", "company", id, { name: company.name })
            return c.json({ success: true }, 200)
        }
    )