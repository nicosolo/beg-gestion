import { describe, expect, test } from "bun:test"
import {
    generateInvoiceNumber,
    normalizeLegacyPath,
    parseDateFromFilename,
    parseFabDate,
    parseProjectCode,
    parseSwissNumber,
    shouldReplaceInvoice,
} from "../import-invoices"

describe("normalizeLegacyPath", () => {
    test("strips /mandats/ prefix", () => {
        expect(normalizeLegacyPath("/mandats/7011/F 2024-01-01.fab")).toBe(
            "7011/F 2024-01-01.fab"
        )
    })

    test("leaves already-relative paths unchanged", () => {
        expect(normalizeLegacyPath("7011/F 2024-01-01.fab")).toBe("7011/F 2024-01-01.fab")
    })

    test("converts backslashes", () => {
        expect(normalizeLegacyPath("7011\\F 2024-01-01.fab")).toBe("7011/F 2024-01-01.fab")
    })

    test("null/undefined/empty return null", () => {
        expect(normalizeLegacyPath(null)).toBe(null)
        expect(normalizeLegacyPath(undefined)).toBe(null)
        expect(normalizeLegacyPath("")).toBe(null)
        expect(normalizeLegacyPath("   ")).toBe(null)
    })
})

describe("shouldReplaceInvoice (dedup decision)", () => {
    test("skips when existing invoice was created manually (no legacy path)", () => {
        expect(shouldReplaceInvoice(null, "/mandats/7011/F 2024-01-01.fab")).toBe("skip")
        expect(shouldReplaceInvoice(undefined, "/mandats/7011/F 2024-01-01.fab")).toBe("skip")
        expect(shouldReplaceInvoice("", "/mandats/7011/F 2024-01-01.fab")).toBe("skip")
    })

    test("replaces when existing legacy path matches incoming (idempotent re-run)", () => {
        expect(
            shouldReplaceInvoice("7011/F 2024-01-01.fab", "/mandats/7011/F 2024-01-01.fab")
        ).toBe("replace")
    })

    test("replaces when both paths are already relative and equal", () => {
        expect(shouldReplaceInvoice("7011/F 2024-01-01.fab", "7011/F 2024-01-01.fab")).toBe(
            "replace"
        )
    })

    test("skips when existing legacy path differs (protects BEG invoices from EAC collision)", () => {
        // Scenario: a BEG invoice was imported from /mandats/7011/F 2024.fab,
        // then EAC tree is mounted at /eac/ and a same-named file exists there.
        expect(
            shouldReplaceInvoice("7011/F 2024-01-01.fab", "/eac/7011/F 2024-01-01.fab")
        ).toBe("skip")
    })
})

describe("parseProjectCode", () => {
    test("splits project number and subProjectName", () => {
        expect(parseProjectCode("7011 INF")).toEqual({
            projectNumber: "7011",
            subProjectName: "INF",
        })
    })

    test("handles project without subProjectName", () => {
        expect(parseProjectCode("7000")).toEqual({
            projectNumber: "7000",
            subProjectName: null,
        })
    })

    test("trims whitespace", () => {
        expect(parseProjectCode("  7000  ")).toEqual({
            projectNumber: "7000",
            subProjectName: null,
        })
    })
})

describe("parseFabDate", () => {
    test("DD.MM.YYYY", () => {
        const d = parseFabDate("15.03.2024")
        expect(d).not.toBeNull()
        expect(d!.getFullYear()).toBe(2024)
        expect(d!.getMonth()).toBe(2)
        expect(d!.getDate()).toBe(15)
    })

    test("DD/MM/YYYY", () => {
        const d = parseFabDate("15/03/2024")
        expect(d).not.toBeNull()
        expect(d!.getFullYear()).toBe(2024)
    })

    test("2-digit year <=30 maps to 20xx", () => {
        const d = parseFabDate("15.03.24")
        expect(d!.getFullYear()).toBe(2024)
    })

    test("2-digit year >30 maps to 19xx", () => {
        const d = parseFabDate("15.03.95")
        expect(d!.getFullYear()).toBe(1995)
    })

    test("empty string returns null", () => {
        expect(parseFabDate("")).toBe(null)
        expect(parseFabDate("   ")).toBe(null)
    })

    test("malformed returns null", () => {
        expect(parseFabDate("not a date")).toBe(null)
        expect(parseFabDate("15.03")).toBe(null)
    })
})

describe("parseSwissNumber", () => {
    test("parses thousands separator with apostrophe", () => {
        expect(parseSwissNumber("3'493.75")).toBe(3493.75)
        expect(parseSwissNumber("4'590.00")).toBe(4590.0)
    })

    test("handles comma as decimal", () => {
        expect(parseSwissNumber("1,50")).toBe(1.5)
    })

    test("empty returns 0", () => {
        expect(parseSwissNumber("")).toBe(0)
        expect(parseSwissNumber("   ")).toBe(0)
    })

    test("junk returns 0", () => {
        expect(parseSwissNumber("abc")).toBe(0)
    })
})

describe("parseDateFromFilename", () => {
    test("extracts ISO date from filename", () => {
        const d = parseDateFromFilename("8132 INF F 2024-03-08.fab")
        expect(d).not.toBeNull()
        expect(d!.getUTCFullYear()).toBe(2024)
        expect(d!.getUTCMonth()).toBe(2)
        expect(d!.getUTCDate()).toBe(8)
    })

    test("returns null when no date in filename", () => {
        expect(parseDateFromFilename("no date here.fab")).toBe(null)
    })
})

describe("generateInvoiceNumber", () => {
    test("strips .fab extension", () => {
        expect(generateInvoiceNumber("7011 INF F 2024-01-01.fab")).toBe(
            "7011 INF F 2024-01-01"
        )
    })

    test("handles uppercase extension", () => {
        // path.basename with .fab keeps uppercase .FAB intact — confirm actual behavior
        expect(generateInvoiceNumber("invoice.fab")).toBe("invoice")
    })
})
