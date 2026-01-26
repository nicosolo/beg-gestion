import { Hono } from "hono"

import { zValidator } from "@hono/zod-validator"
import {
    activityFilterSchema,
    activityExportFilterSchema,
    activityResponseSchema,
    activityCreateSchema,
    activityUpdateSchema,
    activityBulkUpdateSchema,
    activityBulkUpdateResponseSchema,
    idParamSchema,
    activityListResponse,
    orphanedActivitiesResponseSchema,
} from "@beg/validations"
import { activityRepository } from "../db/repositories/activity.repository"
import { projectRepository } from "../db/repositories/project.repository"
import { authMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import { throwNotFound, throwValidationError, throwActivityLocked } from "@src/tools/error-handler"
import type { Variables } from "@src/types/global"
import { activityTypeRepository } from "@src/db/repositories/activityType.repository"
import { rateRepository } from "@src/db/repositories/rate.repository"
import { userRepository } from "@src/db/repositories/user.repository"
import { hasRole } from "@src/tools/role-middleware"
import { buildActivitiesWorkbook } from "@src/tools/activity-exporter"

export const activityRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        zValidator("query", activityFilterSchema),
        responseValidator({
            200: activityListResponse,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const user = c.get("user")
            const result = await activityRepository.findAll(user, filter)
            return c.render(result, 200)
        }
    )
    .get("/export", zValidator("query", activityExportFilterSchema), async (c) => {
        const filter = c.req.valid("query")
        const user = c.get("user")
        const activities = await activityRepository.findAllForExport(user, filter)
        const includeDisbursementColumn = hasRole(user.role, "admin")

        const buffer = await buildActivitiesWorkbook(activities, {
            includeDisbursementColumn,
            perUser: filter.perUser ?? false,
        })

        const today = new Date().toISOString().split("T")[0]
        const filename = `heures-${today}.xlsx`

        const headers = new Headers({
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": buffer.byteLength.toString(),
        })

        return new Response(buffer, {
            status: 200,
            headers,
        })
    })
    // Get activities where creator is not a project member (for project managers)
    .get(
        "/orphaned",
        responseValidator({
            200: orphanedActivitiesResponseSchema,
        }),
        async (c) => {
            const user = c.get("user")
            const orphanedActivities = await activityRepository.findOrphanedActivities(user)
            return c.render(orphanedActivities, 200)
        }
    )
    .get(
        "/:id",
        responseValidator({
            200: activityResponseSchema,
        }),
        async (c) => {
            const id = parseInt(c.req.param("id"))
            if (isNaN(id)) {
                return c.json({ error: "Invalid ID" }, 400)
            }

            const user = c.get("user")
            const activity = await activityRepository.findById(id, user)
            if (!activity) {
                return c.json({ error: "Activity not found" }, 404)
            }

            return c.render(activity, 200)
        }
    )

    // Create new activity
    .post(
        "/",
        zValidator("json", activityCreateSchema),
        responseValidator({
            201: activityResponseSchema,
        }),
        async (c) => {
            const activityData = c.req.valid("json")
            const user = c.get("user")

            // Check 60-day lock for non-admin users when creating activities
            if (!hasRole(user.role, "admin")) {
                const activityDate = new Date(activityData.date)
                const daysDifference = Math.floor(
                    (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
                )
                if (daysDifference > 60) {
                    throwActivityLocked("Cannot create activities older than 60 days")
                }
            }

            // Check if project exists
            const project = await projectRepository.findById(activityData.projectId ?? 0)
            if (!project) {
                return c.json({ error: "Project not found" }, 404)
            }
            const activityType = await activityTypeRepository.findById(activityData.activityTypeId)
            if (!activityType) {
                throwValidationError("Activity type not found", [
                    { field: "activityTypeId", message: "Activity type not found" },
                ])
            }
            // Non-admin users cannot create activities with adminOnly activity types
            if (activityType.adminOnly && !hasRole(user.role, "admin")) {
                throwValidationError("Access denied", [
                    {
                        field: "activityTypeId",
                        message: "This activity type is restricted to admins",
                    },
                ])
            }
            const userId =
                hasRole(user.role, "admin") && activityData.userId ? activityData.userId : user.id
            const userData = await userRepository.findById(userId)
            if (!userData) {
                throwValidationError("User not found", [
                    { field: "userId", message: "User not found" },
                ])
            }

            const userClass = userData.activityRates?.find(
                (rate) => rate.activityId === activityType.id
            )
            let activityRate = null
            if (userClass) {
                activityRate = await rateRepository.findByClassAndYear(
                    userClass.class,
                    activityData.date.getFullYear()
                )
            }
            console.log(activityRate, userClass)
            // Add the current user's ID to the activity data
            const newActivity = await activityRepository.create({
                activityTypeId: activityData.activityTypeId,
                projectId: activityData.projectId,
                date: activityData.date,
                duration: activityData.duration,
                userId: userId,
                kilometers: activityData.kilometers ?? 0,
                expenses: activityData.expenses ?? 0,
                rate: activityRate?.amount ?? 0,
                rateClass: userClass?.class ?? null,
                billed: activityData.billed ?? false,
                disbursement: false,
                description: activityData.description ?? "",
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            if (!newActivity) {
                return c.json({ error: "Failed to create activity" }, 500)
            }

            return c.render(newActivity, 201)
        }
    )

    // Update activity
    .put(
        "/:id",
        zValidator("param", idParamSchema),
        zValidator("json", activityUpdateSchema),
        responseValidator({
            200: activityResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const activityData = c.req.valid("json")

            const user = c.get("user")

            // First check if the user has access to this activity
            const existingActivity = await activityRepository.findById(id, user)
            if (!existingActivity) {
                throwNotFound("Activity")
            }

            // Billed activities cannot be edited by non-managers
            if (
                existingActivity.billed &&
                !hasRole(user.role, "admin") &&
                !hasRole(user.role, "super_admin")
            ) {
                const isManager = await projectRepository.isProjectManager(
                    existingActivity.project?.id ?? 0,
                    user.id
                )
                if (!isManager) {
                    throwValidationError("Access denied", [
                        {
                            field: "billed",
                            message: "Billed activities cannot be modified",
                        },
                    ])
                }
            }

            // Check 60-day lock for non-admin users - only projectId can be changed
            if (!hasRole(user.role, "admin") && !hasRole(user.role, "super_admin")) {
                const activityDate = new Date(existingActivity.date)
                const daysDifference = Math.floor(
                    (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
                )
                if (daysDifference > 60) {
                    // Only allow projectId changes on locked activities
                    const changedKeys = Object.keys(activityData).filter(
                        (key) =>
                            key !== "projectId" &&
                            key !== "billed" &&
                            (activityData as any)[key] !== undefined
                    )
                    if (changedKeys.length > 0) {
                        throwActivityLocked(
                            "Only project can be changed on activities older than 60 days"
                        )
                    }
                }
            }

            // Check billed toggle permission for non-admin users
            if (
                activityData.billed !== undefined &&
                activityData.billed !== existingActivity.billed &&
                !hasRole(user.role, "admin") &&
                !hasRole(user.role, "super_admin")
            ) {
                const isManager = await projectRepository.isProjectManager(
                    existingActivity.project?.id ?? 0,
                    user.id
                )
                if (!isManager) {
                    throwValidationError("Access denied", [
                        {
                            field: "billed",
                            message: "Only project managers can modify billed status",
                        },
                    ])
                }
            }

            const userId = activityData.userId
                ? hasRole(user.role, "admin")
                    ? activityData.userId
                    : user.id
                : (existingActivity.user?.id ?? 0)
            let rate = existingActivity.rate
            let rateClass = existingActivity.rateClass
            if (
                activityData.activityTypeId &&
                existingActivity.activityType?.id !== activityData.activityTypeId
            ) {
                const project = await projectRepository.findById(
                    activityData.projectId || existingActivity.project?.id || 0
                )
                if (!project) {
                    throwNotFound("Project")
                }
                const activityType = await activityTypeRepository.findById(
                    activityData.activityTypeId
                )
                if (!activityType) {
                    throwValidationError("Activity type not found", [
                        { field: "activityTypeId", message: "Activity type not found" },
                    ])
                }
                // Non-admin users cannot update activities to use adminOnly activity types
                if (activityType.adminOnly && !hasRole(user.role, "admin")) {
                    throwValidationError("Access denied", [
                        {
                            field: "activityTypeId",
                            message: "This activity type is restricted to admins",
                        },
                    ])
                }
                const userData = await userRepository.findById(userId)
                if (!userData) {
                    throwValidationError("User not found", [
                        { field: "userId", message: "User not found" },
                    ])
                }
                const userClass = userData.activityRates?.find(
                    (rate) => rate.activityId === activityType.id
                )
                if (!userClass) {
                    throwValidationError("User class not found", [
                        { field: "userId", message: "User class not found" },
                    ])
                }

                const activityRate = await rateRepository.findByClassAndYear(
                    userClass.class,
                    project.startDate.getFullYear()
                )
                rateClass = userClass.class
                rate = activityRate.amount
            }

            const updatedActivity = await activityRepository.update(id, {
                ...activityData,
                disbursement: existingActivity.disbursement,
                rate: rate,
                rateClass: rateClass,
                userId: userId,
            })

            if (!updatedActivity) {
                throwNotFound("Activity")
            }

            return c.render(updatedActivity, 200)
        }
    )

    // Bulk update activities
    .patch(
        "/bulk",
        zValidator("json", activityBulkUpdateSchema),
        responseValidator({
            200: activityBulkUpdateResponseSchema,
        }),
        async (c) => {
            const { ids, updates } = c.req.valid("json")
            const user = c.get("user")

            // Verify user has access to all activities
            const activities = await Promise.all(
                ids.map((id) => activityRepository.findById(id, user))
            )

            // Check if any activity was not found or not accessible
            const inaccessibleIds = ids.filter((id, index) => !activities[index])
            if (inaccessibleIds.length > 0) {
                throwValidationError("Some activities not found or not accessible", [
                    {
                        field: "ids",
                        message: `Activities not found: ${inaccessibleIds.join(", ")}`,
                    },
                ])
            }

            // Check billed toggle permission for non-admin users
            if (
                updates.billed !== undefined &&
                !hasRole(user.role, "admin") &&
                !hasRole(user.role, "super_admin")
            ) {
                const projectIds = [
                    ...new Set(activities.filter((a) => a?.project?.id).map((a) => a!.project!.id)),
                ]
                for (const projectId of projectIds) {
                    const isManager = await projectRepository.isProjectManager(projectId, user.id)
                    if (!isManager) {
                        throwValidationError("Access denied", [
                            {
                                field: "billed",
                                message: "Only project managers can modify billed status",
                            },
                        ])
                    }
                }
            }

            // Perform bulk update
            const updatedCount = await activityRepository.bulkUpdate(ids, updates)

            return c.json(
                {
                    updated: updatedCount,
                    ids: ids,
                },
                200
            )
        }
    )

    // Delete activity
    .delete("/:id", zValidator("param", idParamSchema), async (c) => {
        const { id } = c.req.valid("param")
        const user = c.get("user")

        // First check if the user has access to this activity
        const existingActivity = await activityRepository.findById(id, user)
        if (!existingActivity) {
            throwNotFound("Activity")
        }

        // Billed activities cannot be deleted by non-managers
        if (
            existingActivity.billed &&
            !hasRole(user.role, "admin") &&
            !hasRole(user.role, "super_admin")
        ) {
            const isManager = await projectRepository.isProjectManager(
                existingActivity.project?.id ?? 0,
                user.id
            )
            if (!isManager) {
                throwValidationError("Access denied", [
                    {
                        field: "billed",
                        message: "Billed activities cannot be deleted",
                    },
                ])
            }
        }

        // Check 60-day lock for non-admin users
        if (!hasRole(user.role, "admin") && !hasRole(user.role, "super_admin")) {
            const activityDate = new Date(existingActivity.date)
            const daysDifference = Math.floor(
                (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysDifference > 60) {
                throwActivityLocked("Cannot delete activities older than 60 days")
            }
        }

        const deleted = await activityRepository.delete(id)

        if (!deleted) {
            throwNotFound("Activity")
        }

        return c.json({ message: "Activity deleted successfully" }, 200)
    })
