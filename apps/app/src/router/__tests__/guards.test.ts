import { describe, it, expect, beforeEach, vi } from "vitest"
import { createRouter, createMemoryHistory, type Router } from "vue-router"

const mockAuthStore = {
    isAuthenticated: false,
    isRole: vi.fn(() => false),
}

vi.mock("@/stores/auth", () => ({
    useAuthStore: () => mockAuthStore,
}))

function createTestRouter(): Router {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", name: "home", component: { template: "<div>Home</div>" } },
            {
                path: "/login",
                name: "login",
                component: { template: "<div>Login</div>" },
                meta: { requiresAuth: false },
            },
            {
                path: "/public",
                name: "public",
                component: { template: "<div>Public</div>" },
                meta: { requiresAuth: false },
            },
            {
                path: "/dashboard",
                name: "dashboard",
                component: { template: "<div>Dashboard</div>" },
                meta: { requiresAuth: true },
            },
            {
                path: "/admin",
                name: "admin",
                component: { template: "<div>Admin</div>" },
                meta: { requiresAuth: true, requiresAdmin: true },
            },
        ],
    })

    // Replicate the guard logic from router/index.ts
    router.beforeEach((to, _from, next) => {
        const requiresAuth = to.meta.requiresAuth !== false
        const requiresAdmin = to.meta.requiresAdmin === true

        if (requiresAuth && !mockAuthStore.isAuthenticated) {
            next({ name: "login" })
        } else if (requiresAdmin && !mockAuthStore.isRole("admin")) {
            next({ name: "home" })
        } else {
            next()
        }
    })

    return router
}

describe("Router Guards", () => {
    let router: Router

    beforeEach(() => {
        mockAuthStore.isAuthenticated = false
        mockAuthStore.isRole = vi.fn(() => false)
    })

    it("unauthenticated user redirected to /login", async () => {
        router = createTestRouter()
        await router.push("/dashboard")
        await router.isReady()
        expect(router.currentRoute.value.name).toBe("login")
    })

    it("authenticated user can access protected route", async () => {
        mockAuthStore.isAuthenticated = true
        router = createTestRouter()
        await router.push("/dashboard")
        await router.isReady()
        expect(router.currentRoute.value.name).toBe("dashboard")
    })

    it("non-admin redirected to /home on admin route", async () => {
        mockAuthStore.isAuthenticated = true
        mockAuthStore.isRole = vi.fn(() => false)
        router = createTestRouter()
        await router.push("/admin")
        await router.isReady()
        expect(router.currentRoute.value.name).toBe("home")
    })

    it("admin can access admin route", async () => {
        mockAuthStore.isAuthenticated = true
        mockAuthStore.isRole = vi.fn(() => true)
        router = createTestRouter()
        await router.push("/admin")
        await router.isReady()
        expect(router.currentRoute.value.name).toBe("admin")
    })

    it("public route accessible without auth", async () => {
        router = createTestRouter()
        await router.push("/public")
        await router.isReady()
        expect(router.currentRoute.value.name).toBe("public")
    })

    it("/login accessible when authenticated (no redirect loop)", async () => {
        mockAuthStore.isAuthenticated = true
        router = createTestRouter()
        await router.push("/login")
        await router.isReady()
        expect(router.currentRoute.value.name).toBe("login")
    })

    it("route without explicit requiresAuth defaults to requiring auth", async () => {
        router = createTestRouter()
        await router.push("/") // home has no meta.requiresAuth
        await router.isReady()
        expect(router.currentRoute.value.name).toBe("login")
    })
})
