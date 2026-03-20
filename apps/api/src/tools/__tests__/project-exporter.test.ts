import { describe, test, expect } from "bun:test"
import { buildProjectsWorkbook } from "../project-exporter"
import type { ProjectResponse } from "@beg/validations"
import ExcelJS from "exceljs"

describe("buildProjectsWorkbook", () => {
	const mockProjects = [
		{
			id: 1,
			name: "Test Project",
			projectNumber: "2024-001",
			startDate: "2024-01-01",
			firstActivityDate: "2024-01-15",
			lastActivityDate: "2024-06-15",
			totalDuration: 100,
			unBilledDuration: 25,
			client: { id: 1, name: "Acme Corp" },
			engineer: { id: 1, name: "Jean Dupont" },
			location: { id: 1, name: "Geneva" },
			projectManagers: [
				{ id: 1, firstName: "John", lastName: "Doe", initials: "JD" },
			],
		},
		{
			id: 2,
			name: "Second Project",
			projectNumber: "2024-002",
			startDate: "2024-02-01",
			totalDuration: 50,
			unBilledDuration: 50,
			projectManagers: [],
		},
	]

	test("creates workbook with single sheet", async () => {
		const buffer = await buildProjectsWorkbook(mockProjects as unknown as ProjectResponse[])
		expect(buffer).toBeInstanceOf(Buffer)
		expect(buffer.byteLength).toBeGreaterThan(0)

		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)
		expect(workbook.worksheets).toHaveLength(1)
		expect(workbook.worksheets[0].name).toBe("Mandats")
	})

	test("creates per-manager sheets when perUser option set", async () => {
		const buffer = await buildProjectsWorkbook(mockProjects as unknown as ProjectResponse[], {
			perUser: true,
		})
		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)
		// One sheet for "John Doe (JD)" and one for "Sans responsable"
		expect(workbook.worksheets.length).toBe(2)
	})

	test("handles empty projects array", async () => {
		const buffer = await buildProjectsWorkbook([] as ProjectResponse[])
		expect(buffer).toBeInstanceOf(Buffer)
		const workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)
		expect(workbook.worksheets).toHaveLength(1)
	})
})
