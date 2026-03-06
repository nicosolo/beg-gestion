import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    activityTypeCreateSchema,
    activityTypeUpdateSchema,
    activityTypeResponseSchema,
    activityTypesArrayResponseSchema,
    idParamSchema,
    messageSchema,
    type ActivityTypeResponse,
    ErrorCode,
} from "@beg/validations"
import { activityTypeRepository } from "../db/repositories/activityType.repository"
import { authMiddleware } from "../tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import { ApiException } from "@src/tools/error-handler"
import type { Variables } from "@src/types/global"
import { roleMiddleware, hasRole } from "@src/tools/role-middleware"
import { userRepository } from "@src/db/repositories/user.repository"
import type { ActivityRateUser, CollaboratorType, ClassPresets } from "@beg/validations"
import { db } from "@src/db"
import { users } from "@src/db/schema"
import { eq } from "drizzle-orm"

// Create the app and apply auth middleware to all routes
export const activityTypeRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)

    // Get all activity types (admins see all, users only see non-adminOnly)
    // Activity types with code "x" are archived and excluded by default
    .get(
        "/",
        responseValidator({
            200: activityTypesArrayResponseSchema,
        }),
        async (c) => {
            const user = c.get("user")
            let activityTypes = await activityTypeRepository.findAll()
            if (!hasRole(user.role, "admin")) {
                activityTypes = activityTypes.filter((at) => !at.adminOnly)
            }
            return c.render(activityTypes as ActivityTypeResponse[], 200)
        }
    )
    .get(
        "/filtered",
        responseValidator({
            200: activityTypesArrayResponseSchema,
        }),
        async (c) => {
            const user = c.get("user")
            const userWithActivities = await userRepository.findById(user.id)
            if (!userWithActivities) {
                return c.json({ error: "User not found" }, 404)
            }
            let activityTypes = await activityTypeRepository.findAll({ excludeArchived: true })
            // Filter by user's activity rates
            activityTypes = activityTypes.filter((activity) =>
                (userWithActivities?.activityRates || []).some(
                    (activityRate) => activityRate.activityId === activity.id
                )
            )
            // Non-admin users cannot see adminOnly activity types
            if (!hasRole(user.role, "admin")) {
                activityTypes = activityTypes.filter((at) => !at.adminOnly)
            }
            return c.render(activityTypes, 200)
        }
    )

    // Get activity type by ID
    .get(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: activityTypeResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const activityType = await activityTypeRepository.findById(id)

            if (!activityType) {
                return c.json({ error: "Activity type not found" }, 404)
            }

            return c.render(activityType, 200)
        }
    )

    // Create new activity type
    .post(
        "/",
        roleMiddleware("admin"),
        zValidator("json", activityTypeCreateSchema),
        responseValidator({
            201: activityTypeResponseSchema,
        }),
        async (c) => {
            const activityTypeData = c.req.valid("json")

            // Check if activity type with this code already exists
            const existingActivityType = await activityTypeRepository.findByCode(
                activityTypeData.code
            )
            if (existingActivityType) {
                return c.json({ error: "Activity type with this code already exists" }, 400)
            }

            const newActivityType = await activityTypeRepository.create(activityTypeData)

            // Auto-assign to all non-archived users with a collaboratorType
            if (newActivityType.classPresets) {
                const allUsers = await userRepository.findAllDetails()
                const eligibleUsers = allUsers.filter(
                    (u) => !u.archived && u.collaboratorType
                )

                for (const user of eligibleUsers) {
                    const collabType = user.collaboratorType as CollaboratorType
                    const rateClass = (newActivityType.classPresets as ClassPresets)[collabType]
                    if (!rateClass) continue

                    const existingRates: ActivityRateUser[] =
                        (user.activityRates as ActivityRateUser[] | null) || []
                    if (existingRates.some((r) => r.activityId === newActivityType.id)) continue

                    const updatedRates = [
                        ...existingRates,
                        { activityId: newActivityType.id, class: rateClass },
                    ]
                    await db
                        .update(users)
                        .set({
                            activityRates: updatedRates,
                            updatedAt: new Date(),
                        })
                        .where(eq(users.id, user.id))
                }
            }

            return c.render(newActivityType, 201)
        }
    )

    // Update activity type
    .put(
        "/:id",
        roleMiddleware("admin"),
        zValidator("param", idParamSchema),
        zValidator("json", activityTypeUpdateSchema),
        responseValidator({
            200: activityTypeResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const activityTypeData = c.req.valid("json")

            // Check if activity type exists
            const existingActivityType = await activityTypeRepository.findById(id)
            if (!existingActivityType) {
                return c.json({ error: "Activity type not found" }, 404)
            }

            // Check if code is being changed and if it's already taken
            if (activityTypeData.code && activityTypeData.code !== existingActivityType.code) {
                const codeExists = await activityTypeRepository.findByCode(activityTypeData.code)
                if (codeExists) {
                    return c.json({ error: "Activity type code already taken" }, 400)
                }
            }

            const updatedActivityType = await activityTypeRepository.update(id, activityTypeData)
            return c.render(updatedActivityType, 200)
        }
    )

    // Delete activity type
    .delete(
        "/:id",
        roleMiddleware("admin"),
        zValidator("param", idParamSchema),
        responseValidator({
            200: messageSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")

            // Check if activity type exists
            const existingActivityType = await activityTypeRepository.findById(id)
            if (!existingActivityType) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Activity type not found")
            }

            // Check if activity type has associated activities
            const hasActivities = await activityTypeRepository.hasActivities(id)
            if (hasActivities) {
                throw new ApiException(
                    409,
                    ErrorCode.CONSTRAINT_VIOLATION,
                    "Cannot delete activity type with existing activities"
                )
            }

            await activityTypeRepository.delete(id)
            return c.render({ message: "Activity type deleted successfully" }, 200)
        }
    )
