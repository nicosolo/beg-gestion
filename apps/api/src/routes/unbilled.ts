import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import {
    UnbilledActivitiesResponseSchema,
    type UnbilledActivitiesResponse,
    type RateItem,
    type ClassSchema,
} from "@beg/validations"
import { activityRepository } from "../db/repositories/activity.repository"
import { projectRepository } from "../db/repositories/project.repository"
import { authMiddleware } from "../tools/auth-middleware"
import { responseValidator } from "../tools/response-validator"
import type { Variables } from "../types/global"
import { userRepository } from "@src/db/repositories/user.repository"

const app = new Hono<{ Variables: Variables }>()

// Get unbilled activities with calculations for a project
app.get(
    "/project/:projectId",
    authMiddleware,
    zValidator(
        "param",
        z.object({
            projectId: z.string().transform((val) => parseInt(val, 10)),
        })
    ),
    zValidator(
        "query",
        z.object({
            periodStart: z.string().optional(),
            periodEnd: z.string().optional(),
        })
    ),
    responseValidator({ 200: UnbilledActivitiesResponseSchema }),
    async (c) => {
        const { projectId } = c.req.valid("param")
        const query = c.req.valid("query")
        const user = c.get("user")

        // Parse dates if provided
        const periodStart = query.periodStart ? new Date(query.periodStart) : null
        const periodEnd = query.periodEnd ? new Date(query.periodEnd) : null

        // Get project to get start date
        const project = await projectRepository.findById(projectId)
        if (!project) {
            return c.json({ error: "Project not found" }, 404)
        }

        // Fetch activities within period for calculation
        const activitiesInPeriod = await activityRepository.findAll(user, {
            projectId,
            sortBy: "date",
            sortOrder: "asc",
            page: 1,
            limit: 10000,
            includeBilled: false,
            includeUnbilled: true,
            fromDate: periodStart || undefined,
            toDate: periodEnd || undefined,
        })

        // Filter to only unbilled activities
        const activitiesForCalculation = activitiesInPeriod.data

        const allUsers = await userRepository.findAllDetails()
        const userMap = new Map<number, (typeof allUsers)[0]>(allUsers.map((u) => [u.id, u]))
        // Calculate totals by rate class
        const rateClassTotals = new Map<string, RateItem>()
        let totalKilometers = 0
        let totalExpenses = 0
        let totalDisbursements = 0

        // Calculate period from filtered activities or use provided period
        let periodStartDate: Date | null = periodStart
        let periodEndDate: Date = new Date(periodEnd || Date.now())

        // If no period provided, calculate from filtered activities
        if (!periodStart && !periodEnd && activitiesForCalculation.length > 0) {
            const dates = activitiesForCalculation.map((a) => new Date(a.date).getTime())
            periodStartDate = new Date(Math.min(...dates))
            periodEndDate = new Date(Math.max(...dates))
        }

        // Process activities (use filtered activities for calculation)
        for (const activity of activitiesForCalculation) {
            // Get user's rate class for this activity type
            let rateClass = "" // Default
            const activitiesRates = activity.user?.id
                ? userMap.get(activity.user?.id)?.activityRates
                : null
            if (activitiesRates) {
                const userClass = activitiesRates.find(
                    (rate) => rate.activityId === activity.activityType?.id
                )
                if (userClass) {
                    rateClass = userClass.class
                }
            }

            // Initialize rate class totals if not exists
            if (!rateClassTotals.has(rateClass)) {
                rateClassTotals.set(rateClass, {
                    rateClass,
                    base: 0,
                    adjusted: 0,
                    hourlyRate: 0,
                    amount: 0,
                })
            }

            const classTotals = rateClassTotals.get(rateClass)!

            // Add duration to the rate class (duration is in minutes)
            classTotals.base += activity.duration
            classTotals.adjusted += activity.duration
            // Sum up kilometers and expenses
            totalKilometers += activity.kilometers || 0
            totalExpenses += activity.expenses || 0

            if (activity.disbursement) {
                totalDisbursements += activity.expenses || 0
            }
        }

        // Define all possible rate classes
        const allRateClasses: ClassSchema[] = ["A", "B", "C", "D", "E", "F", "G", "R", "Z"]

        // Ensure all rate classes are present in the response
        const rates: RateItem[] = allRateClasses.map((rateClass) => {
            const existingRate = rateClassTotals.get(rateClass)
            if (existingRate) {
                return existingRate
            }
            // Return empty rate for classes with no activities
            return {
                rateClass,
                base: 0,
                adjusted: 0,
                hourlyRate: 0,
                amount: 0,
            }
        })

        // Get activity IDs for marking as billed later (only from filtered activities)
        const activityIds = activitiesForCalculation.map((a) => a.id)

        const response: UnbilledActivitiesResponse = {
            rates,
            totalKilometers,
            totalExpenses,
            totalDisbursements,
            activityIds,
            periodStart: periodStartDate,
            periodEnd: periodEndDate,
            expensesTravelRate: 0.7,
        }

        return c.json(response)
    }
)

export default app
