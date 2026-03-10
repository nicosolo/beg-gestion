import type { Context, MiddlewareHandler, Next } from "hono"
import { verifyToken } from "./auth"
import { userRepository } from "../db/repositories/user.repository"
import type { Variables } from "@src/types/global"
import { hasRole } from "@src/tools/role-middleware"

export const authMiddleware: MiddlewareHandler<{ Variables: Variables }> = async (
    c: Context<{ Variables: Variables }>,
    next: Next
) => {
    const authHeader = c.req.header("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized - Missing or invalid token format" }, 401)
    }

    const token = authHeader.split(" ")[1]
    const payload = verifyToken(token)

    if (!payload) {
        return c.json({ error: "Unauthorized - Invalid token" }, 401)
    }

    // Get user from database to ensure they still exist
    const user = await userRepository.findById(payload.id)

    if (!user) {
        return c.json({ error: "Unauthorized - User not found" }, 401)
    }

    // Add user data to the request context
    c.set("user", {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        initials: user.initials,
    })

    await next()
}

export const adminOnlyMiddleware: MiddlewareHandler<{ Variables: Variables }> = async (
    c: Context<{ Variables: Variables }>,
    next: Next
) => {
    const user = c.get("user")

    if (!user || !hasRole(user.role, "admin")) {
        return c.json({ error: "Forbidden - Admin access required" }, 403)
    }

    await next()
}
