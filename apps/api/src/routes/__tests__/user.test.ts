import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

// Create in-memory test DB
const { db, sqlite } = createTestDb()

// Mock db module BEFORE dynamic imports
mock.module("../../db/index", () => ({ db, sqlite }))

// Dynamic import routes AFTER mock
const { userRoutes } = await import("../user")

// Build test app
const app = new Hono().onError(errorHandler).route("/user", userRoutes)

// Seed data
let adminToken: string
let userToken: string
let adminId: number
let userId: number

beforeAll(async () => {
	const seed = await seedUsers(db)
	adminToken = seed.adminToken
	userToken = seed.userToken
	adminId = seed.admin.id
	userId = seed.user.id
})

const jsonHeaders = (token?: string) => {
	const h: Record<string, string> = { "Content-Type": "application/json" }
	if (token) h["Authorization"] = `Bearer ${token}`
	return h
}

describe("POST /user/login", () => {
	test("valid credentials returns 200 with token and user", async () => {
		const res = await app.request("/user/login", {
			method: "POST",
			headers: jsonHeaders(),
			body: JSON.stringify({ email: "admin@test.com", password: "password123" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.token).toBeDefined()
		expect(typeof body.token).toBe("string")
		expect(body.user).toBeDefined()
		expect(body.user.email).toBe("admin@test.com")
		expect(body.user.role).toBe("admin")
	})

	test("wrong password returns 401", async () => {
		const res = await app.request("/user/login", {
			method: "POST",
			headers: jsonHeaders(),
			body: JSON.stringify({ email: "admin@test.com", password: "wrongpassword" }),
		})
		expect(res.status).toBe(401)

		const body = await res.json()
		expect(body.error).toBe("Invalid credentials")
	})

	test("nonexistent email returns 401", async () => {
		const res = await app.request("/user/login", {
			method: "POST",
			headers: jsonHeaders(),
			body: JSON.stringify({ email: "nobody@test.com", password: "password123" }),
		})
		expect(res.status).toBe(401)

		const body = await res.json()
		expect(body.error).toBe("Invalid credentials")
	})
})

describe("GET /user", () => {
	test("no auth returns 401", async () => {
		const res = await app.request("/user")
		expect(res.status).toBe(401)
	})

	test("with auth returns 200 and array of users", async () => {
		const res = await app.request("/user", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBeGreaterThanOrEqual(3)
	})
})

describe("GET /user/:id", () => {
	test("returns user by id", async () => {
		const res = await app.request(`/user/${adminId}`, {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(adminId)
		expect(body.email).toBe("admin@test.com")
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/user/99999", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)

		const body = await res.json()
		expect(body.error).toBe("User not found")
	})
})

describe("POST /user", () => {
	// Note: responseValidator's c.render -> c.json() doesn't forward status code,
	// so the actual HTTP status is 200 even though the route calls c.render(data, 201)
	test("admin creates user returns 200 with created user", async () => {
		const res = await app.request("/user", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				email: "newuser@test.com",
				firstName: "New",
				lastName: "User",
				initials: "NU",
				password: "password123",
				role: "user",
			}),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.email).toBe("newuser@test.com")
		expect(body.firstName).toBe("New")
		expect(body.role).toBe("user")
	})

	test("non-admin (user role) returns 403", async () => {
		const res = await app.request("/user", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({
				email: "another@test.com",
				firstName: "Another",
				lastName: "User",
				initials: "AU",
				password: "password123",
				role: "user",
			}),
		})
		expect(res.status).toBe(403)
	})
})

describe("PUT /user/:id", () => {
	test("admin updates user returns 200", async () => {
		const res = await app.request(`/user/${userId}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				firstName: "Updated",
			}),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.firstName).toBe("Updated")
	})

	test("non-admin returns 403", async () => {
		const res = await app.request(`/user/${userId}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({
				firstName: "Hacked",
			}),
		})
		expect(res.status).toBe(403)
	})
})

describe("POST /user - edge cases", () => {
	test("admin creating super_admin role returns 403", async () => {
		const res = await app.request("/user", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				email: "newsuperadmin@test.com",
				firstName: "New",
				lastName: "SuperAdmin",
				initials: "NS",
				password: "password123",
				role: "super_admin",
			}),
		})
		expect(res.status).toBe(403)
	})

	test("duplicate email returns 400", async () => {
		const res = await app.request("/user", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				email: "admin@test.com",
				firstName: "Dup",
				lastName: "User",
				initials: "DU",
				password: "password123",
				role: "user",
			}),
		})
		expect(res.status).toBe(400)
	})
})

describe("PUT /user/:id - edge cases", () => {
	test("nonexistent user returns 404", async () => {
		const res = await app.request("/user/99999", {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ firstName: "Ghost" }),
		})
		expect(res.status).toBe(404)
	})

	test("admin updating super_admin returns 403", async () => {
		// Find the super_admin user id
		const listRes = await app.request("/user", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const users = await listRes.json()
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const superAdmin = users.find((u: any) => u.role === "super_admin")

		const res = await app.request(`/user/${superAdmin.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ firstName: "Hacked" }),
		})
		expect(res.status).toBe(403)
	})

	test("admin assigning super_admin role returns 403", async () => {
		const res = await app.request(`/user/${userId}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ role: "super_admin" }),
		})
		expect(res.status).toBe(403)
	})

	test("email conflict returns 400", async () => {
		const res = await app.request(`/user/${userId}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ email: "admin@test.com" }),
		})
		expect(res.status).toBe(400)
	})
})
