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
		{ projectId, userId, role: "member" },
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

describe("GET /activity/export", () => {
	test("exports activities to Excel", async () => {
		const res = await app.request("/activity/export", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		expect(res.headers.get("Content-Type")).toBe(
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		)
		expect(res.headers.get("Content-Disposition")).toContain("attachment")
	})
})

describe("GET /activity/orphaned", () => {
	test("returns orphaned activities for project manager", async () => {
		const res = await app.request("/activity/orphaned", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(Array.isArray(body)).toBe(true)
	})
})

describe("GET /activity/:id invalid", () => {
	test("returns 400 for non-numeric id", async () => {
		const res = await app.request("/activity/abc", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(400)
	})
})

describe("POST /activity - negative values rejected", () => {
	test("negative duration returns 400", async () => {
		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: -1,
				kilometers: 0,
				expenses: 0,
				description: "negative duration",
				billed: false,
			}),
		})
		expect(res.status).toBe(400)
	})

	test("negative kilometers returns 400", async () => {
		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: -5,
				expenses: 0,
				description: "negative km",
				billed: false,
			}),
		})
		expect(res.status).toBe(400)
	})

	test("negative expenses returns 400", async () => {
		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: -10,
				description: "negative expenses",
				billed: false,
			}),
		})
		expect(res.status).toBe(400)
	})
})

describe("POST /activity - validation errors", () => {
	test("project not found returns 404", async () => {
		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId: 99999,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "test",
				billed: false,
			}),
		})
		expect(res.status).toBe(404)
	})

	test("activity type not found returns 400", async () => {
		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId: 99999,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "test",
				billed: false,
			}),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe("VALIDATION_ERROR")
	})

	test("adminOnly activity type for non-admin returns 400", async () => {
		const adminOnlyTypes = await db
			.select()
			.from(schema.activityTypes)
			.where(eq(schema.activityTypes.adminOnly, true))
		const adminOnlyTypeId = adminOnlyTypes[0].id

		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({
				projectId,
				activityTypeId: adminOnlyTypeId,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "test",
				billed: false,
			}),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe("VALIDATION_ERROR")
		expect(body.details?.[0]?.message).toContain("restricted to admins")
	})

	test("admin with invalid userId returns 400", async () => {
		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "test",
				billed: false,
				userId: 99999,
			}),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe("VALIDATION_ERROR")
	})
})

describe("PUT /activity/:id - billed activity restrictions", () => {
	test("non-manager cannot edit billed activity", async () => {
		// Create a billed activity as admin (manager)
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
				description: "billed activity",
				billed: true,
			}),
		})
		const created = await createRes.json()

		// User (collaborator, not manager) tries to edit
		const res = await app.request(`/activity/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ description: "changed" }),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe("VALIDATION_ERROR")
		expect(body.details?.[0]?.field).toBe("billed")
	})
})

describe("PUT /activity/:id - 60-day lock", () => {
	test("non-admin cannot change description on old activity", async () => {
		// Create old activity as admin
		const oldDate = new Date()
		oldDate.setDate(oldDate.getDate() - 90)
		const createRes = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: oldDate.toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "old activity",
				billed: false,
				userId,
			}),
		})
		const created = await createRes.json()

		// User tries to change description (not allowed on locked)
		const res = await app.request(`/activity/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ description: "changed" }),
		})
		expect(res.status).toBe(403)
		const body = await res.json()
		expect(body.code).toBe("ACTIVITY_LOCKED")
	})

	test("non-admin can change projectId on old activity", async () => {
		// Create a second project for reassignment
		const [project2] = await db
			.insert(schema.projects)
			.values({ name: "Project 2", startDate: new Date(), status: "active" })
			.returning()
		await db.insert(schema.projectUsers).values([
			{ projectId: project2.id, userId, role: "member" },
			{ projectId: project2.id, userId: adminId, role: "manager" },
		])

		// Create old activity assigned to user
		const oldDate = new Date()
		oldDate.setDate(oldDate.getDate() - 90)
		const createRes = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: oldDate.toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "old for project change",
				billed: false,
				userId,
			}),
		})
		const created = await createRes.json()

		// User changes only projectId - should be allowed
		const res = await app.request(`/activity/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ projectId: project2.id }),
		})
		expect(res.status).toBe(200)
	})
})

describe("PUT /activity/:id - billed toggle permission", () => {
	test("non-manager cannot toggle billed status", async () => {
		// Create unbilled activity assigned to user
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
				description: "toggle billed test",
				billed: false,
				userId,
			}),
		})
		const created = await createRes.json()

		// User (collaborator) tries to toggle billed
		const res = await app.request(`/activity/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ billed: true }),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.details?.[0]?.message).toContain("Only project managers")
	})
})

describe("PUT /activity/:id - admin userId", () => {
	test("admin can set userId on update", async () => {
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
				description: "admin userId test",
				billed: false,
			}),
		})
		const created = await createRes.json()

		const res = await app.request(`/activity/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ userId }),
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.user.id).toBe(userId)
	})
})

describe("PUT /activity/:id - activityTypeId change triggers rate recalc", () => {
	test("changing activityTypeId to nonexistent type returns 400", async () => {
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
				description: "rate recalc test",
				billed: false,
			}),
		})
		const created = await createRes.json()

		const res = await app.request(`/activity/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ activityTypeId: 99999 }),
		})
		expect(res.status).toBe(400)
	})

	test("non-admin changing to adminOnly type returns 400", async () => {
		const adminOnlyTypes = await db
			.select()
			.from(schema.activityTypes)
			.where(eq(schema.activityTypes.adminOnly, true))
		const adminOnlyTypeId = adminOnlyTypes[0].id

		// Create activity assigned to user
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
				description: "adminOnly type change",
				billed: false,
				userId,
			}),
		})
		const created = await createRes.json()

		const res = await app.request(`/activity/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ activityTypeId: adminOnlyTypeId }),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.details?.[0]?.message).toContain("restricted to admins")
	})

	test("changing activityTypeId with invalid projectId returns 404", async () => {
		// Create a new activity type for switching to
		const [newType] = await db
			.insert(schema.activityTypes)
			.values({ name: "Type B", code: "TB", billable: true, adminOnly: false })
			.returning()

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
				description: "project not found on type change",
				billed: false,
			}),
		})
		const created = await createRes.json()

		const res = await app.request(`/activity/${created.id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ activityTypeId: newType.id, projectId: 99999 }),
		})
		expect(res.status).toBe(404)
	})
})

describe("PUT /activity/:id - update nonexistent", () => {
	test("update nonexistent activity returns 404", async () => {
		const res = await app.request("/activity/99999", {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ description: "nope" }),
		})
		expect(res.status).toBe(404)
	})
})

describe("PATCH /activity/bulk - errors", () => {
	test("some activities not found returns 400", async () => {
		const res = await app.request("/activity/bulk", {
			method: "PATCH",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				ids: [99998, 99999],
				updates: { billed: true },
			}),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe("VALIDATION_ERROR")
	})

	test("non-admin non-manager cannot bulk toggle billed", async () => {
		// Create activity as admin, assigned to user
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
				description: "bulk billed test",
				billed: false,
				userId,
			}),
		})
		const created = await createRes.json()

		const res = await app.request("/activity/bulk", {
			method: "PATCH",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({
				ids: [created.id],
				updates: { billed: true },
			}),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.details?.[0]?.message).toContain("Only project managers")
	})
})

describe("DELETE /activity/:id - billed restriction", () => {
	test("non-manager cannot delete billed activity", async () => {
		// Create billed activity assigned to user
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
				description: "billed delete test",
				billed: true,
				userId,
			}),
		})
		const created = await createRes.json()

		const res = await app.request(`/activity/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.details?.[0]?.message).toContain("cannot be deleted")
	})
})

describe("GET /activity?subProjectName=", () => {
	let subProjectId: number
	let subActivityId: number

	beforeAll(async () => {
		const [subProject] = await db
			.insert(schema.projects)
			.values({
				name: "Sous-mandat Filter Project",
				subProjectName: "EAC-FILTER",
				startDate: new Date(),
				status: "active",
			})
			.returning()
		subProjectId = subProject.id

		await db.insert(schema.projectUsers).values([
			{ projectId: subProjectId, userId: adminId, role: "manager" },
		])

		const res = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId: subProjectId,
				activityTypeId,
				date: new Date().toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "Sous-mandat test activity",
				billed: false,
			}),
		})
		const body = await res.json()
		subActivityId = body.id
	})

	test("returns only activities on matching sous-mandat", async () => {
		const res = await app.request("/activity?subProjectName=EAC-FILTER", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		const ids = body.data.map((a: { id: number }) => a.id)
		expect(ids).toContain(subActivityId)
		expect(body.data.every((a: { project: { subProjectName: string | null } }) =>
			a.project?.subProjectName?.includes("EAC-FILTER")
		)).toBe(true)
	})

	test("empty string filter is a no-op", async () => {
		const res = await app.request("/activity?subProjectName=", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.data.length).toBeGreaterThan(0)
	})
})

describe("DELETE /activity/:id - 60-day lock", () => {
	test("non-admin cannot delete old activity", async () => {
		const oldDate = new Date()
		oldDate.setDate(oldDate.getDate() - 90)

		// Create old activity assigned to user
		const createRes = await app.request("/activity", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				projectId,
				activityTypeId,
				date: oldDate.toISOString(),
				duration: 1,
				kilometers: 0,
				expenses: 0,
				description: "old delete test",
				billed: false,
				userId,
			}),
		})
		const created = await createRes.json()

		const res = await app.request(`/activity/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(403)
		const body = await res.json()
		expect(body.code).toBe("ACTIVITY_LOCKED")
	})
})
