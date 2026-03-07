import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { monthlyHoursRoutes } = await import("../monthlyHours")
const app = new Hono().onError(errorHandler).route("/monthly-hours", monthlyHoursRoutes)

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

describe("GET /monthly-hours", () => {
	test("no auth returns 401", async () => {
		const res = await app.request("/monthly-hours")
		expect(res.status).toBe(401)
	})

	test("with auth returns 200 and paginated response", async () => {
		const res = await app.request("/monthly-hours", {
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
})

describe("POST /monthly-hours", () => {
	test("admin creates monthly hours returns 200", async () => {
		const res = await app.request("/monthly-hours", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ year: 2024, month: 1, amountOfHours: 168 }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.year).toBe(2024)
		expect(body.month).toBe(1)
		expect(body.amountOfHours).toBe(168)
		expect(body.id).toBeDefined()
	})

	test("duplicate year+month returns 409", async () => {
		const res = await app.request("/monthly-hours", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ year: 2024, month: 1, amountOfHours: 160 }),
		})
		expect(res.status).toBe(409)

		const body = await res.json()
		expect(body.code).toBe("DUPLICATE_ENTRY")
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/monthly-hours", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ year: 2024, month: 2, amountOfHours: 160 }),
		})
		expect(res.status).toBe(403)
	})
})

describe("GET /monthly-hours/:id", () => {
	test("returns monthly hours by id", async () => {
		const res = await app.request("/monthly-hours/1", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(1)
		expect(body.year).toBe(2024)
		expect(body.month).toBe(1)
	})
})

describe("PUT /monthly-hours/:id", () => {
	test("admin updates monthly hours returns 200", async () => {
		const res = await app.request("/monthly-hours/1", {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ amountOfHours: 176 }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.amountOfHours).toBe(176)
	})
})

describe("DELETE /monthly-hours/:id", () => {
	test("admin deletes monthly hours returns 200", async () => {
		// Create monthly hours to delete
		const createRes = await app.request("/monthly-hours", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ year: 2099, month: 12, amountOfHours: 100 }),
		})
		const created = await createRes.json()

		const res = await app.request(`/monthly-hours/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.success).toBe(true)
	})
})
