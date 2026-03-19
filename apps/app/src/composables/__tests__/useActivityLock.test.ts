import { describe, it, expect, vi, beforeEach } from "vitest"
import type { UserResponse, ActivityResponse } from "@beg/validations"

const mockUser = { value: null as UserResponse | null }

vi.mock("@/stores/auth", () => ({
    useAuthStore: () => ({
        user: mockUser.value,
    }),
}))

import { useActivityLock } from "@/composables/utils/useActivityLock"

function makeUser(role: "user" | "admin" | "super_admin"): UserResponse {
    return {
        id: 1,
        email: "test@test.com",
        name: "Test",
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    } as UserResponse
}

function makeActivity(daysAgo: number, overrides: Partial<ActivityResponse> = {}): ActivityResponse {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    return {
        id: 1,
        date: date.toISOString(),
        billed: false,
        userProjectRole: "member",
        ...overrides,
    } as ActivityResponse
}

describe("useActivityLock", () => {
    beforeEach(() => {
        mockUser.value = null
    })

    describe("isActivityLocked", () => {
        it("recent date with user role → not locked", () => {
            mockUser.value = makeUser("user")
            const { isActivityLocked } = useActivityLock()

            expect(isActivityLocked(makeActivity(10))).toBe(false)
        })

        it("old date (>60 days) with user role → locked", () => {
            mockUser.value = makeUser("user")
            const { isActivityLocked } = useActivityLock()

            expect(isActivityLocked(makeActivity(61))).toBe(true)
        })

        it("exactly 60 days with user role → not locked", () => {
            mockUser.value = makeUser("user")
            const { isActivityLocked } = useActivityLock()

            expect(isActivityLocked(makeActivity(60))).toBe(false)
        })

        it("old date with admin role → not locked (admin bypass)", () => {
            mockUser.value = makeUser("admin")
            const { isActivityLocked } = useActivityLock()

            expect(isActivityLocked(makeActivity(100))).toBe(false)
        })

        it("old date with super_admin role → not locked", () => {
            mockUser.value = makeUser("super_admin")
            const { isActivityLocked } = useActivityLock()

            expect(isActivityLocked(makeActivity(100))).toBe(false)
        })

        it("accepts string date", () => {
            mockUser.value = makeUser("user")
            const { isActivityLocked } = useActivityLock()

            const oldDate = new Date()
            oldDate.setDate(oldDate.getDate() - 90)
            expect(isActivityLocked({ date: oldDate.toISOString() })).toBe(true)
        })
    })

    describe("canEditActivity", () => {
        it("returns true for recent activity", () => {
            mockUser.value = makeUser("user")
            const { canEditActivity } = useActivityLock()

            expect(canEditActivity(makeActivity(10))).toBe(true)
        })

        it("returns false for locked activity", () => {
            mockUser.value = makeUser("user")
            const { canEditActivity } = useActivityLock()

            expect(canEditActivity(makeActivity(61))).toBe(false)
        })
    })

    describe("canDeleteActivity", () => {
        it("returns true for recent activity", () => {
            mockUser.value = makeUser("user")
            const { canDeleteActivity } = useActivityLock()

            expect(canDeleteActivity(makeActivity(10))).toBe(true)
        })

        it("returns false for locked activity", () => {
            mockUser.value = makeUser("user")
            const { canDeleteActivity } = useActivityLock()

            expect(canDeleteActivity(makeActivity(61))).toBe(false)
        })

        it("admin can delete old activity", () => {
            mockUser.value = makeUser("admin")
            const { canDeleteActivity } = useActivityLock()

            expect(canDeleteActivity(makeActivity(100))).toBe(true)
        })
    })

    describe("canToggleBilled", () => {
        it("admin → true", () => {
            mockUser.value = makeUser("admin")
            const { canToggleBilled } = useActivityLock()

            expect(canToggleBilled(makeActivity(0))).toBe(true)
        })

        it("super_admin → true", () => {
            mockUser.value = makeUser("super_admin")
            const { canToggleBilled } = useActivityLock()

            expect(canToggleBilled(makeActivity(0))).toBe(true)
        })

        it("user with manager project role → true", () => {
            mockUser.value = makeUser("user")
            const { canToggleBilled } = useActivityLock()

            expect(canToggleBilled(makeActivity(0, { userProjectRole: "manager" }))).toBe(true)
        })

        it("user with member project role → false", () => {
            mockUser.value = makeUser("user")
            const { canToggleBilled } = useActivityLock()

            expect(canToggleBilled(makeActivity(0, { userProjectRole: "member" }))).toBe(false)
        })
    })

    describe("isBilledLocked", () => {
        it("unbilled activity → not locked", () => {
            mockUser.value = makeUser("user")
            const { isBilledLocked } = useActivityLock()

            expect(isBilledLocked(makeActivity(0, { billed: false }))).toBe(false)
        })

        it("billed + user without toggle permission → locked", () => {
            mockUser.value = makeUser("user")
            const { isBilledLocked } = useActivityLock()

            expect(isBilledLocked(makeActivity(0, { billed: true, userProjectRole: "member" }))).toBe(true)
        })

        it("billed + admin → not locked", () => {
            mockUser.value = makeUser("admin")
            const { isBilledLocked } = useActivityLock()

            expect(isBilledLocked(makeActivity(0, { billed: true }))).toBe(false)
        })
    })
})
