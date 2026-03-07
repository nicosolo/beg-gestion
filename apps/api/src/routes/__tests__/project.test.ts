import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { projectRoutes } = await import("../project")
const app = new Hono().onError(errorHandler).route("/project", projectRoutes)

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

	// Seed a project type (required for project creation)
	await db.insert(schema.projectTypes).values({ name: "Type A" })
})

const jsonHeaders = (token?: string) => {
	const h: Record<string, string> = { "Content-Type": "application/json" }
	if (token) h["Authorization"] = `Bearer ${token}`
	return h
}

describe("POST /project", () => {
	test("admin creates project", async () => {
		const res = await app.request("/project", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				name: "Admin Project",
				startDate: "2024-01-01",
				projectTypeIds: [1],
				projectManagers: [adminId],
			}),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("Admin Project")
		expect(body.startDate).toBeDefined()
		expect(body.types).toBeArrayOfSize(1)
		expect(body.types[0].name).toBe("Type A")
		expect(body.projectManagers).toBeArrayOfSize(1)
		expect(body.projectManagers[0].id).toBe(adminId)
	})

	test("user creates project, auto-added as manager", async () => {
		const res = await app.request("/project", {
			method: "POST",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({
				name: "User Project",
				startDate: "2024-02-01",
				projectTypeIds: [1],
			}),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("User Project")
		const managerIds = body.projectManagers.map((m: { id: number }) => m.id)
		expect(managerIds).toContain(userId)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/project", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "No Auth",
				startDate: "2024-01-01",
				projectTypeIds: [1],
			}),
		})
		expect(res.status).toBe(401)
	})
})

describe("GET /project", () => {
	test("returns 200 paginated list", async () => {
		const res = await app.request("/project", {
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
		const res = await app.request("/project")
		expect(res.status).toBe(401)
	})
})

describe("GET /project/:id", () => {
	test("returns project with nested relations", async () => {
		// Create a project first
		const createRes = await app.request("/project", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				name: "Get By Id Project",
				startDate: "2024-03-01",
				projectTypeIds: [1],
				projectManagers: [adminId],
			}),
		})
		const created = await createRes.json()

		const res = await app.request(`/project/${created.id}`, {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.id).toBe(created.id)
		expect(body.name).toBe("Get By Id Project")
		expect(body.types).toBeDefined()
		expect(body.projectManagers).toBeDefined()
		expect(body.totalDuration).toBeDefined()
	})

	test("nonexistent id returns 404", async () => {
		const res = await app.request("/project/99999", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(404)
	})

	test("no auth returns 401", async () => {
		const res = await app.request("/project/1")
		expect(res.status).toBe(401)
	})
})

describe("PUT /project/:id", () => {
	let projectId: number

	beforeAll(async () => {
		// Create a project with admin as manager
		const res = await app.request("/project", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				name: "Update Test Project",
				startDate: "2024-04-01",
				projectTypeIds: [1],
				projectManagers: [adminId],
			}),
		})
		const body = await res.json()
		projectId = body.id
	})

	test("admin updates any project", async () => {
		const res = await app.request(`/project/${projectId}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ name: "Updated By Admin" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("Updated By Admin")
	})

	test("non-manager non-admin returns 403", async () => {
		const res = await app.request(`/project/${projectId}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ name: "Should Fail" }),
		})
		expect(res.status).toBe(403)
	})

	test("manager updates own project", async () => {
		// Add user as manager
		await db.insert(schema.projectUsers).values({
			projectId,
			userId,
			role: "manager",
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		const res = await app.request(`/project/${projectId}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ name: "Updated By Manager" }),
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.name).toBe("Updated By Manager")
	})

	test("no auth returns 401", async () => {
		const res = await app.request(`/project/${projectId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "No Auth" }),
		})
		expect(res.status).toBe(401)
	})
})

describe("POST /project/:id/members/:userId", () => {
	let projectId: number

	beforeAll(async () => {
		const res = await app.request("/project", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({
				name: "Member Test Project",
				startDate: "2024-05-01",
				projectTypeIds: [1],
				projectManagers: [adminId],
			}),
		})
		const body = await res.json()
		projectId = body.id
	})

	test("admin adds member", async () => {
		const res = await app.request(`/project/${projectId}/members/${userId}`, {
			method: "POST",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.success).toBe(true)
	})

	test("no auth returns 401", async () => {
		const res = await app.request(`/project/${projectId}/members/${userId}`, {
			method: "POST",
		})
		expect(res.status).toBe(401)
	})
})
