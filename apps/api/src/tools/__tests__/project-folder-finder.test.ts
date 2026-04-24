import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test"
import { mkdirSync, rmSync } from "fs"
import path from "path"

const tmpDir = path.join(import.meta.dir, "__tmp_project_finder__")
const rootMandats = path.join(tmpDir, "mandats")
const rootPhotographies = path.join(tmpDir, "photographies")
const rootSig = path.join(tmpDir, "sig-mandats")

mock.module("@src/config", () => ({
	PROJECT_BASE_DIR: rootMandats,
	PROJECT_ROOTS: [
		{ key: "mandats", path: rootMandats, label: "Mandats" },
		{ key: "photographies", path: rootPhotographies, label: "Photographies" },
		{ key: "sigMandats", path: rootSig, label: "SIG Mandats" },
	],
}))

const { findProjectFolder, findProjectFoldersAcrossRoots } = await import(
	"../project-folder-finder"
)

beforeAll(() => {
	// Mandats root
	mkdirSync(path.join(rootMandats, "1000 - 1200", "1001 ProjectA"), { recursive: true })
	mkdirSync(path.join(rootMandats, "1000 - 1200", "1100 ProjectB"), { recursive: true })
	mkdirSync(path.join(rootMandats, "1200 - 1400", "1300-ProjectC"), { recursive: true })
	mkdirSync(path.join(rootMandats, "misc"), { recursive: true })
	// Photographies root also has project 1100
	mkdirSync(path.join(rootPhotographies, "1000 - 1200", "1100 PhotoB"), { recursive: true })
	// SIG Mandats root has project 1001
	mkdirSync(path.join(rootSig, "1000 - 1200", "1001 SigA"), { recursive: true })
})

afterAll(() => {
	rmSync(tmpDir, { recursive: true, force: true })
})

describe("findProjectFolder", () => {
	test("finds project in range folder", async () => {
		const results = await findProjectFolder(rootMandats, "1001")
		expect(results).toHaveLength(1)
		expect(results[0].projectNumber).toBe("1001")
		expect(results[0].folderName).toBe("1001 ProjectA")
	})

	test("finds project with dash separator", async () => {
		const results = await findProjectFolder(rootMandats, 1300)
		expect(results).toHaveLength(1)
		expect(results[0].folderName).toBe("1300-ProjectC")
	})

	test("returns empty for nonexistent project", async () => {
		const results = await findProjectFolder(rootMandats, "9999")
		expect(results).toHaveLength(0)
	})

	test("throws for nonexistent base dir", async () => {
		expect(findProjectFolder("/nonexistent/path", "1001")).rejects.toThrow()
	})

	test("accepts number input", async () => {
		const results = await findProjectFolder(rootMandats, 1100)
		expect(results).toHaveLength(1)
		expect(results[0].folderName).toBe("1100 ProjectB")
	})
})

describe("findProjectFoldersAcrossRoots", () => {
	test("returns matches from every root that has the project", async () => {
		const matches = await findProjectFoldersAcrossRoots(1100)
		expect(matches).toHaveLength(2)
		const sources = matches.map((m) => m.source).sort()
		expect(sources).toEqual(["mandats", "photographies"])
		const mandatsMatch = matches.find((m) => m.source === "mandats")!
		expect(mandatsMatch.sourceLabel).toBe("Mandats")
		expect(mandatsMatch.folderName).toBe("1100 ProjectB")
		// fullPath is stripped of the root prefix
		expect(mandatsMatch.fullPath.startsWith("/")).toBe(true)
		expect(mandatsMatch.fullPath.includes(rootMandats)).toBe(false)
	})

	test("returns matches from mandats + sig when both contain the project", async () => {
		const matches = await findProjectFoldersAcrossRoots("1001")
		expect(matches.map((m) => m.source).sort()).toEqual(["mandats", "sigMandats"])
	})

	test("returns empty when no root contains the project", async () => {
		const matches = await findProjectFoldersAcrossRoots("9999")
		expect(matches).toEqual([])
	})

	test("skips roots that do not exist", async () => {
		// Temporarily nuke a root
		rmSync(rootSig, { recursive: true, force: true })
		const matches = await findProjectFoldersAcrossRoots("1001")
		expect(matches).toHaveLength(1)
		expect(matches[0].source).toBe("mandats")
		// Restore
		mkdirSync(path.join(rootSig, "1000 - 1200", "1001 SigA"), { recursive: true })
	})
})
