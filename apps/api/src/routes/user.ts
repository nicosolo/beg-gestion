import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    loginSchema,
    userResponseSchema,
    userCreateSchema,
    userUpdateSchema,
    idParamSchema,
    type UserResponse,
    userDetailResponseSchema,
    loginResponseSchema,
} from "@beg/validations"
import { userRepository } from "../db/repositories/user.repository"
import { comparePassword, generateToken } from "../tools/auth"
import { authMiddleware } from "../tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import { z } from "zod"
import type { Variables } from "@src/types/global"
import { roleMiddleware } from "@src/tools/role-middleware"
import { audit } from "@src/tools/audit"

// Define users array response schema
const usersArrayResponseSchema = z.array(userResponseSchema)

// Create the app and apply auth middleware to routes that need it
export const userRoutes = new Hono<{ Variables: Variables }>()
    .post(
        "/login",
        zValidator("json", loginSchema),
        responseValidator({
            200: loginResponseSchema,
        }),
        async (c) => {
            const { email, password } = c.req.valid("json")

            const user = await userRepository.findByEmailOrInitials(email)
            if (!user) {
                audit(null, email, "login_failure", "auth", null, { reason: "unknown_user" })
                return c.json({ error: "Invalid credentials" }, 401)
            }

            const passwordMatch = await comparePassword(password, user.password)
            if (!passwordMatch) {
                audit(null, email, "login_failure", "auth", null, { reason: "wrong_password" })
                return c.json({ error: "Invalid credentials" }, 401)
            }

            // Generate JWT token
            const token = generateToken(user)
            audit(user.id, user.email, "login_success", "auth")

            return c.render(
                {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        initials: user.initials,
                        archived: user.archived,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    } as UserResponse,
                },
                200
            )
        }
    )
    .use("/*", authMiddleware)

    // Get all users (protected and requires admin role)
    .get(
        "/",
        responseValidator({
            200: usersArrayResponseSchema,
        }),
        async (c) => {
            const users = await userRepository.findAll()
            return c.render(users as UserResponse[], 200)
        }
    )

    // Get user by ID
    .get(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: userDetailResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const user = await userRepository.findById(id)
            if (!user) {
                return c.json({ error: "User not found" }, 404)
            }

            return c.render(user, 200)
        }
    )

    // Create new user
    .post(
        "/",
        roleMiddleware("admin"),
        zValidator("json", userCreateSchema),
        responseValidator({
            201: userResponseSchema,
        }),
        async (c) => {
            const userData = c.req.valid("json")
            const currentUser = c.get("user")

            if (userData.role === "super_admin" && currentUser.role !== "super_admin") {
                return c.json({
                    error: "Forbidden - Only a super_admin can assign the super_admin role",
                }, 403)
            }

            // Check if user with this email already exists
            const existingUser = await userRepository.findByEmail(userData.email)
            if (existingUser) {
                return c.json({ error: "User with this email already exists" }, 400)
            }

            const newUser = await userRepository.create(userData)
            audit(currentUser.id, currentUser.email, "create", "user", newUser.id, { name: `${newUser.firstName} ${newUser.lastName}` })
            return c.render(newUser, 201)
        }
    )

    // Update user
    .put(
        "/:id",
        roleMiddleware("admin"),
        zValidator("param", idParamSchema),
        zValidator("json", userUpdateSchema),
        responseValidator({
            200: userResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const userData = c.req.valid("json")
            const currentUser = c.get("user")

            // Check if user exists
            const existingUser = await userRepository.findById(id)
            if (!existingUser) {
                return c.json({ error: "User not found" }, 404)
            }

            if (existingUser.role === "super_admin" && currentUser.role !== "super_admin") {
                return c.json({
                    error: "Forbidden - Only a super_admin can modify another super_admin",
                }, 403)
            }

            if (userData.role === "super_admin" && currentUser.role !== "super_admin") {
                return c.json({
                    error: "Forbidden - Only a super_admin can assign the super_admin role",
                }, 403)
            }

            // Check if email is being changed and if it's already taken
            if (userData.email && userData.email !== existingUser.email) {
                const emailExists = await userRepository.findByEmail(userData.email)
                if (emailExists) {
                    return c.json({ error: "Email already taken" }, 400)
                }
            }

            const updatedUser = await userRepository.update(id, userData)
            audit(currentUser.id, currentUser.email, "update", "user", id, { name: `${updatedUser.firstName} ${updatedUser.lastName}` })
            return c.render(updatedUser, 200)
        }
    )
