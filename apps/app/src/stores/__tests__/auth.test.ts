import { describe, it, expect, vi, beforeEach } from "vitest"
import type { UserResponse } from "@beg/validations"

// Provide a proper localStorage implementation before any module imports
const storage = new Map<string, string>()
const localStorageMock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    get length() {
        return storage.size
    },
    key: (index: number) => [...storage.keys()][index] ?? null,
}
vi.stubGlobal("localStorage", localStorageMock)

const mockPostLogin = vi.hoisted(() => vi.fn())
const mockLoginError = vi.hoisted(() => ({ value: null as string | null }))
const mockLoginData = vi.hoisted(
    () =>
        ({
            value: null as { token: string; user: UserResponse } | null,
        }),
)

vi.mock("@/composables/api/useLogin", () => ({
    useLogin: () => ({
        post: mockPostLogin,
        error: mockLoginError,
        data: mockLoginData,
    }),
}))

const mockUser: UserResponse = {
    id: 1,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    initials: "TU",
    role: "admin",
    archived: false,
    createdAt: null,
    updatedAt: null,
}

describe("useAuthStore", () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        storage.clear()
        mockLoginError.value = null
        mockLoginData.value = null

        // Reset module registry so store factory re-runs with fresh localStorage
        vi.resetModules()

        const { setActivePinia, createPinia } = await import("pinia")
        setActivePinia(createPinia())
    })

    async function getStore() {
        const { useAuthStore } = await import("../auth")
        return useAuthStore()
    }

    describe("login", () => {
        it("stores token + user on success", async () => {
            mockPostLogin.mockImplementation(async () => {
                mockLoginData.value = { token: "abc123", user: mockUser }
            })

            const store = await getStore()
            const result = await store.login("test@example.com", "password")

            expect(result).toBe(true)
            expect(store.token).toBe("abc123")
            expect(store.user).toEqual(mockUser)
            expect(store.isAuthenticated).toBe(true)
            expect(localStorage.getItem("auth_token")).toBe("abc123")
            expect(localStorage.getItem("auth_user")).toBe(
                JSON.stringify(mockUser),
            )
        })

        it("calls postLogin with email and password", async () => {
            mockPostLogin.mockImplementation(async () => {
                mockLoginData.value = { token: "t", user: mockUser }
            })

            const store = await getStore()
            await store.login("foo@bar.com", "secret")

            expect(mockPostLogin).toHaveBeenCalledWith({
                body: { email: "foo@bar.com", password: "secret" },
            })
        })

        it("returns false on login error", async () => {
            mockPostLogin.mockImplementation(async () => {
                mockLoginError.value = "Invalid credentials"
            })

            const store = await getStore()
            const result = await store.login("bad@test.com", "wrong")

            expect(result).toBe(false)
            expect(store.token).toBeNull()
            expect(store.isAuthenticated).toBe(false)
            expect(localStorage.getItem("auth_token")).toBeNull()
        })

        it("returns false when no data returned", async () => {
            mockPostLogin.mockResolvedValue(undefined)

            const store = await getStore()
            const result = await store.login("test@test.com", "pass")

            expect(result).toBe(false)
        })
    })

    describe("logout", () => {
        it("clears state and localStorage", async () => {
            storage.set("auth_token", "abc123")
            storage.set("auth_user", JSON.stringify(mockUser))

            const store = await getStore()
            expect(store.token).toBe("abc123")

            store.logout()

            expect(store.token).toBeNull()
            expect(store.user).toBeNull()
            expect(store.isAuthenticated).toBe(false)
            expect(localStorage.getItem("auth_token")).toBeNull()
            expect(localStorage.getItem("auth_user")).toBeNull()
        })
    })

    describe("getAuthHeaders", () => {
        it("returns Bearer token when authenticated", async () => {
            storage.set("auth_token", "mytoken")

            const store = await getStore()

            expect(store.getAuthHeaders()).toEqual({
                Authorization: "Bearer mytoken",
            })
        })

        it("returns empty Authorization when no token", async () => {
            const store = await getStore()

            expect(store.getAuthHeaders()).toEqual({ Authorization: "" })
        })
    })

    describe("isRole", () => {
        it("admin user passes admin check", async () => {
            storage.set(
                "auth_user",
                JSON.stringify({ ...mockUser, role: "admin" }),
            )

            const store = await getStore()

            expect(store.isRole("admin")).toBe(true)
        })

        it("user role fails admin check", async () => {
            storage.set(
                "auth_user",
                JSON.stringify({ ...mockUser, role: "user" }),
            )

            const store = await getStore()

            expect(store.isRole("admin")).toBe(false)
        })

        it("admin fails super_admin check", async () => {
            storage.set(
                "auth_user",
                JSON.stringify({ ...mockUser, role: "admin" }),
            )

            const store = await getStore()

            expect(store.isRole("super_admin")).toBe(false)
        })

        it("super_admin passes all role checks", async () => {
            storage.set(
                "auth_user",
                JSON.stringify({ ...mockUser, role: "super_admin" }),
            )

            const store = await getStore()

            expect(store.isRole("super_admin")).toBe(true)
            expect(store.isRole("admin")).toBe(true)
            expect(store.isRole("user_visa")).toBe(true)
            expect(store.isRole("user")).toBe(true)
        })

        it("user_visa passes user check but fails admin", async () => {
            storage.set(
                "auth_user",
                JSON.stringify({ ...mockUser, role: "user_visa" }),
            )

            const store = await getStore()

            expect(store.isRole("user")).toBe(true)
            expect(store.isRole("user_visa")).toBe(true)
            expect(store.isRole("admin")).toBe(false)
            expect(store.isRole("super_admin")).toBe(false)
        })

        it("user role fails user_visa check", async () => {
            storage.set(
                "auth_user",
                JSON.stringify({ ...mockUser, role: "user" }),
            )

            const store = await getStore()

            expect(store.isRole("user_visa")).toBe(false)
        })

        it("returns false when no user", async () => {
            const store = await getStore()

            expect(store.isRole("user")).toBe(false)
        })
    })

    describe("hydration from localStorage", () => {
        it("loads token from localStorage on init", async () => {
            storage.set("auth_token", "stored-token")

            const store = await getStore()

            expect(store.token).toBe("stored-token")
            expect(store.isAuthenticated).toBe(true)
        })

        it("loads user from localStorage on init", async () => {
            storage.set("auth_user", JSON.stringify(mockUser))

            const store = await getStore()

            expect(store.user).toEqual(mockUser)
        })

        it("handles invalid JSON in stored user gracefully", async () => {
            storage.set("auth_user", "not-json")

            const store = await getStore()

            expect(store.user).toBeNull()
            expect(localStorage.getItem("auth_user")).toBeNull()
        })

        it("starts unauthenticated with empty localStorage", async () => {
            const store = await getStore()

            expect(store.token).toBeNull()
            expect(store.user).toBeNull()
            expect(store.isAuthenticated).toBe(false)
        })
    })
})
