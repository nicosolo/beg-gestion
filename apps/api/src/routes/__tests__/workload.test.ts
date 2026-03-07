import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { workloadRoutes } = await import("../workloads")
const app = new Hono().onError(errorHandler).route("/workloads", workloadRoutes)

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

describe("GET /workloads", () => {
	test("no auth returns 401", async () => {
		const res = await app.request("/workloads")
		expect(res.status).toBe(401)
	})

	test("admin sees all workloads", async () => {
		// Create workloads for both users
		await app.request("/workloads", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ userId: adminId, year: 2025, month: 1, workload: 80 }),
		})
		await app.request("/workloads", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ userId: userId, year: 2025, month: 1, workload: 60 }),
		})

		const res = await app.request("/workloads", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBeGreaterThanOrEqual(2)

		const userIds = body.map((w: { userId: number }) => w.userId)
		expect(userIds).toContain(adminId)
		expect(userIds).toContain(userId)
	})

	test("user sees only own workloads", async () => {
		const res = await app.request("/workloads", {
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
		for (const w of body) {
			expect(w.userId).toBe(userId)
		}
	})
})

describe("GET /workloads/:id", () => {
	test("user sees own workload", async () => {
		// Create workload for user
		const createRes = await app.request("/workloads", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ userId, year: 2025, month: 2, workload: 50 }),
		})
		const created = await createRes.json()

		const res = await app.request(`/workloads/${created.id}`, {
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.userId).toBe(userId)
	})

	test("user cannot see other's workload returns 403", async () => {
		// Create workload for admin
		const createRes = await app.request("/workloads", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ userId: adminId, year: 2025, month: 2, workload: 90 }),
		})
		const created = await createRes.json()

		const res = await app.request(`/workloads/${created.id}`, {
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(403)
	})
})

describe("POST /workloads", () => {
	test("admin creates workload returns 200", async () => {
		const res = await app.request("/workloads", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ userId: adminId, year: 2025, month: 3, workload: 100 }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.userId).toBe(adminId)
		expect(body.year).toBe(2025)
		expect(body.month).toBe(3)
		expect(body.workload).toBe(100)
	})

	test("non-admin returns 403", async () => {
		const res = await app.request("/workloads", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ userId, year: 2025, month: 4, workload: 70 }),
		})
		expect(res.status).toBe(403)
	})
})

describe("POST /workloads/bulk", () => {
	test("admin bulk creates workloads returns 200", async () => {
		const res = await app.request("/workloads/bulk", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify([
				{ userId: adminId, year: 2025, month: 5, workload: 80 },
				{ userId: userId, year: 2025, month: 5, workload: 60 },
			]),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBe(2)
	})
})

describe("PUT /workloads/:id", () => {
	test("admin updates workload returns 200", async () => {
		// Create first
		const createRes = await app.request("/workloads", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ userId: adminId, year: 2025, month: 6, workload: 50 }),
		})
		const created = await createRes.json()

		const res = await app.request(`/workloads/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ workload: 75 }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.workload).toBe(75)
	})
})

describe("DELETE /workloads/:id", () => {
	test("admin deletes workload returns 200", async () => {
		// Create first
		const createRes = await app.request("/workloads", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ userId: adminId, year: 2025, month: 7, workload: 40 }),
		})
		const created = await createRes.json()

		const res = await app.request(`/workloads/${created.id}`, {
			method: "DELETE",
			headers: jsonHeaders(adminToken),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.message).toBeDefined()
	})
})
