import { and, eq, or } from "drizzle-orm"
import { db } from "../index"
import { users } from "../schema"
import type {
    UserResponse,
    UserCreateInput,
    UserUpdateInput,
    UserDetailResponse,
} from "@beg/validations"
import { hashPassword } from "../../tools/auth"

export const userRepository = {
    findByEmailOrInitials: async (emailOrInitials: string) => {
        const results = await db
            .select()
            .from(users)
            .where(
                and(
                    or(eq(users.email, emailOrInitials), eq(users.initials, emailOrInitials)),
                    eq(users.archived, false)
                )
            )
        return results[0] || null
    },
    findByEmail: async (email: string) => {
        const results = await db.select().from(users).where(eq(users.email, email))
        return results[0] || null
    },

    findById: async (id: number) => {
        const results = await db
            .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                initials: users.initials,
                role: users.role,
                archived: users.archived,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
                activityRates: users.activityRates,
            })
            .from(users)
            .where(eq(users.id, id))

        const result = results[0]
        if (!result) return null

        return result
    },

    findAll: async (): Promise<UserResponse[]> => {
        return await db
            .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                initials: users.initials,
                role: users.role,
                archived: users.archived,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
    },

    findAllDetails: async (): Promise<UserDetailResponse[]> => {
        return await db
            .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                initials: users.initials,
                role: users.role,
                archived: users.archived,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
                activityRates: users.activityRates,
            })
            .from(users)
    },

    create: async (userData: UserCreateInput): Promise<UserResponse> => {
        const hashedPassword = await hashPassword(userData.password)

        const [newUser] = await db
            .insert(users)
            .values({
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                initials: userData.initials,
                password: hashedPassword,
                role: userData.role,
                archived: userData.archived,
                activityRates: userData.activityRates || null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                initials: users.initials,
                role: users.role,
                archived: users.archived,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
                activityRates: users.activityRates,
            })

        return newUser
    },

    update: async (id: number, userData: Partial<UserUpdateInput>): Promise<UserResponse> => {
        const updateData: Partial<typeof users.$inferInsert> = {}

        if (userData.email) updateData.email = userData.email
        if (userData.firstName) updateData.firstName = userData.firstName
        if (userData.lastName) updateData.lastName = userData.lastName
        if (userData.initials) updateData.initials = userData.initials
        if (userData.role) updateData.role = userData.role
        if (userData.archived !== undefined) updateData.archived = userData.archived
        if (userData.activityRates !== undefined) {
            updateData.activityRates = userData.activityRates || null
        }
        updateData.updatedAt = new Date()
        if (!updateData.createdAt) {
            updateData.createdAt = new Date()
        }

        // Only hash password if it's provided
        if (userData.password) {
            updateData.password = await hashPassword(userData.password)
        }

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                initials: users.initials,
                role: users.role,
                archived: users.archived,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
                activityRates: users.activityRates,
            })

        return updatedUser
    },
}
