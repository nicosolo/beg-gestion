import { describe, it, expect } from "vitest"
import { useFormat } from "@/composables/utils/useFormat"

describe("useFormat", () => {
    const { formatCurrency, formatPercentage, formatNumber, formatDuration, formatDate, nl2br } =
        useFormat()

    describe("formatCurrency", () => {
        it("formats amount with currency suffix by default", () => {
            const result = formatCurrency(1234.56)
            // Should contain the formatted number and ".-" suffix
            expect(result).toContain(".-")
            expect(result).toContain("1")
        })

        it("formats amount without suffix when showCurrency is false", () => {
            const result = formatCurrency(1234.56, false)
            expect(result).not.toContain(".-")
        })

        it("rounds to nearest 0.05 (5 centimes)", () => {
            // 1234.57 rounds to 1234.55 with Math.round(amount * 20) / 20
            const result = formatCurrency(1234.57)
            expect(result).toMatch(/1.?234\.55/)
        })

        it("formats zero", () => {
            const result = formatCurrency(0)
            expect(result).toContain("0.00")
        })
    })

    describe("formatPercentage", () => {
        it("formats decimal as percentage", () => {
            const result = formatPercentage(0.15)
            // de-CH locale: "15.00%"  or "15,00%"
            expect(result).toMatch(/15[.,]00/)
            expect(result).toContain("%")
        })

        it("formats zero percentage", () => {
            const result = formatPercentage(0)
            expect(result).toMatch(/0[.,]00/)
            expect(result).toContain("%")
        })
    })

    describe("formatNumber", () => {
        it("formats number in de-CH locale", () => {
            const result = formatNumber(1234567)
            // de-CH uses apostrophe or narrow space as thousands separator
            expect(result).toMatch(/1.?234.?567/)
        })
    })

    describe("formatDuration", () => {
        it("formats duration with 2 decimal places", () => {
            const result = formatDuration(2.5)
            expect(result).toMatch(/2[.,]50/)
        })

        it("returns '-' for null", () => {
            expect(formatDuration(null)).toBe("-")
        })

        it("returns '-' for undefined", () => {
            expect(formatDuration(undefined)).toBe("-")
        })

        it("formats zero duration", () => {
            const result = formatDuration(0)
            expect(result).toMatch(/0[.,]00/)
        })
    })

    describe("formatDate", () => {
        it("formats date in fr-CH locale", () => {
            const result = formatDate(new Date(2024, 0, 15))
            // fr-CH: "15.01.2024" or "15/01/2024"
            expect(result).toMatch(/15/)
            expect(result).toMatch(/01/)
            expect(result).toMatch(/2024/)
        })

        it("returns 'N/A' for null", () => {
            expect(formatDate(null)).toBe("N/A")
        })

        it("returns 'N/A' for undefined", () => {
            expect(formatDate(undefined)).toBe("N/A")
        })
    })

    describe("nl2br", () => {
        it("converts single newline to <br>", () => {
            expect(nl2br("a\nb")).toBe("a<br>b")
        })

        it("converts double newline to <br>", () => {
            expect(nl2br("a\n\nb")).toBe("a<br>b")
        })

        it("escapes HTML tags to prevent XSS", () => {
            const result = nl2br("<script>alert('xss')</script>")
            expect(result).not.toContain("<script>")
            expect(result).toContain("&lt;script&gt;")
        })

        it("escapes quotes and ampersands", () => {
            const result = nl2br('a & "b" & \'c\'')
            expect(result).toContain("&amp;")
            expect(result).toContain("&quot;")
            expect(result).toContain("&#039;")
        })

        it("returns empty string for null", () => {
            expect(nl2br(null)).toBe("")
        })

        it("returns empty string for undefined", () => {
            expect(nl2br(undefined)).toBe("")
        })

        it("returns empty string for empty string", () => {
            expect(nl2br("")).toBe("")
        })
    })
})
