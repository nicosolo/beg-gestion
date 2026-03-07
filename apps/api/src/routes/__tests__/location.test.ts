import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { locationRoutes } = await import("../location")
const app = new Hono().onError(errorHandler).route("/location", locationRoutes)

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

describe("GET /location", () => {
	test("no auth returns 200 (public endpoint)", async () => {
		const res = await app.request("/location")
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data).toBeDefined()
		expect(Array.isArray(body.data)).toBe(true)
		expect(body.total).toBeDefined()
		expect(body.page).toBeDefined()
		expect(body.limit).toBeDefined()
		expect(body.totalPages).toBeDefined()
	})
})

describe("GET /location/:id", () => {
	test("no auth returns 200 for existing location", async () => {
		// Create a location first via admin
		const createRes = await app.request("/location", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Lausanne", country: "CH", canton: "VD" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/location/${created.id}`)
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(created.id)
		expect(body.name).toBe("Lausanne")
		expect(body.country).toBe("CH")
		expect(body.canton).toBe("VD")
		expect(body.createdAt).toBeDefined()
		expect(body.updatedAt).toBeDefined()
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/location/99999")
		expect(res.status).toBe(404)
	})
})

describe("POST /location", () => {
	test("admin creates location returns 200", async () => {
		const res = await app.request("/location", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Geneva", country: "CH", canton: "GE" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("Geneva")
		expect(body.country).toBe("CH")
		expect(body.canton).toBe("GE")
		expect(body.id).toBeDefined()
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/location", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ name: "Bern", country: "CH" }),
		})
		expect(res.status).toBe(403)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/location", {
			method: "POST",
			headers: jsonHeaders(),
			body: JSON.stringify({ name: "Zurich", country: "CH" }),
		})
		expect(res.status).toBe(401)
	})
})

describe("PUT /location/:id", () => {
	test("admin updates location returns 200", async () => {
		// Create first
		const createRes = await app.request("/location", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "OldName", country: "CH" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/location/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "NewName" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("NewName")
	})
})

describe("DELETE /location/:id", () => {
	test("admin deletes location returns 200", async () => {
		// Create first
		const createRes = await app.request("/location", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "ToDelete", country: "FR" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/location/${created.id}`, {
			method: "DELETE",
			headers: jsonHeaders(adminToken),
		})
		// responseValidator c.render -> c.json doesn't forward status, so 200
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.success).toBe(true)
	})

	test("non-admin returns 403", async () => {
		// Create first
		const createRes = await app.request("/location", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "NoDelete", country: "CH" }),
		})
		const created = await createRes.json()

		const res = await app.request(`/location/${created.id}`, {
			method: "DELETE",
			headers: jsonHeaders(userToken),
		})
		expect(res.status).toBe(403)
	})
})
