import { describe, test, expect } from "bun:test"
import { buildInvoicesWorkbook } from "../invoice-exporter"
import type { InvoiceResponse } from "@beg/validations"
import ExcelJS from "exceljs"

describe("buildInvoicesWorkbook", () => {
    const mockInvoices = [
        {
            id: 1,
            invoiceNumber: "2026-001",
            reference: "Offre XYZ",
            type: "invoice",
            status: "vise",
            issueDate: "2026-01-15",
            totalHT: 10000,
            vatAmount: 810,
            totalTTC: 10810,
            inChargeUser: { id: 1, firstName: "John", lastName: "Doe", initials: "JD" },
            project: {
                id: 1,
                name: "Test Project",
                projectNumber: "2024-001",
                subProjectName: null,
                client: { id: 1, name: "Acme Corp" },
            },
        },
        {
            id: 2,
            invoiceNumber: "2026-002",
            reference: "",
            type: "final_invoice",
            status: "draft",
            issueDate: "2026-02-10",
            totalHT: 5000,
            vatAmount: 405,
            totalTTC: 5405,
            inChargeUser: { id: 2, firstName: "Jane", lastName: "Smith", initials: "JS" },
            project: {
                id: 2,
                name: "Second Project",
                projectNumber: "2024-002",
                subProjectName: null,
                client: { id: 2, name: "Other Client" },
            },
        },
    ]

    test("creates workbook with single sheet", async () => {
        const buffer = await buildInvoicesWorkbook(mockInvoices as unknown as InvoiceResponse[])
        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.byteLength).toBeGreaterThan(0)

        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)
        expect(workbook.worksheets).toHaveLength(1)
        expect(workbook.worksheets[0].name).toBe("Factures")
        // Header + 2 data rows + totals row
        expect(workbook.worksheets[0].rowCount).toBe(4)
    })

    test("creates per-user sheets when perUser option set", async () => {
        const buffer = await buildInvoicesWorkbook(
            mockInvoices as unknown as InvoiceResponse[],
            { perUser: true }
        )
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)
        expect(workbook.worksheets.length).toBe(2)
    })

    test("groups invoices without inChargeUser under 'Sans responsable'", async () => {
        const invoicesWithOrphan = [
            ...mockInvoices,
            {
                id: 3,
                invoiceNumber: "2026-003",
                reference: "",
                type: "invoice",
                status: "draft",
                issueDate: "2026-03-01",
                totalHT: 100,
                vatAmount: 8,
                totalTTC: 108,
                inChargeUser: null,
                project: {
                    id: 1,
                    name: "Test Project",
                    projectNumber: "2024-001",
                    subProjectName: null,
                    client: { id: 1, name: "Acme Corp" },
                },
            },
        ]
        const buffer = await buildInvoicesWorkbook(
            invoicesWithOrphan as unknown as InvoiceResponse[],
            { perUser: true }
        )
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)
        const names = workbook.worksheets.map((w) => w.name)
        expect(names).toContain("Sans responsable")
    })

    test("handles empty invoices array", async () => {
        const buffer = await buildInvoicesWorkbook([] as InvoiceResponse[])
        expect(buffer).toBeInstanceOf(Buffer)
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)
        expect(workbook.worksheets).toHaveLength(1)
    })
})
