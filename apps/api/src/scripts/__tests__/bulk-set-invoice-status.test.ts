import { describe, test, expect, beforeAll } from "bun:test"
import { createTestDb } from "../../__tests__/helpers/setup"
import * as schema from "../../db/schema"
import { eq } from "drizzle-orm"
import { bulkSetInvoiceStatus, parseCsv } from "../bulk-set-invoice-status"

const { db } = createTestDb()

let projectId: number

beforeAll(async () => {
    const [project] = await db
        .insert(schema.projects)
        .values({
            name: "Test Project",
            projectNumber: "TEST-001",
            startDate: new Date("2020-01-01"),
        })
        .returning()
    projectId = project.id

    // Pre-2025 draft
    await db.insert(schema.invoices).values({
        projectId,
        invoiceNumber: "OLD-001",
        status: "draft",
        issueDate: new Date("2024-06-01"),
        periodStart: new Date("2024-05-01"),
        periodEnd: new Date("2024-05-31"),
    })
    // Pre-2025 already sent (should not be affected)
    await db.insert(schema.invoices).values({
        projectId,
        invoiceNumber: "OLD-SENT",
        status: "sent",
        issueDate: new Date("2024-07-01"),
        periodStart: new Date("2024-06-01"),
        periodEnd: new Date("2024-06-30"),
    })
    // 2025 draft (should not be affected by pre-2025)
    await db.insert(schema.invoices).values({
        projectId,
        invoiceNumber: "NEW-001",
        status: "draft",
        issueDate: new Date("2025-03-01"),
        periodStart: new Date("2025-02-01"),
        periodEnd: new Date("2025-02-28"),
    })
    // Target of CSV flip
    await db.insert(schema.invoices).values({
        projectId,
        invoiceNumber: "CSV-001",
        status: "draft",
        issueDate: new Date("2025-04-01"),
        periodStart: new Date("2025-03-01"),
        periodEnd: new Date("2025-03-31"),
    })
    // Not in CSV
    await db.insert(schema.invoices).values({
        projectId,
        invoiceNumber: "CSV-002",
        status: "draft",
        issueDate: new Date("2025-04-02"),
        periodStart: new Date("2025-03-01"),
        periodEnd: new Date("2025-03-31"),
    })
})

describe("parseCsv", () => {
    test("parses header + rows, only truthy sent values", () => {
        const csv = `invoiceNumber,sent\nA-1,1\nA-2,0\nA-3,true\nA-4,false\nA-5,yes\nA-6,\n`
        expect(parseCsv(csv)).toEqual(["A-1", "A-3", "A-5"])
    })

    test("works without header", () => {
        expect(parseCsv("X-1,1\nX-2,0")).toEqual(["X-1"])
    })

    test("empty input returns []", () => {
        expect(parseCsv("")).toEqual([])
    })
})

describe("bulkSetInvoiceStatus pre-2025 mode", () => {
    test("flips only pre-2025 drafts to sent", async () => {
        const result = await bulkSetInvoiceStatus({ kind: "pre-2025" }, db)
        expect(result.flipped).toBe(1)
        expect(result.unmatched).toEqual([])

        const old = await db
            .select()
            .from(schema.invoices)
            .where(eq(schema.invoices.invoiceNumber, "OLD-001"))
        expect(old[0].status).toBe("sent")

        const oldSent = await db
            .select()
            .from(schema.invoices)
            .where(eq(schema.invoices.invoiceNumber, "OLD-SENT"))
        expect(oldSent[0].status).toBe("sent")

        const newDraft = await db
            .select()
            .from(schema.invoices)
            .where(eq(schema.invoices.invoiceNumber, "NEW-001"))
        expect(newDraft[0].status).toBe("draft")
    })
})

describe("bulkSetInvoiceStatus csv mode", () => {
    test("flips matching invoices and reports unmatched", async () => {
        const csv = `invoiceNumber,sent\nCSV-001,1\nCSV-002,0\nDOES-NOT-EXIST,1\n`
        const result = await bulkSetInvoiceStatus({ kind: "csv", csvText: csv }, db)

        expect(result.flipped).toBe(1)
        expect(result.unmatched).toEqual(["DOES-NOT-EXIST"])

        const csv1 = await db
            .select()
            .from(schema.invoices)
            .where(eq(schema.invoices.invoiceNumber, "CSV-001"))
        expect(csv1[0].status).toBe("sent")

        const csv2 = await db
            .select()
            .from(schema.invoices)
            .where(eq(schema.invoices.invoiceNumber, "CSV-002"))
        expect(csv2[0].status).toBe("draft")
    })
})
