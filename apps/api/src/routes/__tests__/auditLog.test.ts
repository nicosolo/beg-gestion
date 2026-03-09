import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

// Create in-memory test DB
const { db, sqlite } = createTestDb()

// Mock db module BEFORE dynamic imports
mock.module("../../db/index", () => ({ db, sqlite }))

// Dynamic import routes AFTER mock
const { auditLogRoutes } = await import("../auditLog")
const { userRoutes } = await import("../user")

// Build test app
const app = new Hono()
	.onError(errorHandler)
	.route("/audit-log", auditLogRoutes)
	.route("/user", userRoutes)

let superAdminToken: string
let adminToken: string
let userToken: string
let adminId: number

beforeAll(async () => {
	const seed = await seedUsers(db)
	superAdminToken = seed.superAdminToken
	adminToken = seed.adminToken
	userToken = seed.userToken
	adminId = seed.admin.id

	// Seed some audit logs
	await db.insert(schema.auditLogs).values([
		{
			userId: seed.admin.id,
			userEmail: "admin@test.com",
			action: "create",
			entity: "project",
			entityId: 1,
			meta: { name: "Test Project" },
		},
		{
			userId: seed.admin.id,
			userEmail: "admin@test.com",
			action: "update",
			entity: "project",
			entityId: 1,
			meta: { name: "Test Project Updated" },
		},
		{
			userId: null,
			userEmail: "unknown@test.com",
			action: "login_failure",
			entity: "auth",
			entityId: null,
			meta: { reason: "unknown_user" },
		},
		{
			userId: seed.user.id,
			userEmail: "user@test.com",
			action: "login_success",
			entity: "auth",
			entityId: null,
			meta: null,
		},
		{
			userId: seed.admin.id,
			userEmail: "admin@test.com",
			action: "delete",
			entity: "client",
			entityId: 5,
			meta: { name: "Old Client" },
		},
	])
})

const jsonHeaders = (token?: string) => {
	const h: Record<string, string> = { "Content-Type": "application/json" }
	if (token) h["Authorization"] = `Bearer ${token}`
	return h
}

describe("GET /audit-log", () => {
	test("no auth returns 401", async () => {
		const res = await app.request("/audit-log")
		expect(res.status).toBe(401)
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/audit-log", {
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(403)
	})

	test("admin returns paginated logs", async () => {
		const res = await app.request("/audit-log", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data).toBeDefined()
		expect(Array.isArray(body.data)).toBe(true)
		expect(body.total).toBeGreaterThanOrEqual(5)
		expect(body.page).toBe(1)
		expect(body.limit).toBe(20)
		expect(body.totalPages).toBeGreaterThanOrEqual(1)
	})

	test("super_admin returns paginated logs", async () => {
		const res = await app.request("/audit-log", {
			headers: { Authorization: `Bearer ${superAdminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data.length).toBeGreaterThanOrEqual(5)
	})

	test("filter by entity", async () => {
		const res = await app.request("/audit-log?entity=project", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data.length).toBe(2)
		expect(body.data.every((l: Record<string, unknown>) => l.entity === "project")).toBe(true)
	})

	test("filter by action", async () => {
		const res = await app.request("/audit-log?action=login_failure", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data.length).toBe(1)
		expect(body.data[0].action).toBe("login_failure")
	})

	test("filter by userId", async () => {
		const res = await app.request(`/audit-log?userId=${adminId}`, {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data.every((l: Record<string, unknown>) => l.userId === adminId)).toBe(true)
	})

	test("pagination works", async () => {
		const res = await app.request("/audit-log?page=1&limit=2", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data.length).toBe(2)
		expect(body.limit).toBe(2)
		expect(body.totalPages).toBeGreaterThanOrEqual(3)
	})

	test("ordered by createdAt desc", async () => {
		const res = await app.request("/audit-log", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const body = await res.json()
		const dates = body.data.map((l: Record<string, unknown>) => new Date(l.createdAt).getTime())
		for (let i = 1; i < dates.length; i++) {
			expect(dates[i]).toBeLessThanOrEqual(dates[i - 1])
		}
	})
})

describe("audit helper via login", () => {
	test("successful login creates audit log", async () => {
		// Get count before
		const beforeRes = await app.request("/audit-log?action=login_success", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const beforeBody = await beforeRes.json()
		const countBefore = beforeBody.total

		// Login
		await app.request("/user/login", {
			method: "POST",
			headers: jsonHeaders(),
			body: JSON.stringify({ email: "admin@test.com", password: "password123" }),
		})

		// Get count after
		const afterRes = await app.request("/audit-log?action=login_success", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const afterBody = await afterRes.json()
		expect(afterBody.total).toBe(countBefore + 1)
	})

	test("failed login creates audit log", async () => {
		const beforeRes = await app.request("/audit-log?action=login_failure", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const beforeBody = await beforeRes.json()
		const countBefore = beforeBody.total

		await app.request("/user/login", {
			method: "POST",
			headers: jsonHeaders(),
			body: JSON.stringify({ email: "admin@test.com", password: "wrongpassword" }),
		})

		const afterRes = await app.request("/audit-log?action=login_failure", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const afterBody = await afterRes.json()
		expect(afterBody.total).toBe(countBefore + 1)
	})
})
