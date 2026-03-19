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

describe("GET /monthly-hours/:id - edge cases", () => {
	test("NaN id returns 400", async () => {
		const res = await app.request("/monthly-hours/abc", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(400)
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/monthly-hours/99999", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)
	})
})

describe("PUT /monthly-hours/:id - edge cases", () => {
	test("NaN id returns 400", async () => {
		const res = await app.request("/monthly-hours/abc", {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ amountOfHours: 160 }),
		})
		expect(res.status).toBe(400)
	})

	test("year/month conflict returns 409", async () => {
		// Create two monthly hours entries
		await app.request("/monthly-hours", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ year: 2030, month: 1, amountOfHours: 168 }),
		})
		const res2 = await app.request("/monthly-hours", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ year: 2030, month: 2, amountOfHours: 160 }),
		})
		const entry2 = await res2.json()

		// Try to update entry2's month to conflict with entry1
		const res = await app.request(`/monthly-hours/${entry2.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ month: 1 }),
		})
		expect(res.status).toBe(409)
		const body = await res.json()
		expect(body.code).toBe("DUPLICATE_ENTRY")
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/monthly-hours/99999", {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ amountOfHours: 160 }),
		})
		expect(res.status).toBe(404)
	})
})

describe("DELETE /monthly-hours/:id - edge cases", () => {
	test("NaN id returns 400", async () => {
		const res = await app.request("/monthly-hours/abc", {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(400)
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/monthly-hours/99999", {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)
	})
})
