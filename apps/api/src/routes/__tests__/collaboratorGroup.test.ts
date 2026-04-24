import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { collaboratorGroupRoutes } = await import("../collaboratorGroup")

const app = new Hono()
    .onError(errorHandler)
    .route("/collaborator-group", collaboratorGroupRoutes)

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

describe("GET /collaborator-group", () => {
    test("with auth returns 200 and paginated response", async () => {
        const res = await app.request("/collaborator-group", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.data).toBeDefined()
        expect(Array.isArray(body.data)).toBe(true)
        expect(typeof body.total).toBe("number")
    })

    test("no auth returns 401", async () => {
        const res = await app.request("/collaborator-group")
        expect(res.status).toBe(401)
    })

    test("non-admin user can read", async () => {
        const res = await app.request("/collaborator-group", {
            headers: { Authorization: `Bearer ${userToken}` },
        })
        expect(res.status).toBe(200)
    })
})

describe("GET /collaborator-group/:id", () => {
    test("returns group by id", async () => {
        const createRes = await app.request("/collaborator-group", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ name: "Get Test Group" }),
        })
        const created = await createRes.json()

        const res = await app.request(`/collaborator-group/${created.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.id).toBe(created.id)
        expect(body.name).toBe("Get Test Group")
    })

    test("nonexistent id returns 404", async () => {
        const res = await app.request("/collaborator-group/99999", {
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(404)
    })
})

describe("POST /collaborator-group", () => {
    test("admin creates group returns 200", async () => {
        const res = await app.request("/collaborator-group", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ name: "New Group" }),
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.name).toBe("New Group")
        expect(body.id).toBeDefined()
    })

    test("non-admin returns 403", async () => {
        const res = await app.request("/collaborator-group", {
            method: "POST",
            headers: jsonHeaders(userToken),
            body: JSON.stringify({ name: "Forbidden" }),
        })
        expect(res.status).toBe(403)
    })

    test("no auth returns 401", async () => {
        const res = await app.request("/collaborator-group", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "No Auth" }),
        })
        expect(res.status).toBe(401)
    })
})

describe("PUT /collaborator-group/:id", () => {
    test("admin updates group returns 200", async () => {
        const createRes = await app.request("/collaborator-group", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ name: "Before Update" }),
        })
        const created = await createRes.json()

        const res = await app.request(`/collaborator-group/${created.id}`, {
            method: "PUT",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ name: "After Update" }),
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.name).toBe("After Update")
    })

    test("non-admin returns 403", async () => {
        const res = await app.request("/collaborator-group/1", {
            method: "PUT",
            headers: jsonHeaders(userToken),
            body: JSON.stringify({ name: "Hacked" }),
        })
        expect(res.status).toBe(403)
    })
})

describe("DELETE /collaborator-group/:id", () => {
    test("admin deletes group returns 200", async () => {
        const createRes = await app.request("/collaborator-group", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ name: "To Delete" }),
        })
        const created = await createRes.json()

        const res = await app.request(`/collaborator-group/${created.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
    })

    test("admin cannot delete group with assigned users returns 409", async () => {
        const createRes = await app.request("/collaborator-group", {
            method: "POST",
            headers: jsonHeaders(adminToken),
            body: JSON.stringify({ name: "Group With Users" }),
        })
        const group = await createRes.json()

        const [firstUser] = await db.select().from(schema.users).limit(1)
        if (firstUser) {
            await db
                .update(schema.users)
                .set({ groupId: group.id })
                .where(eq(schema.users.id, firstUser.id))
        }

        const res = await app.request(`/collaborator-group/${group.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${adminToken}` },
        })
        expect(res.status).toBe(409)
    })

    test("non-admin returns 403", async () => {
        const res = await app.request("/collaborator-group/1", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${userToken}` },
        })
        expect(res.status).toBe(403)
    })
})
