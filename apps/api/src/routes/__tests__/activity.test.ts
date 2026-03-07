import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"
import { eq } from "drizzle-orm"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { activityRoutes } = await import("../activity")
const app = new Hono().onError(errorHandler).route("/activity", activityRoutes)

let adminToken: string
let userToken: string
let adminId: number
let userId: number
let projectId: number
let activityTypeId: number

beforeAll(async () => {
	const seed = await seedUsers(db)
	adminToken = seed.adminToken
	userToken = seed.userToken
	adminId = seed.admin.id
	userId = seed.user.id

	// Seed activity types
	const [activityType] = await db
		.insert(schema.activityTypes)
		.values({ name: "Hours", code: "H", billable: true, adminOnly: false })
		.returning()
	activityTypeId = activityType.id

	await db
		.insert(schema.activityTypes)
		.values({ name: "Admin Hours", code: "AH", billable: true, adminOnly: true })

	// Seed project
	const [project] = await db
		.insert(schema.projects)
		.values({ name: "Test Project", startDate: new Date(), status: "active" })
		.returning()
	projectId = project.id

	// Seed project users
	await db.insert(schema.projectUsers).values([
		{ projectId, userId: adminId, role: "manager" },
		{ projectId, userId, role: "collaborator" },
	])

	// Seed rate class
	await db
		.insert(schema.rateClasses)
		.values({ class: "A", year: new Date().getFullYear(), amount: 150 })

	// Update users' activityRates so rate lookup works
	await db
		.update(schema.users)
		.set({ activityRates: [{ activityId: activityTypeId, class: "A" }] })
		.where(eq(schema.users.id, adminId))
	await db
		.update(schema.users)
		.set({ activityRates: [{ activityId: activityTypeId, class: "A" }] })
		.where(eq(schema.users.id, userId))
})

const jsonHeaders = (token?: string) => {
	const h: Record<string, string> = { "Content-Type": "application/json" }
	if (token) h["Authorization"] = `Bearer ${token}`
	return h
}

describe("POST /activity", () => {
	test("creates activity with valid data", async () => {
		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 2.5,
				kilometers: 10,
				expenses: 50,
				description: "Test activity",
				billed: false,
			}),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBeDefined()
		expect(body.duration).toBe(2.5)
		expect(body.kilometers).toBe(10)
		expect(body.expenses).toBe(50)
		expect(body.description).toBe("Test activity")
		expect(body.rate).toBe(150)
		expect(body.rateClass).toBe("A")
		expect(body.user).toBeDefined()
		expect(body.user.id).toBe(adminId)
		expect(body.project).toBeDefined()
		expect(body.project.id).toBe(projectId)
		expect(body.activityType).toBeDefined()
		expect(body.activityType.id).toBe(activityTypeId)
	})

	test("non-admin with date > 60 days ago returns 403 ACTIVITY_LOCKED", async () => {
		const oldDate = new Date()
		oldDate.setDate(oldDate.getDate() - 90)

		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: oldDate.toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "Old activity",
				billed: false,
			}),
		})
		expect(res.status).toBe(403)

		const body = await res.json()
		expect(body.code).toBe("ACTIVITY_LOCKED")
	})

	test("admin can create activity with old date (no lock)", async () => {
		const oldDate = new Date()
		oldDate.setDate(oldDate.getDate() - 90)

		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: oldDate.toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "Admin old activity",
				billed: false,
			}),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBeDefined()
		expect(body.description).toBe("Admin old activity")
	})
})

describe("GET /activity", () => {
	test("returns paginated list", async () => {
		const res = await app.request("/activity", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.data).toBeDefined()
		expect(Array.isArray(body.data)).toBe(true)
		expect(body.total).toBeDefined()
		expect(body.page).toBeDefined()
		expect(body.limit).toBeDefined()
		expect(body.totalPages).toBeDefined()
		expect(body.totals).toBeDefined()
		expect(body.totals.duration).toBeDefined()
		expect(body.totals.kilometers).toBeDefined()
		expect(body.totals.expenses).toBeDefined()
		expect(body.data.length).toBeGreaterThan(0)
	})
})

describe("GET /activity/:id", () => {
	test("returns activity with relations", async () => {
		// Use an activity created in the POST tests
		const listRes = await app.request("/activity", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const list = await listRes.json()
		const activityId = list.data[0].id

		const res = await app.request(`/activity/${activityId}`, {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(activityId)
		expect(body.user).toBeDefined()
		expect(body.user.firstName).toBeDefined()
		expect(body.user.lastName).toBeDefined()
		expect(body.user.initials).toBeDefined()
		expect(body.project).toBeDefined()
		expect(body.project.name).toBe("Test Project")
		expect(body.activityType).toBeDefined()
		expect(body.activityType.code).toBe("H")
		expect(body.createdAt).toBeDefined()
		expect(body.updatedAt).toBeDefined()
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/activity/99999", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)
	})
})

describe("PUT /activity/:id", () => {
	test("updates activity", async () => {
		// Get an existing activity
		const listRes = await app.request("/activity", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const list = await listRes.json()
		const activityId = list.data[0].id

		const res = await app.request(`/activity/${activityId}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ duration: 5, description: "Updated description" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.duration).toBe(5)
		expect(body.description).toBe("Updated description")
	})
})

describe("DELETE /activity/:id", () => {
	test("deletes activity", async () => {
		// Create an activity to delete
		const createRes = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "To be deleted",
				billed: false,
			}),
		})
		const created = await createRes.json()

		const res = await app.request(`/activity/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.message).toBeDefined()

		// Verify it's gone
		const getRes = await app.request(`/activity/${created.id}`, {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(getRes.status).toBe(404)
	})
})

describe("PATCH /activity/bulk", () => {
	test("bulk updates billed status", async () => {
		// Create two activities
		const create1 = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "Bulk 1",
				billed: false,
			}),
		})
		const a1 = await create1.json()

		const create2 = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 2,
				kilometers: 0,
				expenses: 0,
				description: "Bulk 2",
				billed: false,
			}),
		})
		const a2 = await create2.json()

		const res = await app.request("/activity/bulk", {
			method: "PATCH",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				ids: [a1.id, a2.id],
				updates: { billed: true },
			}),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.updated).toBe(2)
		expect(body.ids).toEqual([a1.id, a2.id])
	})
})

describe("GET /activity/my-stats", () => {
	test("returns monthly stats", async () => {
		const year = new Date().getFullYear()
		const res = await app.request(`/activity/my-stats?year=${year}`, {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.year).toBe(year)
		expect(body.months).toBeDefined()
		expect(body.months.length).toBe(12)
		expect(body.totalDuration).toBeDefined()
		expect(typeof body.totalDuration).toBe("number")
	})
})

describe("No auth", () => {
	test("returns 401 without token", async () => {
		const res = await app.request("/activity")
		expect(res.status).toBe(401)
	})
})
