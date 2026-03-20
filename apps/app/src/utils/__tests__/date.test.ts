import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { formatDate, formatDateTime, toISOString, parseDate, formatRelativeDate } from "../date"

describe("formatDate", () => {
    it("formats Date to DD/MM/YYYY", () => {
        const date = new Date(2024, 0, 15) // Jan 15, 2024
        expect(formatDate(date)).toBe("15/01/2024")
    })

    it("formats string date", () => {
        expect(formatDate("2024-06-01T00:00:00")).toBe("01/06/2024")
    })

    it("returns empty string for null/undefined", () => {
        expect(formatDate(null)).toBe("")
        expect(formatDate(undefined)).toBe("")
    })

    it("returns empty string for invalid date string", () => {
        expect(formatDate("not-a-date")).toBe("")
    })
})

describe("formatDateTime", () => {
    it("includes HH:MM", () => {
        const date = new Date(2024, 0, 15, 14, 30)
        const result = formatDateTime(date)
        expect(result).toBe("15/01/2024 14:30")
    })

    it("pads hours and minutes", () => {
        const date = new Date(2024, 0, 1, 8, 5)
        expect(formatDateTime(date)).toBe("01/01/2024 08:05")
    })
})

describe("toISOString", () => {
    it("returns ISO format", () => {
        const date = new Date("2024-01-15T12:00:00.000Z")
        expect(toISOString(date)).toBe("2024-01-15T12:00:00.000Z")
    })

    it("returns null for null/undefined", () => {
        expect(toISOString(null)).toBeNull()
        expect(toISOString(undefined)).toBeNull()
    })
})

describe("parseDate", () => {
    it("parses valid date string", () => {
        const result = parseDate("2024-01-15")
        expect(result).toBeInstanceOf(Date)
        expect(result!.getFullYear()).toBe(2024)
        expect(result!.getMonth()).toBe(0)
        expect(result!.getDate()).toBe(15)
    })

    it("returns null for null/undefined/empty", () => {
        expect(parseDate(null)).toBeNull()
        expect(parseDate(undefined)).toBeNull()
        expect(parseDate("")).toBeNull()
    })

    it("returns null for invalid string", () => {
        expect(parseDate("not-a-date")).toBeNull()
    })
})

describe("formatRelativeDate", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)) // June 15, 2024 noon
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("returns 'Aujourd'hui' for today", () => {
        const today = new Date(2024, 5, 15, 8, 0, 0)
        expect(formatRelativeDate(today)).toBe("Aujourd'hui")
    })

    it("returns 'Hier' for yesterday", () => {
        const yesterday = new Date(2024, 5, 14, 12, 0, 0)
        expect(formatRelativeDate(yesterday)).toBe("Hier")
    })

    it("returns 'Il y a X jours' for 2-6 days ago", () => {
        const fiveDaysAgo = new Date(2024, 5, 10, 12, 0, 0)
        expect(formatRelativeDate(fiveDaysAgo)).toBe("Il y a 5 jours")
    })

    it("returns formatted date for 7+ days ago", () => {
        const tenDaysAgo = new Date(2024, 5, 5, 12, 0, 0)
        expect(formatRelativeDate(tenDaysAgo)).toBe("05/06/2024")
    })

    it("returns empty string for null/undefined", () => {
        expect(formatRelativeDate(null)).toBe("")
        expect(formatRelativeDate(undefined)).toBe("")
    })
})
