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
let userEacToken: string
let superAdminId: number
let userEacId: number
let userId: number
let projectId: number
let eacProjectId: number

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
	userEacToken = seed.userEacToken
	superAdminId = seed.superAdmin.id
	userEacId = seed.userEac.id
	userId = seed.user.id

	const [project] = await db
		.insert(schema.projects)
		.values({ name: "Test Project", startDate: new Date() })
		.returning()
	projectId = project.id

	const [eacProject] = await db
		.insert(schema.projects)
		.values({ name: "EAC Project", subProjectName: "EAC", startDate: new Date() })
		.returning()
	eacProjectId = eacProject.id

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

const createInvoiceInDb = async (
	status: "draft" | "controle" | "vise" | "sent" = "draft",
	visaByUserId: number | null = null,
	inChargeUserId: number | null = null,
	invoiceProjectId: number = projectId
) => {
	const [inv] = await db
		.insert(schema.invoices)
		.values({
			projectId: invoiceProjectId,
			invoiceNumber: "TEST-001",
			description: "Test",
			status,
			type: "invoice",
			billingMode: "accordingToData",
			issueDate: new Date("2026-01-01"),
			periodStart: new Date("2026-01-01"),
			periodEnd: new Date("2026-01-31"),
			visaByUserId,
			inChargeUserId,
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

describe("POST /invoice/:id/visa permissions", () => {
	test("admin permission passes (not 403)", async () => {
		const id = await createInvoiceInDb("controle", superAdminId, userId)

		const res = await app.request(`/invoice/${id}/visa`, {
			method: "POST",
			headers: jsonHeaders(adminToken),
		})
		// Permission check allows admin; response may fail schema validation
		// due to minimal test fixtures, but it should never be 403.
		expect(res.status).not.toBe(403)
	})

	test("user_eac can visa any invoice on an EAC project (not 403)", async () => {
		const id = await createInvoiceInDb("controle", superAdminId, userId, eacProjectId)

		const res = await app.request(`/invoice/${id}/visa`, {
			method: "POST",
			headers: jsonHeaders(userEacToken),
		})
		expect(res.status).not.toBe(403)
	})

	test("user_eac cannot visa invoice on a non-EAC project (403/404)", async () => {
		const id = await createInvoiceInDb("controle", superAdminId, userEacId, projectId)

		const res = await app.request(`/invoice/${id}/visa`, {
			method: "POST",
			headers: jsonHeaders(userEacToken),
		})
		// 404 if findById filtered it out (not manager, not EAC), 403 if it passed but subProjectName mismatch
		expect([403, 404]).toContain(res.status)
	})

	test("regular user cannot visa any invoice (403)", async () => {
		const id = await createInvoiceInDb("controle", superAdminId, userId)

		const res = await app.request(`/invoice/${id}/visa`, {
			method: "POST",
			headers: jsonHeaders(userToken),
		})
		expect(res.status).toBe(403)
	})
})

describe("user_eac write access to EAC invoices", () => {
	test("user_eac can create invoice on EAC project (not 403/500)", async () => {
		const res = await app.request("/invoice", {
			method: "POST",
			headers: jsonHeaders(userEacToken),
			body: JSON.stringify(makeInvoice({ projectId: eacProjectId })),
		})
		expect(res.status).not.toBe(403)
		expect(res.status).not.toBe(500)
	})

	test("user_eac cannot create invoice on non-EAC project (500)", async () => {
		const res = await app.request("/invoice", {
			method: "POST",
			headers: jsonHeaders(userEacToken),
			body: JSON.stringify(makeInvoice({ projectId })),
		})
		expect(res.status).toBe(500)
	})

	test("user_eac can update invoice on EAC project (not 403)", async () => {
		const id = await createInvoiceInDb("draft", null, null, eacProjectId)

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(userEacToken),
			body: JSON.stringify({ description: "updated by eac" }),
		})
		expect(res.status).not.toBe(403)
		expect(res.status).not.toBe(500)
	})

	test("user_eac cannot update invoice on non-EAC project (404)", async () => {
		const id = await createInvoiceInDb("draft", null, null, projectId)

		const res = await app.request(`/invoice/${id}`, {
			method: "PUT",
			headers: jsonHeaders(userEacToken),
			body: JSON.stringify({ description: "should fail" }),
		})
		expect(res.status).toBe(404)
	})

	test("user_eac can delete draft invoice on EAC project", async () => {
		const id = await createInvoiceInDb("draft", null, null, eacProjectId)

		const res = await app.request(`/invoice/${id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${userEacToken}` },
		})
		expect(res.status).toBe(200)
	})

	test("user_eac cannot delete invoice on non-EAC project (404)", async () => {
		const id = await createInvoiceInDb("draft", null, null, projectId)

		const res = await app.request(`/invoice/${id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${userEacToken}` },
		})
		expect(res.status).toBe(404)
	})
})
