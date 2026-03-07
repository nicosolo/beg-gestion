import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { z } from "zod"
import { responseValidator } from "../response-validator"
import { errorHandler } from "../error-handler"

const schema = z.object({ name: z.string() })

describe("responseValidator", () => {
	test("valid data passes through", async () => {
		const app = new Hono()
			.get("/test", responseValidator({ 200: schema }), async (c) => {
				return c.render({ name: "test" }, 200)
			})

		const res = await app.request("/test")
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.name).toBe("test")
	})

	test("invalid data throws validation error", async () => {
		const app = new Hono()
			.onError(errorHandler)
			.get("/test", responseValidator({ 200: schema }), async (c) => {
				return c.render({ name: 123 }, 200)
			})

		const res = await app.request("/test")
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe("RESPONSE_VALIDATION_ERROR")
		expect(body.message).toBe("Validation response error")
	})

	test("unmatched status code returns 500", async () => {
		const app = new Hono()
			.get("/test", responseValidator({ 200: schema }), async (c) => {
				return c.render({ name: "test" }, 201)
			})

		const res = await app.request("/test")
		expect(res.status).toBe(500)
		const body = await res.json()
		expect(body.message).toBe("Invalid!")
	})
})
