import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { rateRoutes } = await import("../rate")
const app = new Hono().onError(errorHandler).route("/rate", rateRoutes)

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

describe("GET /rate", () => {
	test("no auth returns 401", async () => {
		const res = await app.request("/rate")
		expect(res.status).toBe(401)
	})

	test("with auth returns 200 and array", async () => {
		const res = await app.request("/rate", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
	})
})

describe("POST /rate", () => {
	test("admin creates rate returns 200", async () => {
		const res = await app.request("/rate", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ class: "A", year: 2024, amount: 150 }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.class).toBe("A")
		expect(body.year).toBe(2024)
		expect(body.amount).toBe(150)
		expect(body.id).toBeDefined()
	})

	test("duplicate class+year returns 400", async () => {
		const res = await app.request("/rate", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ class: "A", year: 2024, amount: 200 }),
		})
		expect(res.status).toBe(400)

		const body = await res.json()
		expect(body.code).toBe("DUPLICATE_ENTRY")
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/rate", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ class: "B", year: 2024, amount: 100 }),
		})
		expect(res.status).toBe(403)
	})
})

describe("GET /rate/:id", () => {
	test("returns rate by id", async () => {
		const res = await app.request("/rate/1", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(1)
		expect(body.class).toBe("A")
	})
})

describe("PUT /rate/:id", () => {
	test("admin updates rate returns 200", async () => {
		const res = await app.request("/rate/1", {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ amount: 175 }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.amount).toBe(175)
	})
})

describe("DELETE /rate/:id", () => {
	test("admin deletes rate returns 200", async () => {
		// Create a rate to delete
		const createRes = await app.request("/rate", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ class: "Z", year: 2099, amount: 999 }),
		})
		const created = await createRes.json()

		const res = await app.request(`/rate/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.message).toBeDefined()
	})
})

describe("GET /rate/:id - edge cases", () => {
	test("nonexistent id returns 404", async () => {
		const res = await app.request("/rate/99999", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)
	})
})

describe("PUT /rate/:id - edge cases", () => {
	test("nonexistent id returns 404", async () => {
		const res = await app.request("/rate/99999", {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ amount: 100 }),
		})
		expect(res.status).toBe(404)
	})

	test("class/year conflict returns 400", async () => {
		// Create two rates with valid class values
		await app.request("/rate", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ class: "B", year: 2030, amount: 100 }),
		})
		const res2 = await app.request("/rate", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ class: "C", year: 2030, amount: 200 }),
		})
		const rate2 = await res2.json()

		// Try to change rate2's class to B (conflicts with rate1)
		const res = await app.request(`/rate/${rate2.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ class: "B" }),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe("DUPLICATE_ENTRY")
	})
})

describe("DELETE /rate/:id - edge cases", () => {
	test("nonexistent id returns 404", async () => {
		const res = await app.request("/rate/99999", {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)
	})
})
