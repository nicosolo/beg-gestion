import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
    getTodayRange,
    getWeekRange,
    getMonthRange,
    getYearRange,
    shiftDayRange,
    shiftWeekRange,
    shiftMonthRange,
    shiftYearRange,
    detectPreset,
    normaliseFromDate,
    normaliseToDate,
    startOfDay,
    endOfDay,
} from "@/composables/utils/useDateRangePresets"

// Fixed reference: Wednesday 2025-03-19 12:30:00
const REF = new Date(2025, 2, 19, 12, 30, 0)

describe("useDateRangePresets", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(REF)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe("startOfDay / endOfDay", () => {
        it("startOfDay sets time to 00:00:00.000", () => {
            const result = startOfDay(REF)
            expect(result.getHours()).toBe(0)
            expect(result.getMinutes()).toBe(0)
            expect(result.getSeconds()).toBe(0)
            expect(result.getMilliseconds()).toBe(0)
        })

        it("endOfDay sets time to 23:59:59.999", () => {
            const result = endOfDay(REF)
            expect(result.getHours()).toBe(23)
            expect(result.getMinutes()).toBe(59)
            expect(result.getSeconds()).toBe(59)
            expect(result.getMilliseconds()).toBe(999)
        })
    })

    describe("getTodayRange", () => {
        it("returns start and end of today", () => {
            const { from, to } = getTodayRange()
            expect(from).toEqual(startOfDay(REF))
            expect(to).toEqual(endOfDay(REF))
        })

        it("uses referenceDate when provided", () => {
            const ref = new Date(2025, 0, 1, 10, 0, 0)
            const { from, to } = getTodayRange(ref)
            expect(from.getDate()).toBe(1)
            expect(from.getMonth()).toBe(0)
            expect(to.getDate()).toBe(1)
        })
    })

    describe("getWeekRange", () => {
        it("returns Monday to Sunday", () => {
            // 2025-03-19 is a Wednesday
            const { from, to } = getWeekRange()
            expect(from.getDay()).toBe(1) // Monday
            expect(from.getDate()).toBe(17) // March 17
            expect(to.getDay()).toBe(0) // Sunday
            expect(to.getDate()).toBe(23) // March 23
        })

        it("handles Sunday reference (wraps to previous Monday)", () => {
            const sunday = new Date(2025, 2, 23, 12, 0, 0)
            const { from, to } = getWeekRange(sunday)
            expect(from.getDate()).toBe(17)
            expect(to.getDate()).toBe(23)
        })
    })

    describe("getMonthRange", () => {
        it("returns 1st to last day of month", () => {
            const { from, to } = getMonthRange()
            expect(from.getDate()).toBe(1)
            expect(from.getMonth()).toBe(2) // March
            expect(to.getDate()).toBe(31)
            expect(to.getMonth()).toBe(2)
        })

        it("handles February in leap year", () => {
            const feb = new Date(2024, 1, 15)
            const { from, to } = getMonthRange(feb)
            expect(from.getDate()).toBe(1)
            expect(to.getDate()).toBe(29)
        })
    })

    describe("getYearRange", () => {
        it("returns Jan 1 to Dec 31", () => {
            const { from, to } = getYearRange()
            expect(from.getMonth()).toBe(0)
            expect(from.getDate()).toBe(1)
            expect(to.getMonth()).toBe(11)
            expect(to.getDate()).toBe(31)
        })

        it("supports yearsBefore parameter", () => {
            const { from, to } = getYearRange(REF, 2)
            expect(from.getFullYear()).toBe(2023)
            expect(to.getFullYear()).toBe(2025)
        })
    })

    describe("shiftDayRange", () => {
        it("shifts forward by 1 day", () => {
            const { from, to } = shiftDayRange(REF, 1)
            expect(from.getDate()).toBe(20)
            expect(to.getDate()).toBe(20)
        })

        it("shifts backward by 1 day", () => {
            const { from, to } = shiftDayRange(REF, -1)
            expect(from.getDate()).toBe(18)
            expect(to.getDate()).toBe(18)
        })

        it("defaults to today when currentFrom is undefined", () => {
            const { from } = shiftDayRange(undefined, 1)
            expect(from.getDate()).toBe(20) // today + 1
        })
    })

    describe("shiftWeekRange", () => {
        it("shifts forward by 1 week", () => {
            const monday = new Date(2025, 2, 17)
            const { from } = shiftWeekRange(monday, 1)
            expect(from.getDate()).toBe(24) // next Monday
        })

        it("shifts backward by 1 week", () => {
            const monday = new Date(2025, 2, 17)
            const { from } = shiftWeekRange(monday, -1)
            expect(from.getDate()).toBe(10) // previous Monday
        })
    })

    describe("shiftMonthRange", () => {
        it("shifts to next month", () => {
            const { from, to } = shiftMonthRange(REF, 1)
            expect(from.getMonth()).toBe(3) // April
            expect(from.getDate()).toBe(1)
            expect(to.getMonth()).toBe(3)
            expect(to.getDate()).toBe(30)
        })

        it("shifts to previous month", () => {
            const { from, to } = shiftMonthRange(REF, -1)
            expect(from.getMonth()).toBe(1) // February
            expect(from.getDate()).toBe(1)
            expect(to.getMonth()).toBe(1)
            expect(to.getDate()).toBe(28) // 2025 is not a leap year
        })
    })

    describe("shiftYearRange", () => {
        it("shifts to next year", () => {
            const { from, to } = shiftYearRange(REF, 1)
            expect(from.getFullYear()).toBe(2026)
            expect(to.getFullYear()).toBe(2026)
        })

        it("shifts to previous year", () => {
            const { from, to } = shiftYearRange(REF, -1)
            expect(from.getFullYear()).toBe(2024)
            expect(to.getFullYear()).toBe(2024)
        })
    })

    describe("detectPreset", () => {
        it("detects today preset", () => {
            const { from, to } = getTodayRange()
            expect(detectPreset(from, to)).toBe("today")
        })

        it("detects week preset", () => {
            const { from, to } = getWeekRange()
            expect(detectPreset(from, to)).toBe("week")
        })

        it("detects month preset", () => {
            const { from, to } = getMonthRange()
            expect(detectPreset(from, to)).toBe("month")
        })

        it("detects year preset", () => {
            const { from, to } = getYearRange()
            expect(detectPreset(from, to)).toBe("year")
        })

        it("returns allTime when from/to undefined", () => {
            expect(detectPreset(undefined, undefined)).toBe("allTime")
            expect(detectPreset(undefined, new Date())).toBe("allTime")
        })

        it("returns null for custom range", () => {
            const from = new Date(2025, 0, 5)
            const to = new Date(2025, 0, 20)
            expect(detectPreset(from, to)).toBeNull()
        })
    })

    describe("normaliseFromDate / normaliseToDate", () => {
        it("normaliseFromDate returns start of day", () => {
            const result = normaliseFromDate(REF)
            expect(result.getHours()).toBe(0)
            expect(result.getMinutes()).toBe(0)
            expect(result.getSeconds()).toBe(0)
            expect(result.getMilliseconds()).toBe(0)
        })

        it("normaliseToDate returns end of day", () => {
            const result = normaliseToDate(REF)
            expect(result.getHours()).toBe(23)
            expect(result.getMinutes()).toBe(59)
            expect(result.getSeconds()).toBe(59)
            expect(result.getMilliseconds()).toBe(999)
        })
    })
})
