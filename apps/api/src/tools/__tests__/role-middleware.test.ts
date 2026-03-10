import { describe, test, expect } from "bun:test"
import { Hono } from "hono"
import { hasRole, roleMiddleware } from "../role-middleware"

describe("hasRole", () => {
	test("super_admin has admin role", () => {
		expect(hasRole("super_admin", "admin")).toBe(true)
	})

	test("admin has admin role", () => {
		expect(hasRole("admin", "admin")).toBe(true)
	})

	test("user does not have admin role", () => {
		expect(hasRole("user", "admin")).toBe(false)
	})

	test("user has user role", () => {
		expect(hasRole("user", "user")).toBe(true)
	})

	test("super_admin has super_admin role", () => {
		expect(hasRole("super_admin", "super_admin")).toBe(true)
	})

	test("admin does not have super_admin role", () => {
		expect(hasRole("admin", "super_admin")).toBe(false)
	})
})

describe("roleMiddleware", () => {
	test("returns 403 for user role when admin required", async () => {
		const app = new Hono()
		app.use("*", async (c, next) => {
			c.set("user", { id: 1, email: "u@test.com", role: "user", initials: "UT", name: "User Test", firstName: "User", lastName: "Test" })
			await next()
		})
		app.use("*", roleMiddleware("admin"))
		app.get("/", (c) => c.json({ ok: true }))

		const res = await app.request("/")
		expect(res.status).toBe(403)
		const body = await res.json()
		expect(body.error).toContain("admin")
	})

	test("passes for admin role when admin required", async () => {
		const app = new Hono()
		app.use("*", async (c, next) => {
			c.set("user", { id: 1, email: "a@test.com", role: "admin", initials: "AT", name: "Admin Test", firstName: "Admin", lastName: "Test" })
			await next()
		})
		app.use("*", roleMiddleware("admin"))
		app.get("/", (c) => c.json({ ok: true }))

		const res = await app.request("/")
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.ok).toBe(true)
	})
})
