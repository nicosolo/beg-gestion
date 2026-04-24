import { describe, test, expect, beforeAll, mock } from "bun:test"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { rebuildProjectSearchIndex } = await import("../../db/fts")
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

    test("user_eac updates EAC project (not manager, not admin)", async () => {
        const seed = await seedUsers(db).catch(() => null)
        // seedUsers was already run in outer beforeAll; fetch userEac token via DB lookup
        const userEac = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, "usereac@test.com"))
            .then((rows) => rows[0])
        const { generateToken } = await import("../../tools/auth")
        const userEacToken = generateToken(userEac)

        const [eacProject] = await db
            .insert(schema.projects)
            .values({
                name: "EAC Project Edit",
                subProjectName: "EAC",
                startDate: new Date("2024-05-01"),
            })
            .returning()

        const res = await app.request(`/project/${eacProject.id}`, {
            method: "PUT",
            headers: jsonHeaders(userEacToken),
            body: JSON.stringify({ name: "Updated By user_eac" }),
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.name).toBe("Updated By user_eac")
        void seed
    })

    test("user_eac returns 403 on non-EAC project", async () => {
        const userEac = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, "usereac@test.com"))
            .then((rows) => rows[0])
        const { generateToken } = await import("../../tools/auth")
        const userEacToken = generateToken(userEac)

        const res = await app.request(`/project/${projectId}`, {
            method: "PUT",
            headers: jsonHeaders(userEacToken),
            body: JSON.stringify({ name: "Should Fail" }),
        })
        expect(res.status).toBe(403)
    })
})

describe("GET /project (FTS search)", () => {
    let ftsProjectId: number

    beforeAll(async () => {
        // Create client
        const [client] = await db
            .insert(schema.clients)
            .values({ name: "Acme Corporation", createdAt: new Date(), updatedAt: new Date() })
            .returning()

        // Create location
        const [location] = await db
            .insert(schema.locations)
            .values({
                name: "Genève",
                country: "CH",
                region: "Lac Léman",
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning()

        // Create engineer
        const [engineer] = await db
            .insert(schema.engineers)
            .values({ name: "Jean-Pierre Müller", createdAt: new Date(), updatedAt: new Date() })
            .returning()

        // Create project with all relations
        const res = await app.request("/project", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({
                name: "Rénovation Bâtiment",
                startDate: "2024-06-01",
                projectTypeIds: [1],
                projectManagers: [adminId],
                clientId: client.id,
                locationId: location.id,
                engineerId: engineer.id,
                projectNumber: "2024-500",
                remark: "Urgent renovation needed",
            }),
        })
        const body = await res.json()
        ftsProjectId = body.id

        // Create activity type for test activities
        const [actType] = await db
            .insert(schema.activityTypes)
            .values({
                name: "Engineering",
                code: "ENG",
                billable: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning()

        // Insert activity directly
        await db.insert(schema.activities).values({
            userId: adminId,
            projectId: ftsProjectId,
            activityTypeId: actType.id,
            date: new Date("2024-06-15"),
            duration: 2,
            kilometers: 0,
            expenses: 0,
            rate: 150,
            description: "Foundation inspection completed",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        // Insert invoice directly
        await db.insert(schema.invoices).values({
            projectId: ftsProjectId,
            invoiceNumber: "INV-2024-500-01",
            reference: "REF-ACME-001",
            type: "invoice",
            billingMode: "accordingToData",
            status: "draft",
            issueDate: new Date("2024-07-01"),
            periodStart: new Date("2024-06-01"),
            periodEnd: new Date("2024-06-30"),
            description: "Monthly engineering services",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        // Rebuild FTS for this project to include activity + invoice data
        await rebuildProjectSearchIndex(ftsProjectId)
    })

    test("search by project name", async () => {
        const res = await app.request("/project?text=Rénovation", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("search by client name", async () => {
        const res = await app.request("/project?text=Acme", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("search by project number", async () => {
        const res = await app.request("/project?text=2024-500", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("search by activity description", async () => {
        const res = await app.request("/project?text=Foundation+inspection", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("search by invoice number", async () => {
        const res = await app.request("/project?text=INV-2024-500", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("search by invoice reference", async () => {
        const res = await app.request("/project?text=REF-ACME", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("accent-insensitive matching", async () => {
        const res = await app.request("/project?text=Batiment", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("prefix matching", async () => {
        const res = await app.request("/project?text=Renov", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("FTS search combined with status filter", async () => {
        const res = await app.request("/project?text=Acme&status=active", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.some((p: { id: number }) => p.id === ftsProjectId)).toBe(true)
    })

    test("empty search returns all projects", async () => {
        const res = await app.request("/project", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.length).toBeGreaterThan(0)
    })

    test("no match returns empty", async () => {
        const res = await app.request("/project?text=zzzznonexistent", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.length).toBe(0)
    })
})

describe("GET /project/map", () => {
    let projectInBounds: number
    let projectOutOfBounds: number
    let projectNoCoords: number

    beforeAll(async () => {
        // Project in Zurich area
        const res1 = await app.request("/project", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({
                name: "Map Zurich Project",
                startDate: "2024-01-01",
                projectTypeIds: [1],
                projectManagers: [adminId],
            }),
        })
        const p1 = await res1.json()
        projectInBounds = p1.id
        await db
            .update(schema.projects)
            .set({ latitude: 47.37, longitude: 8.54 })
            .where(eq(schema.projects.id, projectInBounds))

        // Project in Paris (outside Swiss bounds)
        const res2 = await app.request("/project", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({
                name: "Map Paris Project",
                startDate: "2024-01-01",
                projectTypeIds: [1],
                projectManagers: [adminId],
            }),
        })
        const p2 = await res2.json()
        projectOutOfBounds = p2.id
        await db
            .update(schema.projects)
            .set({ latitude: 48.85, longitude: 2.35 })
            .where(eq(schema.projects.id, projectOutOfBounds))

        // Project with no coordinates
        const res3 = await app.request("/project", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({
                name: "Map No Coords Project",
                startDate: "2024-01-01",
                projectTypeIds: [1],
                projectManagers: [adminId],
            }),
        })
        const p3 = await res3.json()
        projectNoCoords = p3.id
    })

    test("returns projects with coordinates", async () => {
        const res = await app.request("/project/map", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(Array.isArray(body)).toBe(true)
        const ids = body.map((p: { id: number }) => p.id)
        expect(ids).toContain(projectInBounds)
        expect(ids).toContain(projectOutOfBounds)
        expect(ids).not.toContain(projectNoCoords)
    })

    test("filters by bounds", async () => {
        // Bounds covering Zurich but not Paris
        const res = await app.request(
            "/project/map?minLat=46&maxLat=48&minLng=6&maxLng=10",
            { headers: { Authorization: `Bearer ${adminToken}` } }
        )
        expect(res.status).toBe(200)
        const body = await res.json()
        const ids = body.map((p: { id: number }) => p.id)
        expect(ids).toContain(projectInBounds)
        expect(ids).not.toContain(projectOutOfBounds)
        expect(ids).not.toContain(projectNoCoords)
    })

    test("returns lightweight map format", async () => {
        const res = await app.request("/project/map", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        const project = body.find((p: { id: number }) => p.id === projectInBounds)
        expect(project).toBeDefined()
        expect(project.name).toBe("Map Zurich Project")
        expect(project.latitude).toBe(47.37)
        expect(project.longitude).toBe(8.54)
        expect(typeof project.ended).toBe("boolean")
    })

    test("no auth returns 401", async () => {
        const res = await app.request("/project/map")
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

    test("NaN id/userId returns 404", async () => {
        const res = await app.request("/project/abc/members/xyz", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(404)
    })
})

describe("GET /project/export", () => {
    test("returns xlsx with correct content type", async () => {
        const res = await app.request("/project/export", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        expect(res.headers.get("Content-Type")).toBe(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        expect(res.headers.get("Content-Disposition")).toContain("mandats-")
        expect(res.headers.get("Content-Disposition")).toContain(".xlsx")
    })

    test("no auth returns 401", async () => {
        const res = await app.request("/project/export")
        expect(res.status).toBe(401)
    })
})

describe("GET /project/:id (NaN id)", () => {
    test("NaN id returns 404", async () => {
        const res = await app.request("/project/abc", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(404)
    })
})

describe("GET /project/:id/folder", () => {
    test("NaN id returns 400", async () => {
        const res = await app.request("/project/abc/folder", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toBe("Invalid project ID")
    })

    test("project without projectNumber returns 404", async () => {
        // Create project without projectNumber
        const createRes = await app.request("/project", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({
                name: "No Number Project",
                startDate: "2024-01-01",
                projectTypeIds: [1],
            }),
        })
        const created = await createRes.json()

        const res = await app.request(`/project/${created.id}/folder`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.error).toBe("Project not found")
    })

    test("project with projectNumber returns folder search result", async () => {
        // Create project with projectNumber
        const createRes = await app.request("/project", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({
                name: "Folder Test Project",
                startDate: "2024-01-01",
                projectTypeIds: [1],
                projectNumber: "9999",
            }),
        })
        const created = await createRes.json()

        const res = await app.request(`/project/${created.id}/folder`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        const body = await res.json()
        // Folder search executes — result depends on whether /mandats exists in env
        expect([200, 500]).toContain(res.status)
        if (res.status === 200) {
            expect(body.projectId).toBe(created.id)
            expect(body.projectNumber).toBe("9999")
            expect(typeof body.found).toBe("boolean")
        } else {
            expect(body.error).toBe("Failed to search for project folder")
        }
    })
})

describe("POST /project (duplicate projectNumber)", () => {
    test("duplicate projectNumber returns 409", async () => {
        const payload = {
            name: "Dup Number A",
            startDate: "2024-01-01",
            projectTypeIds: [1],
            projectNumber: "DUP-001",
        }
        const res1 = await app.request("/project", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify(payload),
        })
        expect(res1.status).toBe(200)

        const res2 = await app.request("/project", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ ...payload, name: "Dup Number B" }),
        })
        expect(res2.status).toBe(409)
        const body = await res2.json()
        expect(body.error).toBe("Project number already exists")
    })
})

describe("PUT /project/:id (edge cases)", () => {
    test("NaN id returns 400", async () => {
        const res = await app.request("/project/abc", {
            method: "PUT",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ name: "Whatever" }),
        })
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toBe("Invalid ID")
    })
})

describe("GET /project?subProjectName=", () => {
    let acousticId: number
    let thermalId: number

    beforeAll(async () => {
        const [acoustic] = await db
            .insert(schema.projects)
            .values({
                name: "Filter Project Acoustic",
                subProjectName: "EAC-ACOUSTIC",
                startDate: new Date("2024-01-01"),
                status: "active",
            })
            .returning()
        acousticId = acoustic.id

        const [thermal] = await db
            .insert(schema.projects)
            .values({
                name: "Filter Project Thermal",
                subProjectName: "EAC-THERMAL",
                startDate: new Date("2024-01-01"),
                status: "active",
            })
            .returning()
        thermalId = thermal.id
    })

    test("exact match returns only projects with that sous-mandat", async () => {
        const res = await app.request("/project?subProjectName=EAC-ACOUSTIC", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        const ids = body.data.map((p: { id: number }) => p.id)
        expect(ids).toContain(acousticId)
        expect(ids).not.toContain(thermalId)
    })

    test("partial value does not match (exact-match semantics)", async () => {
        const res = await app.request("/project?subProjectName=ACOUSTIC", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        const ids = body.data.map((p: { id: number }) => p.id)
        expect(ids).not.toContain(acousticId)
        expect(ids).not.toContain(thermalId)
    })

    test("empty string filter is a no-op", async () => {
        const res = await app.request("/project?subProjectName=", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.data.length).toBeGreaterThan(0)
    })
})

