import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { companyRoutes } = await import("../company")

const app = new Hono().onError(errorHandler).route("/company", companyRoutes)

let adminToken: string
let userToken: string

beforeAll(async () => {
	const seed = await seedUsers(db)
	adminToken = seed.adminToken
	userToken = seed.userToken
})

const jsonHeaders = (token?: string) => {
	const h: Record<string, string> = { "Content-Type": "application/json" }
	if (token) h["Authorization"] = `Bearer ${token}`
	return h
}

describe("GET /company", () => {
	test("with auth returns 200 and paginated response", async () => {
		const res = await app.request("/company", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data).toBeDefined()
		expect(Array.isArray(body.data)).toBe(true)
		expect(typeof body.total).toBe("number")
		expect(typeof body.page).toBe("number")
		expect(typeof body.limit).toBe("number")
		expect(typeof body.totalPages).toBe("number")
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/company")
		expect(res.status).toBe(401)
	})
})

describe("GET /company/:id", () => {
	test("returns company by id", async () => {
		const createRes = await app.request("/company", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Get Test Company" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/company/${created.id}`, {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(created.id)
		expect(body.name).toBe("Get Test Company")
		expect(body.createdAt).toBeDefined()
		expect(body.updatedAt).toBeDefined()
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/company/99999", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/company/1")
		expect(res.status).toBe(401)
	})
})

describe("POST /company", () => {
	test("admin creates company returns 200", async () => {
		const res = await app.request("/company", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "New Company" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("New Company")
		expect(body.id).toBeDefined()
		expect(body.createdAt).toBeDefined()
		expect(body.updatedAt).toBeDefined()
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/company", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ name: "Forbidden Company" }),
		})
		expect(res.status).toBe(403)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/company", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "No Auth Company" }),
		})
		expect(res.status).toBe(401)
	})
})

describe("PUT /company/:id", () => {
	test("admin updates company returns 200", async () => {
		const createRes = await app.request("/company", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Before Update" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/company/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "After Update" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("After Update")
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/company/1", {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ name: "Hacked" }),
		})
		expect(res.status).toBe(403)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/company/1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "No Auth" }),
		})
		expect(res.status).toBe(401)
	})
})

describe("DELETE /company/:id", () => {
	test("admin deletes company returns 200", async () => {
		const createRes = await app.request("/company", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "To Delete" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/company/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.success).toBe(true)
	})

	test("admin cannot delete company with projects returns 409", async () => {
		const createRes = await app.request("/company", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Company With Project" }),
		})
		const company = await createRes.json()

		await db.insert(schema.projects).values({
			name: "Test Project",
			startDate: new Date(),
			companyId: company.id,
		})

		const res = await app.request(`/company/${company.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(409)
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/company/1", {
			method: "DELETE",
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(403)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/company/1", {
			method: "DELETE",
		})
		expect(res.status).toBe(401)
	})
})
