import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    monthlyHoursFilterSchema,
    monthlyHoursSchema,
    monthlyHoursCreateSchema,
    monthlyHoursUpdateSchema,
    createPageResponseSchema,
} from "@beg/validations"
import { monthlyHoursRepository } from "../db/repositories/monthlyHours.repository"
import { authMiddleware, adminOnlyMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import type { Variables } from "@src/types/global"
import { ErrorCode } from "@beg/validations"
import { ApiException } from "@src/tools/error-handler"
import { audit } from "@src/tools/audit"

const monthlyHoursResponseArraySchema = createPageResponseSchema(monthlyHoursSchema)

export const monthlyHoursRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        zValidator("query", monthlyHoursFilterSchema),
        responseValidator({
            200: monthlyHoursResponseArraySchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const result = await monthlyHoursRepository.findAll(filter)
            return c.render(result, 200)
        }
    )

    .get(
        "/:id",
        responseValidator({
            200: monthlyHoursSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const monthlyHours = await monthlyHoursRepository.findById(id)
            if (!monthlyHours) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Monthly hours not found")
            }

            return c.render(monthlyHours, 200)
        }
    )

    .post(
        "/",
        adminOnlyMiddleware,
        zValidator("json", monthlyHoursCreateSchema),
        responseValidator({
            201: monthlyHoursSchema,
        }),
        async (c) => {
            const data = c.req.valid("json")

            // Check if record already exists for this year/month
            const existing = await monthlyHoursRepository.findByYearMonth(data.year, data.month)
            if (existing) {
                throw new ApiException(
                    409,
                    ErrorCode.DUPLICATE_ENTRY,
                    `Monthly hours already exist for ${data.year}/${data.month}`
                )
            }

            const monthlyHours = await monthlyHoursRepository.create(data)
            const user = c.get("user")
            audit(user.id, user.initials, "create", "monthlyHours", monthlyHours.id, { year: data.year, month: data.month })
            return c.render(monthlyHours, 201)
        }
    )

    .put(
        "/:id",
        adminOnlyMiddleware,
        zValidator("json", monthlyHoursUpdateSchema),
        responseValidator({
            200: monthlyHoursSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
            }

            const data = c.req.valid("json")

            // If year/month are being updated, check for conflicts
            if (data.year !== undefined || data.month !== undefined) {
                const current = await monthlyHoursRepository.findById(id)
                if (!current) {
                    throw new ApiException(404, ErrorCode.NOT_FOUND, "Monthly hours not found")
                }

                const newYear = data.year ?? current.year
                const newMonth = data.month ?? current.month

                const existing = await monthlyHoursRepository.findByYearMonth(newYear, newMonth)
                if (existing && existing.id !== id) {
                    throw new ApiException(
                        409,
                        ErrorCode.DUPLICATE_ENTRY,
                        `Monthly hours already exist for ${newYear}/${newMonth}`
                    )
                }
            }

            const monthlyHours = await monthlyHoursRepository.update(id, data)
            if (!monthlyHours) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Monthly hours not found")
            }

            const user = c.get("user")
            audit(user.id, user.initials, "update", "monthlyHours", id, { year: monthlyHours.year, month: monthlyHours.month })
            return c.render(monthlyHours, 200)
        }
    )

    .delete("/:id", adminOnlyMiddleware, async (c) => {
        const id = parseInt(c.req.param("id"))
        if (isNaN(id)) {
            throw new ApiException(400, ErrorCode.BAD_REQUEST, "Invalid ID")
        }

        // Check if monthly hours exists
        const monthlyHours = await monthlyHoursRepository.findById(id)
        if (!monthlyHours) {
            throw new ApiException(404, ErrorCode.NOT_FOUND, "Monthly hours not found")
        }

        await monthlyHoursRepository.delete(id)
        const user = c.get("user")
        audit(user.id, user.initials, "delete", "monthlyHours", id, { year: monthlyHours.year, month: monthlyHours.month })
        return c.json({ success: true }, 200)
    })
