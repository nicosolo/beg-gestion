import { describe, test, expect } from "bun:test"
import { buildActivitiesWorkbook } from "../activity-exporter"
import type { ActivityResponse } from "@beg/validations"
import ExcelJS from "exceljs"

describe("buildActivitiesWorkbook", () => {
	const mockActivities = [
		{
			id: 1,
			date: "2024-06-15",
			duration: 2.5,
			kilometers: 10,
			expenses: 50,
			description: "Test activity",
			billed: false,
			disbursement: false,
			rate: 150,
			rateClass: "A",
			createdAt: "2024-06-15T00:00:00Z",
			updatedAt: "2024-06-15T00:00:00Z",
			user: { id: 1, firstName: "John", lastName: "Doe", initials: "JD" },
			project: { id: 1, name: "Test Project", projectNumber: "2024-001" },
			activityType: { id: 1, code: "H", name: "Hours" },
		},
		{
			id: 2,
			date: "2024-06-16",
			duration: 3,
			kilometers: 0,
			expenses: 0,
			description: "Another activity",
			billed: true,
			disbursement: true,
			rate: 150,
			rateClass: "A",
			createdAt: "2024-06-16T00:00:00Z",
			updatedAt: "2024-06-16T00:00:00Z",
			user: { id: 2, firstName: "Jane", lastName: "Smith", initials: "JS" },
			project: { id: 1, name: "Test Project", projectNumber: "2024-001" },
			activityType: { id: 1, code: "H", name: "Hours" },
		},
	]

	test("creates workbook with single sheet", async () => {
		const buffer = await buildActivitiesWorkbook(mockActivities as unknown as ActivityResponse[])
		expect(buffer).toBeInstanceOf(Buffer)
		expect(buffer.byteLength).toBeGreaterThan(0)

		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)
		expect(workbook.worksheets).toHaveLength(1)
		expect(workbook.worksheets[0].name).toBe("Heures")
		// Header + 2 data rows + totals row
		expect(workbook.worksheets[0].rowCount).toBe(4)
	})

	test("includes disbursement column when option set", async () => {
		const buffer = await buildActivitiesWorkbook(mockActivities as unknown as ActivityResponse[], {
			includeDisbursementColumn: true,
		})
		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)
		const headers = workbook.worksheets[0].getRow(1)
		const headerValues = headers.values as string[]
		expect(headerValues).toContain("Débours")
	})

	test("creates per-user sheets when perUser option set", async () => {
		const buffer = await buildActivitiesWorkbook(mockActivities as unknown as ActivityResponse[], {
			perUser: true,
		})
		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)
		expect(workbook.worksheets.length).toBe(2)
	})

	test("handles empty activities array", async () => {
		const buffer = await buildActivitiesWorkbook([] as ActivityResponse[])
		expect(buffer).toBeInstanceOf(Buffer)
		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)
		expect(workbook.worksheets).toHaveLength(1)
	})
})
