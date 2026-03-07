import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

// Create in-memory test DB
const { db, sqlite } = createTestDb()

// Mock db module BEFORE dynamic imports
mock.module("../../db/index", () => ({ db, sqlite }))

// Dynamic import routes AFTER mock
const { statusRoutes } = await import("../status")

// Build test app
const app = new Hono().onError(errorHandler).route("/status", statusRoutes)

// Seed data (status route doesn't require auth, but we set up for consistency)
beforeAll(async () => {
	await seedUsers(db)
})

describe("GET /status", () => {
	test("returns 200 with ok status and connected database", async () => {
		const res = await app.request("/status")
		expect(res.status).toBe(200)

		const body = await res.json()
		expect(body.status).toBe("ok")
		expect(body.database).toBe("connected")
	})
})
