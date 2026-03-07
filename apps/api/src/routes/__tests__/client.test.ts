import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { clientRoutes } = await import("../client")

const app = new Hono().onError(errorHandler).route("/client", clientRoutes)

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

describe("GET /client", () => {
	test("with auth returns 200 and paginated response", async () => {
		const res = await app.request("/client", {
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
		const res = await app.request("/client")
		expect(res.status).toBe(401)
	})
})

describe("GET /client/:id", () => {
	test("returns client by id", async () => {
		// Create a client first
		const createRes = await app.request("/client", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Get Test Client" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/client/${created.id}`, {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(created.id)
		expect(body.name).toBe("Get Test Client")
		expect(body.createdAt).toBeDefined()
		expect(body.updatedAt).toBeDefined()
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/client/99999", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/client/1")
		expect(res.status).toBe(401)
	})
})

describe("POST /client", () => {
	test("admin creates client returns 200", async () => {
		const res = await app.request("/client", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "New Client" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("New Client")
		expect(body.id).toBeDefined()
		expect(body.createdAt).toBeDefined()
		expect(body.updatedAt).toBeDefined()
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/client", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ name: "Forbidden Client" }),
		})
		expect(res.status).toBe(403)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/client", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "No Auth Client" }),
		})
		expect(res.status).toBe(401)
	})
})

describe("PUT /client/:id", () => {
	test("admin updates client returns 200", async () => {
		// Create a client first
		const createRes = await app.request("/client", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Before Update" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/client/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "After Update" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("After Update")
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/client/1", {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ name: "Hacked" }),
		})
		expect(res.status).toBe(403)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/client/1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "No Auth" }),
		})
		expect(res.status).toBe(401)
	})
})

describe("DELETE /client/:id", () => {
	test("admin deletes client returns 200", async () => {
		// Create a client with no dependencies
		const createRes = await app.request("/client", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "To Delete" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/client/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.success).toBe(true)
	})

	test("admin cannot delete client with projects returns 409", async () => {
		// Create client then attach a project
		const createRes = await app.request("/client", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Client With Project" }),
		})
		const client = await createRes.json()

		await db.insert(schema.projects).values({
			name: "Test Project",
			startDate: new Date(),
			clientId: client.id,
		})

		const res = await app.request(`/client/${client.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(409)
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/client/1", {
			method: "DELETE",
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(403)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/client/1", {
			method: "DELETE",
		})
		expect(res.status).toBe(401)
	})
})
