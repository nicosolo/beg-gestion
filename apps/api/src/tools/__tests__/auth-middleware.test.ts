import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers } from "../../__tests__/helpers/setup"
import type { Variables } from "@src/types/global"

// 1. Create test DB before mocking
const { db, sqlite } = createTestDb()

// 2. Mock db module before dynamic imports
mock.module("../../db/index", () => ({ db, sqlite }))

// 3. Dynamic imports after mock
const { authMiddleware, adminOnlyMiddleware } = await import("../auth-middleware")
const { generateToken } = await import("../auth")

let adminToken: string
let userToken: string
let superAdminToken: string

beforeAll(async () => {
	const seeded = await seedUsers(db)
	adminToken = seeded.adminToken
	userToken = seeded.userToken
	superAdminToken = seeded.superAdminToken
})

function createApp() {
	const app = new Hono<{ Variables: Variables }>()
	app.use("*", authMiddleware)
	app.get("/protected", (c) => c.json({ user: c.get("user") }))
	return app
}

function createAdminApp() {
	const app = new Hono<{ Variables: Variables }>()
	app.use("*", authMiddleware)
	app.use("*", adminOnlyMiddleware)
	app.get("/admin", (c) => c.json({ ok: true }))
	return app
}

describe("authMiddleware", () => {
	test("401 when no Authorization header", async () => {
		const app = createApp()
		const res = await app.request("/protected")
		expect(res.status).toBe(401)
		const body = await res.json()
		expect(body.error).toContain("Missing or invalid token format")
	})

	test("401 when Authorization header missing Bearer prefix", async () => {
		const app = createApp()
		const res = await app.request("/protected", {
			headers: { Authorization: "Token abc123" },
		})
		expect(res.status).toBe(401)
		const body = await res.json()
		expect(body.error).toContain("Missing or invalid token format")
	})

	test("401 for invalid token", async () => {
		const app = createApp()
		const res = await app.request("/protected", {
			headers: { Authorization: "Bearer invalid.token.here" },
		})
		expect(res.status).toBe(401)
		const body = await res.json()
		expect(body.error).toContain("Invalid token")
	})

	test("401 when user not found in DB", async () => {
		const app = createApp()
		// Generate a token for a non-existent user
		const fakeToken = generateToken({
			id: 99999,
			email: "ghost@test.com",
			firstName: "Ghost",
			lastName: "User",
			initials: "GU",
			role: "user",
			archived: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		const res = await app.request("/protected", {
			headers: { Authorization: `Bearer ${fakeToken}` },
		})
		expect(res.status).toBe(401)
		const body = await res.json()
		expect(body.error).toContain("User not found")
	})

	test("sets user context and calls next for valid token", async () => {
		const app = createApp()
		const res = await app.request("/protected", {
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.user).toBeDefined()
		expect(body.user.email).toBe("user@test.com")
		expect(body.user.name).toBe("User Test")
		expect(body.user.role).toBe("user")
		expect(body.user.firstName).toBe("User")
		expect(body.user.lastName).toBe("Test")
	})
})

describe("adminOnlyMiddleware", () => {
	test("403 for user role", async () => {
		const app = createAdminApp()
		const res = await app.request("/admin", {
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(403)
		const body = await res.json()
		expect(body.error).toContain("Admin access required")
	})

	test("passes for admin role", async () => {
		const app = createAdminApp()
		const res = await app.request("/admin", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.ok).toBe(true)
	})

	test("passes for super_admin role", async () => {
		const app = createAdminApp()
		const res = await app.request("/admin", {
			headers: { Authorization: `Bearer ${superAdminToken}` },
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.ok).toBe(true)
	})
})
