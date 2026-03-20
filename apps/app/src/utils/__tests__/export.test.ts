import { describe, it, expect } from "vitest"
import {
    escapeCSV,
    generateCSV,
    getNestedValue,
    formatDateForExport,
    formatDurationForExport,
    formatCurrencyForExport,
} from "@/utils/export"
import type { ExportColumn } from "@/utils/export"

describe("escapeCSV", () => {
    it("wraps value containing comma in quotes", () => {
        expect(escapeCSV("hello, world")).toBe('"hello, world"')
    })

    it("double-escapes quotes and wraps in quotes", () => {
        expect(escapeCSV('say "hi"')).toBe('"say ""hi"""')
    })

    it("wraps value containing newline in quotes", () => {
        expect(escapeCSV("line1\nline2")).toBe('"line1\nline2"')
    })

    it("returns plain string when no special chars", () => {
        expect(escapeCSV("hello")).toBe("hello")
    })

    it("returns empty string for null", () => {
        expect(escapeCSV(null as unknown as string)).toBe("")
    })
})

describe("getNestedValue", () => {
    it("returns nested value with dot notation", () => {
        expect(getNestedValue({ a: { b: 1 } }, "a.b")).toBe(1)
    })

    it("returns top-level value", () => {
        expect(getNestedValue({ name: "test" }, "name")).toBe("test")
    })

    it("returns null for missing path", () => {
        expect(getNestedValue({ a: 1 }, "b.c")).toBeNull()
    })

    it("returns null when obj is null", () => {
        expect(getNestedValue(null, "a")).toBeNull()
    })
})

describe("generateCSV", () => {
    it("generates CSV with headers and data rows", () => {
        const columns: ExportColumn[] = [
            { key: "name", label: "Name" },
            { key: "age", label: "Age" },
        ]
        const data = [
            { name: "Alice", age: 30 },
            { name: "Bob", age: 25 },
        ]

        const csv = generateCSV(columns, data)
        const lines = csv.split("\n")

        expect(lines[0]).toBe("Name,Age")
        expect(lines[1]).toBe("Alice,30")
        expect(lines[2]).toBe("Bob,25")
    })

    it("applies formatter when provided", () => {
        const columns: ExportColumn[] = [
            { key: "amount", label: "Amount", formatter: (v) => `CHF ${v}` },
        ]
        const data = [{ amount: 100 }]

        const csv = generateCSV(columns, data)
        expect(csv).toContain("CHF 100")
    })

    it("uses nested keys", () => {
        const columns: ExportColumn[] = [{ key: "user.name", label: "User" }]
        const data = [{ user: { name: "Alice" } }]

        const csv = generateCSV(columns, data)
        expect(csv).toContain("Alice")
    })

    it("handles empty data", () => {
        const columns: ExportColumn[] = [{ key: "name", label: "Name" }]
        const csv = generateCSV(columns, [])
        expect(csv).toBe("Name")
    })
})

describe("formatDateForExport", () => {
    it("formats Date object to ISO date", () => {
        const date = new Date("2024-06-15T10:30:00Z")
        expect(formatDateForExport(date)).toBe("2024-06-15")
    })

    it("formats date string to ISO date", () => {
        expect(formatDateForExport("2024-06-15T10:30:00Z")).toBe("2024-06-15")
    })

    it("returns empty string for null", () => {
        expect(formatDateForExport(null)).toBe("")
    })
})

describe("formatDurationForExport", () => {
    it("formats 90 minutes as 1:30", () => {
        expect(formatDurationForExport(90)).toBe("1:30")
    })

    it("formats 60 minutes as 1:00", () => {
        expect(formatDurationForExport(60)).toBe("1:00")
    })

    it("formats 5 minutes as 0:05", () => {
        expect(formatDurationForExport(5)).toBe("0:05")
    })

    it("returns 0:00 for 0", () => {
        expect(formatDurationForExport(0)).toBe("0:00")
    })
})

describe("formatCurrencyForExport", () => {
    it("formats number with 2 decimal places", () => {
        expect(formatCurrencyForExport(1234.5)).toBe("1234.50")
    })

    it("formats integer with .00", () => {
        expect(formatCurrencyForExport(100)).toBe("100.00")
    })

    it("returns 0.00 for null", () => {
        expect(formatCurrencyForExport(null as unknown as number)).toBe("0.00")
    })
})
