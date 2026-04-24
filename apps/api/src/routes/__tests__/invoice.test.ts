import { describe, test, expect, beforeAll, mock } from "bun:test"
import { Hono } from "hono"
import { createTestDb, seedUsers, schema } from "../../__tests__/helpers/setup"
import { errorHandler } from "../../tools/error-handler"

const { db, sqlite } = createTestDb()
mock.module("../../db/index", () => ({ db, sqlite }))

const { invoiceRoutes } = await import("../invoice")

const app = new Hono().onError(errorHandler).route("/invoice", invoiceRoutes)

let adminToken: string
let userToken: string
let superAdminId: number
let projectId: number

const jsonHeaders = (token: string) => ({
	"Content-Type": "application/json",
	Authorization: `Bearer ${token}`,
})

const makeInvoice = (overrides: Record<string, unknown> = {}) => ({
	projectId,
	description: "Test invoice",
	issueDate: "2026-01-01",
	periodStart: "2026-01-01",
	periodEnd: "2026-01-31",
	...overrides,
})

beforeAll(async () => {
	const seed = await seedUsers(db)
	adminToken = seed.adminToken
	userToken = seed.userToken
	superAdminId = seed.superAdmin.id

	const [project] = await db
		.insert(schema.projects)
		.values({ name: "Test Project", startDate: new Date() })
		.returning()
	projectId = project.id

	// Make regular user a project manager so they can access invoices
	await db.insert(schema.projectUsers).values({
		projectId,
		userId: seed.user.id,
		role: "manager",
	})
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isVisaValidationError = (body: any) =>
	body.code === "VALIDATION_ERROR" &&
	body.details?.some((d: { field: string }) => d.field === "visaByUserId")

const createInvoiceInDb = async (status = "draft", visaByUserId: number | null = null) => {
	const [inv] = await db
		.insert(schema.invoices)
		.values({
			projectId,
			invoiceNumber: "TEST-001",
			description: "Test",
			status,
			type: "invoice",
			billingMode: "accordingToData",
			issueDate: new Date("2026-01-01"),
			periodStart: new Date("2026-01-01"),
			periodEnd: new Date("2026-01-31"),
			visaByUserId,
		})
		.returning()
	return inv.id
}

describe("visaByUserId required for controle/vise/sent", () => {
	test("POST controle without visaByUserId returns 400", async () => {
		const res = await app.request("/invoice", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify(makeInvoice({ status: "controle" })),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(isVisaValidationError(body)).toBe(true)
	})

	test("POST controle with visaByUserId passes visa validation", async () => {
		const res = await app.request("/invoice", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify(
				makeInvoice({ status: "controle", visaByUserId: superAdminId })
			),
		})
		const body = await res.json()
		expect(isVisaValidationError(body)).toBe(false)
	})

	test("POST draft without visaByUserId passes visa validation", async () => {
		const res = await app.request("/invoice", {
			method: "POST",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify(makeInvoice({ status: "draft" })),
		})
		const body = await res.json()
		expect(isVisaValidationError(body)).toBe(false)
	})

	test("PUT to controle without visaByUserId returns 400", async () => {
		const id = await createInvoiceInDb()

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ status: "controle" }),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(isVisaValidationError(body)).toBe(true)
	})

	test("PUT to controle with visaByUserId passes visa validation", async () => {
		const id = await createInvoiceInDb()

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ status: "controle", visaByUserId: superAdminId }),
		})
		const body = await res.json()
		expect(isVisaValidationError(body)).toBe(false)
	})

	test("PUT to sent without visaByUserId returns 400", async () => {
		const id = await createInvoiceInDb()

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ status: "sent" }),
		})
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(isVisaValidationError(body)).toBe(true)
	})
})

describe("invoice locking", () => {
	test("non-admin cannot edit sent invoice", async () => {
		const id = await createInvoiceInDb("sent", superAdminId)

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ description: "updated" }),
		})
		expect(res.status).toBe(403)
	})

	test("admin can edit sent invoice", async () => {
		const id = await createInvoiceInDb("sent", superAdminId)

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ description: "updated" }),
		})
		// Should not be 403 (may be response validation error but not a lock error)
		expect(res.status).not.toBe(403)
	})

	test("non-admin cannot edit vise invoice", async () => {
		const id = await createInvoiceInDb("vise", superAdminId)

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ description: "updated" }),
		})
		expect(res.status).toBe(403)
	})

	test("admin can edit vise invoice", async () => {
		const id = await createInvoiceInDb("vise", superAdminId)

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(adminToken),
			body: JSON.stringify({ description: "updated" }),
		})
		expect(res.status).not.toBe(403)
	})

	test("non-admin can edit controle invoice", async () => {
		const id = await createInvoiceInDb("controle", superAdminId)

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(userToken),
			body: JSON.stringify({ description: "updated" }),
		})
		expect(res.status).not.toBe(403)
	})

	test("non-admin cannot delete sent invoice", async () => {
		const id = await createInvoiceInDb("sent", superAdminId)

		const res = await app.request(`/invoice/${id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(400)
	})

	test("non-admin cannot delete vise invoice", async () => {
		const id = await createInvoiceInDb("vise", superAdminId)

		const res = await app.request(`/invoice/${id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${userToken}` },
		})
		expect(res.status).toBe(400)
	})
})

describe("invoice export", () => {
	const XLSX_CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

	test("GET /invoice/export returns xlsx buffer", async () => {
		const res = await app.request("/invoice/export", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		expect(res.headers.get("content-type")).toBe(XLSX_CT)
		const buf = await res.arrayBuffer()
		expect(buf.byteLength).toBeGreaterThan(0)
	})

	test("GET /invoice/export?perUser=true&fromDate=2025-01-01 honors filters", async () => {
		const res = await app.request(
			"/invoice/export?perUser=true&fromDate=2025-01-01",
			{ headers: { Authorization: `Bearer ${adminToken}` } }
		)
		expect(res.status).toBe(200)
		expect(res.headers.get("content-type")).toBe(XLSX_CT)
		expect(res.headers.get("content-disposition")).toContain("factures-")
	})

	test("GET /invoice/export requires auth", async () => {
		const res = await app.request("/invoice/export")
		expect(res.status).toBe(401)
	})
})
