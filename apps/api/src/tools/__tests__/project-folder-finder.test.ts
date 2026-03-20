import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { mkdirSync, rmSync } from "fs"
import path from "path"
import { findProjectFolder } from "../project-folder-finder"

const tmpDir = path.join(import.meta.dir, "__tmp_project_finder__")

beforeAll(() => {
	// Create test directory structure
	mkdirSync(path.join(tmpDir, "1000 - 1200", "1001 ProjectA"), { recursive: true })
	mkdirSync(path.join(tmpDir, "1000 - 1200", "1100 ProjectB"), { recursive: true })
	mkdirSync(path.join(tmpDir, "1200 - 1400", "1300-ProjectC"), { recursive: true })
	mkdirSync(path.join(tmpDir, "misc"), { recursive: true })
})

afterAll(() => {
	rmSync(tmpDir, { recursive: true, force: true })
})

describe("findProjectFolder", () => {
	test("finds project in range folder", async () => {
		const results = await findProjectFolder(tmpDir, "1001")
		expect(results).toHaveLength(1)
		expect(results[0].projectNumber).toBe("1001")
		expect(results[0].folderName).toBe("1001 ProjectA")
	})

	test("finds project with dash separator", async () => {
		const results = await findProjectFolder(tmpDir, 1300)
		expect(results).toHaveLength(1)
		expect(results[0].folderName).toBe("1300-ProjectC")
	})

	test("returns empty for nonexistent project", async () => {
		const results = await findProjectFolder(tmpDir, "9999")
		expect(results).toHaveLength(0)
	})

	test("throws for nonexistent base dir", async () => {
		expect(findProjectFolder("/nonexistent/path", "1001")).rejects.toThrow()
	})

	test("accepts number input", async () => {
		const results = await findProjectFolder(tmpDir, 1100)
		expect(results).toHaveLength(1)
		expect(results[0].folderName).toBe("1100 ProjectB")
	})
})
