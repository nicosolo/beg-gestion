import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    vatRateSchema,
    vatRateCreateSchema,
    vatRateUpdateSchema,
    vatRateListResponse,
} from "@beg/validations"
import { vatRateRepository } from "../db/repositories/vatRate.repository"
import { authMiddleware, adminOnlyMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "@src/types/global"
import { ErrorCode } from "@beg/validations"
import { ApiException } from "@src/tools/error-handler"
import { audit } from "@src/tools/audit"

export const vatRateRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        responseValidator({
            200: vatRateListResponse,
        }),
        async (c) => {
            const result = await vatRateRepository.findAll()
            return c.render(result, 200)
        }
    )

    .get(
        "/:id",
        responseValidator({
            200: vatRateSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const vatRate = await vatRateRepository.findById(id)
            if (!vatRate) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "VAT rate not found")
            }

            return c.render(vatRate, 200)
        }
    )

    .post(
        "/",
        adminOnlyMiddleware,
        zValidator("json", vatRateCreateSchema),
        responseValidator({
            201: vatRateSchema,
        }),
        async (c) => {
            const data = c.req.valid("json")

            // Check if year already exists
            const existing = await vatRateRepository.findByYear(data.year)
            if (existing) {
                throw new ApiException(
                    409,
                    ErrorCode.ALREADY_EXISTS,
                    `VAT rate for year ${data.year} already exists`
                )
            }

            const vatRate = await vatRateRepository.create(data)
            const user = c.get("user")
            audit(user.id, user.initials, "create", "vatRate", vatRate.id, { year: vatRate.year, rate: vatRate.rate })
            return c.render(vatRate, 201)
        }
    )

    .put(
        "/:id",
        adminOnlyMiddleware,
        zValidator("json", vatRateUpdateSchema),
        responseValidator({
            200: vatRateSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const data = c.req.valid("json")

            // If updating year, check if it already exists
            if (data.year) {
                const existing = await vatRateRepository.findByYear(data.year)
                if (existing && existing.id !== id) {
                    throw new ApiException(
                        409,
                        ErrorCode.ALREADY_EXISTS,
                        `VAT rate for year ${data.year} already exists`
                    )
                }
            }

            const vatRate = await vatRateRepository.update(id, data)
            if (!vatRate) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "VAT rate not found")
            }

            const user = c.get("user")
            audit(user.id, user.initials, "update", "vatRate", id, { year: vatRate.year, rate: vatRate.rate })
            return c.render(vatRate, 200)
        }
    )

    .delete("/:id", adminOnlyMiddleware, async (c) => {
        const id = parseInt(c.req.param("id"))
        if (isNaN(id)) {
            throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
        }

        // Check if VAT rate exists
        const vatRate = await vatRateRepository.findById(id)
        if (!vatRate) {
            throw new ApiException(404, ErrorCode.NOT_FOUND, "VAT rate not found")
        }

        await vatRateRepository.delete(id)
        const user = c.get("user")
        audit(user.id, user.initials, "delete", "vatRate", id, { year: vatRate.year, rate: vatRate.rate })
        return c.json({ success: true }, 200)
    })
