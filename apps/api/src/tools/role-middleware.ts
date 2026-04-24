import type { Context, MiddlewareHandler, Next } from "hono"
import type { UserRole } from "@beg/validations"

const rolePriority: Record<UserRole, number> = {
    super_admin: 3,
    admin: 2,
    user_visa: 1.5,
    user: 1,
}

export const hasRole = (userRole: UserRole, requiredRole: UserRole) => {
    return rolePriority[userRole] >= rolePriority[requiredRole]
}

export const roleMiddleware = (requiredRole: UserRole): MiddlewareHandler => {
    return async (c: Context, next: Next) => {
        const user = c.get("user")

        if (!user) {
            return c.json({ error: "Unauthorized - Authentication required" }, 401)
        }

        if (!hasRole(user.role, requiredRole)) {
            return c.json({ error: `Forbidden - ${requiredRole} role required` }, 403)
        }

        await next()
    }
}
