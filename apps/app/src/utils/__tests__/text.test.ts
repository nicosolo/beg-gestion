import { describe, expect, it } from "vitest"
import { truncateText } from "../text"

describe("truncateText", () => {
    it("truncates to specified length and adds ellipsis", () => {
        expect(truncateText("hello world", 5)).toBe("hello...")
    })

    it("returns full text when shorter than limit", () => {
        expect(truncateText("hi", 10)).toBe("hi")
    })

    it("returns empty string for undefined input", () => {
        expect(truncateText(undefined)).toBe("")
    })

    it("returns empty string for empty string input", () => {
        expect(truncateText("")).toBe("")
    })

    it("returns full text when truncateLength is false", () => {
        expect(truncateText("hello world", false)).toBe("hello world")
    })

    it("returns full text when truncateLength is omitted", () => {
        const short = "short text"
        expect(truncateText(short)).toBe(short)
    })

    it("truncates to default length 20 when truncateLength is true", () => {
        const long = "a]".repeat(15) // 30 chars
        expect(truncateText(long, true)).toBe(long.substring(0, 20) + "...")
    })

    it("returns text exactly at limit without ellipsis", () => {
        expect(truncateText("hello", 5)).toBe("hello")
    })
})
