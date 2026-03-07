import { describe, expect, test } from "bun:test"
import {
    contentDispositionAttachment,
    fileBaseName,
    guessMimeType,
    matchesStoredPath,
    normalizeStoredPath,
    pathIsWithin,
} from "../file-utils"

describe("normalizeStoredPath", () => {
    test("converts backslashes to forward slashes", () => {
        expect(normalizeStoredPath("foo\\bar\\baz")).toBe("foo/bar/baz")
    })

    test("trims whitespace", () => {
        expect(normalizeStoredPath("  foo/bar  ")).toBe("foo/bar")
    })

    test("returns already normalized path unchanged", () => {
        expect(normalizeStoredPath("already/normalized")).toBe("already/normalized")
    })
})

describe("fileBaseName", () => {
    test("extracts basename from unix path", () => {
        expect(fileBaseName("/path/to/file.pdf")).toBe("file.pdf")
    })

    test("returns filename when no directory", () => {
        expect(fileBaseName("file.pdf")).toBe("file.pdf")
    })

    test("handles backslash paths", () => {
        expect(fileBaseName("path\\to\\file.pdf")).toBe("file.pdf")
    })
})

describe("guessMimeType", () => {
    test("pdf", () => {
        expect(guessMimeType("doc.pdf")).toBe("application/pdf")
    })

    test("png", () => {
        expect(guessMimeType("img.png")).toBe("image/png")
    })

    test("jpg", () => {
        expect(guessMimeType("photo.jpg")).toBe("image/jpeg")
    })

    test("jpeg", () => {
        expect(guessMimeType("photo.jpeg")).toBe("image/jpeg")
    })

    test("xlsx", () => {
        expect(guessMimeType("doc.xlsx")).toBe(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    })

    test("html", () => {
        expect(guessMimeType("page.html")).toBe("text/html")
    })

    test("unknown extension falls back to octet-stream", () => {
        expect(guessMimeType("unknown.xyz")).toBe("application/octet-stream")
    })
})

describe("contentDispositionAttachment", () => {
    test("formats ascii filename correctly", () => {
        const result = contentDispositionAttachment("file.pdf")
        expect(result).toBe('attachment; filename="file.pdf"; filename*=UTF-8\'\'file.pdf')
    })

    test("encodes unicode characters", () => {
        const result = contentDispositionAttachment("facture-e\u0301te\u0301.pdf")
        expect(result).toContain("filename=")
        expect(result).toContain("filename*=UTF-8''")
        expect(result).toContain(encodeURIComponent("facture-e\u0301te\u0301.pdf"))
    })
})

describe("matchesStoredPath", () => {
    test("exact match returns true", () => {
        expect(matchesStoredPath("path/to/file.pdf", "path/to/file.pdf")).toBe(true)
    })

    test("basename match returns true", () => {
        expect(matchesStoredPath("path/to/file.pdf", "other/file.pdf")).toBe(true)
    })

    test("different basenames returns false", () => {
        expect(matchesStoredPath("path/to/file.pdf", "other/different.pdf")).toBe(false)
    })

    test("null stored path returns false", () => {
        expect(matchesStoredPath(null, "file.pdf")).toBe(false)
    })

    test("undefined stored path returns false", () => {
        expect(matchesStoredPath(undefined, "file.pdf")).toBe(false)
    })
})

describe("pathIsWithin", () => {
    test("child path is within base", () => {
        expect(pathIsWithin("/app/files/invoice/1/doc.pdf", "/app/files")).toBe(true)
    })

    test("exact match returns true", () => {
        expect(pathIsWithin("/app/files", "/app/files")).toBe(true)
    })

    test("outside path returns false", () => {
        expect(pathIsWithin("/etc/passwd", "/app/files")).toBe(false)
    })

    test("traversal attack returns false", () => {
        expect(pathIsWithin("/app/files/../etc/passwd", "/app/files")).toBe(false)
    })
})
