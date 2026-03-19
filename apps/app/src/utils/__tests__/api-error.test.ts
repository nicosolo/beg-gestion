import { describe, it, expect, vi } from "vitest"
import { ApiError, parseApiError } from "../api-error"
import { ErrorCode } from "@beg/validations"
import type { ApiErrorResponse } from "@beg/validations"

function makeResponse(overrides: Partial<ApiErrorResponse> = {}): ApiErrorResponse {
    return {
        code: ErrorCode.NOT_FOUND,
        message: "Resource not found",
        timestamp: new Date().toISOString(),
        ...overrides,
    }
}

const mockT = vi.fn((key: string) => key)

describe("ApiError", () => {
    describe("constructor", () => {
        it("parses code, statusCode, message, details", () => {
            const details = [{ field: "email", message: "invalid" }]
            const response = makeResponse({
                code: ErrorCode.VALIDATION_ERROR,
                message: "Validation failed",
                details,
                path: "/api/users",
                requestId: "req-123",
            })

            const err = new ApiError(response, 400)

            expect(err.code).toBe("VALIDATION_ERROR")
            expect(err.statusCode).toBe(400)
            expect(err.message).toBe("Validation failed")
            expect(err.details).toEqual(details)
            expect(err.path).toBe("/api/users")
            expect(err.requestId).toBe("req-123")
            expect(err.name).toBe("ApiError")
            expect(err).toBeInstanceOf(Error)
        })
    })

    describe("getLocalizedMessage", () => {
        it("returns i18n key for known codes", () => {
            mockT.mockImplementation((key: string) => {
                if (key === "errors.NOT_FOUND") return "Ressource introuvable"
                return key
            })
            const err = new ApiError(makeResponse(), 404)

            expect(err.getLocalizedMessage(mockT as never)).toBe("Ressource introuvable")
        })

        it("returns server message for unknown/untranslated codes", () => {
            mockT.mockImplementation((key: string) => key) // returns key as-is
            const err = new ApiError(
                makeResponse({ code: ErrorCode.INTERNAL_ERROR, message: "Server exploded" }),
                500,
            )

            expect(err.getLocalizedMessage(mockT as never)).toBe("Server exploded")
        })

        it("returns CONSTRAINT_VIOLATION server message when no translation", () => {
            mockT.mockImplementation((key: string) => key)
            const err = new ApiError(
                makeResponse({
                    code: ErrorCode.CONSTRAINT_VIOLATION,
                    message: "Cannot delete location with existing projects",
                }),
                409,
            )

            expect(err.getLocalizedMessage(mockT as never)).toBe(
                "Cannot delete location with existing projects",
            )
        })

        it("returns DUPLICATE_ENTRY_DETAIL with field for duplicate entry", () => {
            mockT.mockImplementation((key: string) => key)
            const err = new ApiError(
                makeResponse({
                    code: ErrorCode.DUPLICATE_ENTRY,
                    details: [{ field: "email", message: "already exists" }],
                }),
                409,
            )

            expect(err.getLocalizedMessage(mockT as never)).toBe("errors.DUPLICATE_ENTRY_DETAIL")
            expect(mockT).toHaveBeenCalledWith("errors.DUPLICATE_ENTRY_DETAIL", { field: "email" })
        })

        it("returns VALIDATION_ERROR_DETAIL with joined messages", () => {
            mockT.mockImplementation((key: string) => key)
            const err = new ApiError(
                makeResponse({
                    code: ErrorCode.VALIDATION_ERROR,
                    details: [
                        { field: "name", message: "required" },
                        { field: "email", message: "invalid" },
                    ],
                }),
                400,
            )

            expect(err.getLocalizedMessage(mockT as never)).toBe(
                "errors.VALIDATION_ERROR_DETAIL",
            )
            expect(mockT).toHaveBeenCalledWith("errors.VALIDATION_ERROR_DETAIL", {
                details: "required, invalid",
            })
        })
    })

    describe("is", () => {
        it("returns true for matching code", () => {
            const err = new ApiError(makeResponse({ code: ErrorCode.NOT_FOUND }), 404)
            expect(err.is(ErrorCode.NOT_FOUND)).toBe(true)
        })

        it("returns false for non-matching code", () => {
            const err = new ApiError(makeResponse({ code: ErrorCode.NOT_FOUND }), 404)
            expect(err.is(ErrorCode.VALIDATION_ERROR)).toBe(false)
        })
    })

    describe("isAuthError", () => {
        it.each([
            { code: ErrorCode.UNAUTHORIZED, status: 401 },
            { code: ErrorCode.FORBIDDEN, status: 403 },
            { code: ErrorCode.INVALID_CREDENTIALS, status: 401 },
            { code: ErrorCode.TOKEN_EXPIRED, status: 401 },
        ])("returns true for $code", ({ code, status }) => {
            const err = new ApiError(makeResponse({ code }), status)
            expect(err.isAuthError()).toBe(true)
        })

        it("returns true for statusCode 401 regardless of code", () => {
            const err = new ApiError(makeResponse({ code: ErrorCode.UNKNOWN_ERROR }), 401)
            expect(err.isAuthError()).toBe(true)
        })

        it.each([ErrorCode.NOT_FOUND, ErrorCode.VALIDATION_ERROR])(
            "returns false for %s",
            (code) => {
                const err = new ApiError(makeResponse({ code }), 400)
                expect(err.isAuthError()).toBe(false)
            },
        )
    })
})

describe("parseApiError", () => {
    it("parses standard JSON error body", async () => {
        const body: ApiErrorResponse = {
            code: ErrorCode.NOT_FOUND,
            message: "Not found",
            timestamp: new Date().toISOString(),
        }
        const response = new Response(JSON.stringify(body), { status: 404 })

        const err = await parseApiError(response)

        expect(err).toBeInstanceOf(ApiError)
        expect(err.code).toBe("NOT_FOUND")
        expect(err.statusCode).toBe(404)
        expect(err.message).toBe("Not found")
    })

    it("falls back for non-standard error responses", async () => {
        const response = new Response(JSON.stringify({ error: "Something went wrong" }), {
            status: 500,
        })

        const err = await parseApiError(response)

        expect(err.code).toBe("UNKNOWN_ERROR")
        expect(err.message).toBe("Something went wrong")
        expect(err.statusCode).toBe(500)
    })

    it("handles unparseable response", async () => {
        const response = new Response("not json", {
            status: 502,
            statusText: "Bad Gateway",
        })

        const err = await parseApiError(response)

        expect(err.code).toBe("UNKNOWN_ERROR")
        expect(err.message).toBe("HTTP 502: Bad Gateway")
        expect(err.statusCode).toBe(502)
    })
})
