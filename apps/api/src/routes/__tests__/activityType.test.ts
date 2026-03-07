import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { activityTypeRoutes } = await import("../activityType")
const app = new Hono().onError(errorHandler).route("/activity-type", activityTypeRoutes)

let adminToken: string
let userToken: string
let userId: number

beforeAll(async () => {
    const seed = await seedUsers(db)
    adminToken = seed.adminToken
    userToken = seed.userToken
    userId = seed.user.id
})

const jsonHeaders = (token?: string) => {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (token) h["Authorization"] = `Bearer ${token}`
    return h
}

describe("GET /activity-type", () => {
    test("no auth returns 401", async () => {
        const res = await app.request("/activity-type")
        expect(res.status).toBe(401)
    })

    test("admin sees all types including adminOnly", async () => {
        // Seed two activity types: one normal, one adminOnly
        await db.insert(schema.activityTypes).values({
            name: "Normal Type",
            code: "NT",
            billable: true,
            adminOnly: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        await db.insert(schema.activityTypes).values({
            name: "Admin Only Type",
            code: "AO",
            billable: false,
            adminOnly: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request("/activity-type", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(Array.isArray(body)).toBe(true)
        const codes = body.map((t: { code: string }) => t.code)
        expect(codes).toContain("NT")
        expect(codes).toContain("AO")
    })

    test("user only sees non-adminOnly types", async () => {
        const res = await app.request("/activity-type", {
            headers: { Authorization: `Bearer ${userToken}` },
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        const codes = body.map((t: { code: string }) => t.code)
        expect(codes).toContain("NT")
        expect(codes).not.toContain("AO")
    })
})

describe("GET /activity-type/filtered", () => {
    test("returns only activity types user has rates for", async () => {
        // Get NT activity type id
        const allTypes = await db.select().from(schema.activityTypes)
        const ntType = allTypes.find((t) => t.code === "NT")!

        // Set user's activityRates to include only NT
        const { eq } = await import("drizzle-orm")
        await db
            .update(schema.users)
            .set({ activityRates: [{ activityId: ntType.id, class: "A" }] })
            .where(eq(schema.users.id, userId))

        const res = await app.request("/activity-type/filtered", {
            headers: { Authorization: `Bearer ${userToken}` },
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(Array.isArray(body)).toBe(true)
        expect(body.length).toBe(1)
        expect(body[0].code).toBe("NT")
    })
})

describe("GET /activity-type/:id", () => {
    test("returns activity type by id", async () => {
        const allTypes = await db.select().from(schema.activityTypes)
        const first = allTypes[0]

        const res = await app.request(`/activity-type/${first.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.id).toBe(first.id)
        expect(body.name).toBe(first.name)
    })

    test("nonexistent id returns 404", async () => {
        const res = await app.request("/activity-type/99999", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(404)
    })
})

describe("POST /activity-type", () => {
    test("admin creates activity type", async () => {
        const res = await app.request("/activity-type", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({
                name: "New Type",
                code: "NW",
                billable: true,
            }),
        })
        // responseValidator makes POST return 200 instead of 201
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.name).toBe("New Type")
        expect(body.code).toBe("NW")
        expect(body.billable).toBe(true)
    })

    test("duplicate code returns 400", async () => {
        const res = await app.request("/activity-type", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({
                name: "Duplicate",
                code: "NW",
                billable: false,
            }),
        })
        expect(res.status).toBe(400)

        const body = await res.json()
        expect(body.error).toBeDefined()
    })

    test("non-admin returns 403", async () => {
        const res = await app.request("/activity-type", {
            method: "POST",
            headers: jsonHeaders(userToken),
            body: JSON.stringify({
                name: "Forbidden",
                code: "FB",
                billable: true,
            }),
        })
        expect(res.status).toBe(403)
    })
})

describe("PUT /activity-type/:id", () => {
    test("admin updates activity type", async () => {
        const allTypes = await db.select().from(schema.activityTypes)
        const target = allTypes.find((t) => t.code === "NW")!

        const res = await app.request(`/activity-type/${target.id}`, {
            method: "PUT",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ name: "Updated Name" }),
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.name).toBe("Updated Name")
        expect(body.code).toBe("NW")
    })

    test("code change to existing code returns 400", async () => {
        const allTypes = await db.select().from(schema.activityTypes)
        const target = allTypes.find((t) => t.code === "NW")!

        const res = await app.request(`/activity-type/${target.id}`, {
            method: "PUT",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ code: "NT" }),
        })
        expect(res.status).toBe(400)

        const body = await res.json()
        expect(body.error).toBeDefined()
    })

    test("non-admin returns 403", async () => {
        const allTypes = await db.select().from(schema.activityTypes)
        const target = allTypes[0]

        const res = await app.request(`/activity-type/${target.id}`, {
            method: "PUT",
            headers: jsonHeaders(userToken),
            body: JSON.stringify({ name: "Hacked" }),
        })
        expect(res.status).toBe(403)
    })
})

describe("DELETE /activity-type/:id", () => {
    test("admin deletes activity type with no activities", async () => {
        // Create a throwaway type to delete
        const [toDelete] = await db
            .insert(schema.activityTypes)
            .values({
                name: "Deletable",
                code: "DEL",
                billable: false,
                adminOnly: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning()

        const res = await app.request(`/activity-type/${toDelete.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.message).toBeDefined()
    })

    test("delete activity type with activities returns 409", async () => {
        // Create type + project + activity linked to it
        const [typeWithAct] = await db
            .insert(schema.activityTypes)
            .values({
                name: "Has Activities",
                code: "HA",
                billable: true,
                adminOnly: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning()

        const [project] = await db
            .insert(schema.projects)
            .values({
                name: "Test Project",
                startDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning()

        await db.insert(schema.activities).values({
            userId: userId,
            date: new Date(),
            duration: 1,
            kilometers: 0,
            expenses: 0,
            rate: 100,
            projectId: project.id,
            activityTypeId: typeWithAct.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request(`/activity-type/${typeWithAct.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(409)
    })

    test("non-admin returns 403", async () => {
        const allTypes = await db.select().from(schema.activityTypes)
        const target = allTypes[0]

        const res = await app.request(`/activity-type/${target.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${userToken}` },
        })
        expect(res.status).toBe(403)
    })
})
