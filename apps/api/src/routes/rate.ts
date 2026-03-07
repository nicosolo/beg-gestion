import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    rateClassSchema,
    rateClassCreateSchema,
    rateClassUpdateSchema,
    rateClassesArraySchema,
    idParamSchema,
    type RateClassSchema,
    rateClassFilterSchema,
} from "@beg/validations"
import { rateRepository } from "../db/repositories/rate.repository"
import { authMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import { throwNotFound, throwDuplicateEntry } from "@src/tools/error-handler"
import type { Variables } from "@src/types/global"
import { roleMiddleware } from "@src/tools/role-middleware"

export const rateRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)

    // Get all rates
    .get(
        "/",
        zValidator("query", rateClassFilterSchema),
        responseValidator({
            200: rateClassesArraySchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const rates = await rateRepository.findAll(filter.years)
            return c.render(rates as RateClassSchema[], 200)
        }
    )

    // Get rate by ID
    .get(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: rateClassSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const rate = await rateRepository.findById(id)

            if (!rate) {
                throwNotFound("Rate")
            }

            return c.render(rate, 200)
        }
    )

    // Create new rate
    .post(
        "/",
        roleMiddleware("admin"),
        zValidator("json", rateClassCreateSchema),
        responseValidator({
            201: rateClassSchema,
        }),
        async (c) => {
            const rateData = c.req.valid("json")

            // Check if rate with this class and year already exists
            const existingRate = await rateRepository.findByClassAndYear(
                rateData.class,
                rateData.year
            )
            if (existingRate) {
                throwDuplicateEntry("Rate", "class/year", `${rateData.class}/${rateData.year}`)
            }

            const newRate = await rateRepository.create(rateData)
            return c.render(newRate, 201)
        }
    )

    // Update rate
    .put(
        "/:id",
        roleMiddleware("admin"),
        zValidator("param", idParamSchema),
        zValidator("json", rateClassUpdateSchema),
        responseValidator({
            200: rateClassSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const rateData = c.req.valid("json")

            // Check if rate exists
            const existingRate = await rateRepository.findById(id)
            if (!existingRate) {
                throwNotFound("Rate")
            }

            // Check if class/year combination is being changed and if it already exists
            if (rateData.class || rateData.year) {
                const checkClass = rateData.class || existingRate.class
                const checkYear = rateData.year || existingRate.year
                const conflictingRate = await rateRepository.findByClassAndYear(
                    checkClass,
                    checkYear
                )
                if (conflictingRate && conflictingRate.id !== id) {
                    throwDuplicateEntry("Rate", "class/year", `${checkClass}/${checkYear}`)
                }
            }

            const updatedRate = await rateRepository.update(id, rateData)
            return c.render(updatedRate, 200)
        }
    )

    // Delete rate
    .delete("/:id", roleMiddleware("admin"), zValidator("param", idParamSchema), async (c) => {
        const { id } = c.req.valid("param")

        // Check if rate exists
        const existingRate = await rateRepository.findById(id)
        if (!existingRate) {
            throwNotFound("Rate")
        }

        await rateRepository.delete(id)
        return c.json({ message: "Rate deleted successfully" }, 200)
    })
