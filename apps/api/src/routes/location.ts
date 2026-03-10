import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    locationSchema,
    locationCreateSchema,
    locationUpdateSchema,
    locationFilterSchema,
    createPageResponseSchema,
    idParamSchema,
    successSchema,
    ErrorCode,
} from "@beg/validations"
import { locationRepository } from "../db/repositories/location.repository"
import { authMiddleware } from "../tools/auth-middleware"
import { roleMiddleware } from "../tools/role-middleware"
import { responseValidator } from "../tools/response-validator"
import { ApiException } from "../tools/error-handler"
import { audit } from "../tools/audit"
import type { Variables } from "@src/types/global"

const locationResponseArraySchema = createPageResponseSchema(locationSchema)

export const locationRoutes = new Hono<{ Variables: Variables }>()
    // Get all locations (no auth required)
    .get(
        "/",
        zValidator("query", locationFilterSchema),
        responseValidator({
            200: locationResponseArraySchema,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const result = await locationRepository.findAll(filter)
            return c.render(result, 200)
        }
    )

    // Get location by ID (no auth required)
    .get(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: locationSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const location = await locationRepository.findById(id)
            if (!location) {
                return c.json({ error: "Location not found" }, 404)
            }
            return c.render(location, 200)
        }
    )

    // Create location (admin only)
    .post(
        "/",
        authMiddleware,
        roleMiddleware("admin"),
        zValidator("json", locationCreateSchema),
        responseValidator({
            201: locationSchema,
        }),
        async (c) => {
            const locationData = c.req.valid("json")
            const newLocation = await locationRepository.create(locationData)
            const user = c.get("user")
            audit(user.id, user.initials, "create", "location", newLocation.id, { name: newLocation.name })
            return c.render(newLocation, 201)
        }
    )

    // Update location (admin only)
    .put(
        "/:id",
        authMiddleware,
        roleMiddleware("admin"),
        zValidator("param", idParamSchema),
        zValidator("json", locationUpdateSchema),
        responseValidator({
            200: locationSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const locationData = c.req.valid("json")

            // Check if location exists
            const existingLocation = await locationRepository.findById(id)
            if (!existingLocation) {
                return c.json({ error: "Location not found" }, 404)
            }

            const updatedLocation = await locationRepository.update(id, locationData)
            if (!updatedLocation) {
                return c.json({ error: "Failed to update location" }, 500)
            }

            const user = c.get("user")
            audit(user.id, user.initials, "update", "location", id, { name: updatedLocation.name })
            return c.render(updatedLocation, 200)
        }
    )

    // Delete location (admin only)
    .delete(
        "/:id",
        authMiddleware,
        roleMiddleware("admin"),
        zValidator("param", idParamSchema),
        responseValidator({
            204: successSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")

            // Check if location exists
            const existingLocation = await locationRepository.findById(id)
            if (!existingLocation) {
                throw new ApiException(404, ErrorCode.NOT_FOUND, "Location not found")
            }

            // Check if location has associated projects
            const hasProjects = await locationRepository.hasProjects(id)
            if (hasProjects) {
                throw new ApiException(
                    409,
                    ErrorCode.CONSTRAINT_VIOLATION,
                    "Cannot delete location with existing projects"
                )
            }

            const deleted = await locationRepository.delete(id)
            if (!deleted) {
                throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to delete location")
            }

            const user = c.get("user")
            audit(user.id, user.initials, "delete", "location", id, { name: existingLocation.name })
            return c.render({ success: true }, 204)
        }
    )
