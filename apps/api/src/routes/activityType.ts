import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    activityTypeCreateSchema,
    activityTypeUpdateSchema,
    activityTypeResponseSchema,
    activityTypesArrayResponseSchema,
    classPresetPreviewRequestSchema,
    classPresetPreviewResponseSchema,
    idParamSchema,
    messageSchema,
    type ActivityTypeResponse,
    type ClassPresetPreviewItem,
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
import { audit } from "@src/tools/audit"

async function applyClassPresetsToUsers(activityId: number, classPresets: ClassPresets) {
    const allUsers = await userRepository.findAllDetails()
    const eligibleUsers = allUsers.filter((u) => !u.archived)

    for (const user of eligibleUsers) {
        const collabType = user.collaboratorType as CollaboratorType | null
        const rateClass = collabType ? classPresets[collabType] : classPresets.default

        const existingRates: ActivityRateUser[] =
            (user.activityRates as ActivityRateUser[] | null) || []
        const existingIndex = existingRates.findIndex((r) => r.activityId === activityId)

        let updatedRates: ActivityRateUser[]
        if (!rateClass) {
            // Null class: remove the activity from user's rates
            if (existingIndex < 0) continue
            updatedRates = existingRates.filter((r) => r.activityId !== activityId)
        } else if (existingIndex >= 0) {
            updatedRates = [...existingRates]
            updatedRates[existingIndex] = { activityId, class: rateClass }
        } else {
            updatedRates = [...existingRates, { activityId, class: rateClass }]
        }

        await db
            .update(users)
            .set({ activityRates: updatedRates, updatedAt: new Date() })
            .where(eq(users.id, user.id))
    }
}

async function computeClassPresetChanges(
    activityId: number | undefined,
    classPresets: ClassPresets
): Promise<ClassPresetPreviewItem[]> {
    const allUsers = await userRepository.findAllDetails()
    const eligibleUsers = allUsers.filter((u) => !u.archived)

    const changes: ClassPresetPreviewItem[] = []

    for (const user of eligibleUsers) {
        const collabType = user.collaboratorType as CollaboratorType | null
        const newClass = collabType ? classPresets[collabType] : classPresets.default ?? null

        const existingRates: ActivityRateUser[] =
            (user.activityRates as ActivityRateUser[] | null) || []
        const existing = activityId
            ? existingRates.find((r) => r.activityId === activityId)
            : undefined
        const currentClass = existing?.class ?? null

        let action: ClassPresetPreviewItem["action"]
        if (!currentClass && newClass) action = "add"
        else if (currentClass && !newClass) action = "remove"
        else if (currentClass && newClass && currentClass !== newClass) action = "update"
        else action = "unchanged"

        changes.push({
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            initials: user.initials,
            collaboratorType: collabType,
            currentClass,
            newClass,
            action,
        })
    }

    return changes
}

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

    // Preview class preset changes without applying
    .post(
        "/preview-classes",
        roleMiddleware("admin"),
        zValidator("json", classPresetPreviewRequestSchema),
        responseValidator({
            200: classPresetPreviewResponseSchema,
        }),
        async (c) => {
            const { activityId, classPresets } = c.req.valid("json")
            const changes = await computeClassPresetChanges(activityId, classPresets as ClassPresets)
            return c.render({ changes }, 200)
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
            const { applyClasses, ...activityTypeData } = c.req.valid("json")

            // Check if activity type with this code already exists
            const existingActivityType = await activityTypeRepository.findByCode(
                activityTypeData.code
            )
            if (existingActivityType) {
                return c.json({ error: "Activity type with this code already exists" }, 400)
            }

            const newActivityType = await activityTypeRepository.create(activityTypeData)

            if (applyClasses && newActivityType.classPresets) {
                await applyClassPresetsToUsers(newActivityType.id, newActivityType.classPresets as ClassPresets)
            }

            const user = c.get("user")
            audit(user.id, user.initials, "create", "activityType", newActivityType.id, { name: newActivityType.name, code: newActivityType.code })
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
            const { applyClasses, ...activityTypeData } = c.req.valid("json")

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

            if (applyClasses && updatedActivityType.classPresets) {
                await applyClassPresetsToUsers(updatedActivityType.id, updatedActivityType.classPresets as ClassPresets)
            }

            const user = c.get("user")
            audit(user.id, user.initials, "update", "activityType", id, { name: updatedActivityType.name, code: updatedActivityType.code })
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
            const user = c.get("user")
            audit(user.id, user.initials, "delete", "activityType", id, { name: existingActivityType.name, code: existingActivityType.code })
            return c.render({ message: "Activity type deleted successfully" }, 200)
        }
    )
