import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { users } from "../db/schema"
import { JWT_SECRET } from "../config"
import type { StringValue } from "ms"
import type { UserRole } from "@beg/validations"
// This should be in environment variables in a production app
const SALT_ROUNDS = 10

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, SALT_ROUNDS)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash)
}

export const generateToken = (
    user: Omit<typeof users.$inferSelect, "password">,
    expiresIn: StringValue = "30d"
): string => {
    // Remove sensitive data from token
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export const verifyToken = (
    token: string
): { id: number; email: string; role: UserRole } | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: UserRole }
    } catch {
        return null
    }
}
