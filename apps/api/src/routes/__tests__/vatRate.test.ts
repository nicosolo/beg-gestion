import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { vatRateRoutes } = await import("../vatRate")
const app = new Hono().onError(errorHandler).route("/vat-rate", vatRateRoutes)

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

describe("GET /vat-rate", () => {
	test("no auth returns 401", async () => {
		const res = await app.request("/vat-rate")
		expect(res.status).toBe(401)
	})

	test("with auth returns 200 and array", async () => {
		const res = await app.request("/vat-rate", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
	})
})

describe("POST /vat-rate", () => {
	test("admin creates vat rate returns 200", async () => {
		const res = await app.request("/vat-rate", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ year: 2024, rate: 7.7 }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.year).toBe(2024)
		expect(body.rate).toBe(7.7)
		expect(body.id).toBeDefined()
	})

	test("duplicate year returns 409", async () => {
		const res = await app.request("/vat-rate", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ year: 2024, rate: 8.0 }),
		})
		expect(res.status).toBe(409)

		const body = await res.json()
		expect(body.code).toBe("ALREADY_EXISTS")
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/vat-rate", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ year: 2025, rate: 8.1 }),
		})
		expect(res.status).toBe(403)
	})
})

describe("GET /vat-rate/:id", () => {
	test("returns vat rate by id", async () => {
		const res = await app.request("/vat-rate/1", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(1)
		expect(body.year).toBe(2024)
	})
})

describe("PUT /vat-rate/:id", () => {
	test("admin updates vat rate returns 200", async () => {
		const res = await app.request("/vat-rate/1", {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ rate: 8.5 }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.rate).toBe(8.5)
	})
})

describe("DELETE /vat-rate/:id", () => {
	test("admin deletes vat rate returns 200", async () => {
		// Create a vat rate to delete
		const createRes = await app.request("/vat-rate", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ year: 2099, rate: 10 }),
		})
		const created = await createRes.json()

		const res = await app.request(`/vat-rate/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.success).toBe(true)
	})
})
