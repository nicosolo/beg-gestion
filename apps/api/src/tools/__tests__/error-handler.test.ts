import { describe, test, expect } from "bun:test"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { ErrorCode } from "@beg/validations"
import {
    ApiException,
    throwNotFound,
    throwUnauthorized,
    throwForbidden,
    throwDuplicateEntry,
    throwValidationError,
    throwActivityLocked,
    throwInternalError,
    parseZodError,
    errorHandler,
} from "../error-handler"

describe("ApiException", () => {
    test("has correct statusCode, errorCode, message, details", () => {
        const details = [{ field: "email", message: "invalid" }]
        const ex = new ApiException(400, ErrorCode.VALIDATION_ERROR, "bad input", details)
        expect(ex.statusCode).toBe(400)
        expect(ex.errorCode).toBe("VALIDATION_ERROR")
        expect(ex.message).toBe("bad input")
        expect(ex.details).toEqual(details)
    })

    test("extends HTTPException", () => {
        const ex = new ApiException(500, ErrorCode.INTERNAL_ERROR, "fail")
        expect(ex).toBeInstanceOf(HTTPException)
    })

    test("details defaults to undefined", () => {
        const ex = new ApiException(404, ErrorCode.NOT_FOUND, "missing")
        expect(ex.details).toBeUndefined()
    })
})

describe("throwNotFound", () => {
    test("throws ApiException with 404 + NOT_FOUND", () => {
        try {
            throwNotFound("User")
            expect.unreachable("should have thrown")
        } catch (err) {
            expect(err).toBeInstanceOf(ApiException)
            const ex = err as ApiException
            expect(ex.statusCode).toBe(404)
            expect(ex.errorCode).toBe(ErrorCode.NOT_FOUND)
            expect(ex.message).toBe("User not found")
        }
    })
})

describe("throwUnauthorized", () => {
    test("throws with 401 + UNAUTHORIZED + default message", () => {
        try {
            throwUnauthorized()
            expect.unreachable("should have thrown")
        } catch (err) {
            const ex = err as ApiException
            expect(ex.statusCode).toBe(401)
            expect(ex.errorCode).toBe(ErrorCode.UNAUTHORIZED)
            expect(ex.message).toBe("Unauthorized")
        }
    })

    test("accepts custom message", () => {
        try {
            throwUnauthorized("Token expired")
            expect.unreachable("should have thrown")
        } catch (err) {
            expect((err as ApiException).message).toBe("Token expired")
        }
    })
})

describe("throwForbidden", () => {
    test("throws with 403 + FORBIDDEN", () => {
        try {
            throwForbidden()
            expect.unreachable("should have thrown")
        } catch (err) {
            const ex = err as ApiException
            expect(ex.statusCode).toBe(403)
            expect(ex.errorCode).toBe(ErrorCode.FORBIDDEN)
            expect(ex.message).toBe("Forbidden")
        }
    })
})

describe("throwDuplicateEntry", () => {
    test("throws with 400 + DUPLICATE_ENTRY + details", () => {
        try {
            throwDuplicateEntry("User", "email", "a@b.com")
            expect.unreachable("should have thrown")
        } catch (err) {
            const ex = err as ApiException
            expect(ex.statusCode).toBe(400)
            expect(ex.errorCode).toBe(ErrorCode.DUPLICATE_ENTRY)
            expect(ex.message).toBe("User with email 'a@b.com' already exists")
            expect(ex.details).toEqual([{ field: "email", message: "This email is already taken" }])
        }
    })
})

describe("throwValidationError", () => {
    test("throws with 400 + VALIDATION_ERROR", () => {
        const details = [{ field: "name", message: "required" }]
        try {
            throwValidationError("Invalid data", details)
            expect.unreachable("should have thrown")
        } catch (err) {
            const ex = err as ApiException
            expect(ex.statusCode).toBe(400)
            expect(ex.errorCode).toBe(ErrorCode.VALIDATION_ERROR)
            expect(ex.message).toBe("Invalid data")
            expect(ex.details).toEqual(details)
        }
    })

    test("details is optional", () => {
        try {
            throwValidationError("bad")
            expect.unreachable("should have thrown")
        } catch (err) {
            expect((err as ApiException).details).toBeUndefined()
        }
    })
})

describe("throwActivityLocked", () => {
    test("throws with 403 + ACTIVITY_LOCKED + date detail", () => {
        try {
            throwActivityLocked()
            expect.unreachable("should have thrown")
        } catch (err) {
            const ex = err as ApiException
            expect(ex.statusCode).toBe(403)
            expect(ex.errorCode).toBe(ErrorCode.ACTIVITY_LOCKED)
            expect(ex.details).toHaveLength(1)
            expect(ex.details![0].field).toBe("date")
        }
    })
})

describe("throwInternalError", () => {
    test("throws with 500 + INTERNAL_ERROR + default message", () => {
        try {
            throwInternalError()
            expect.unreachable("should have thrown")
        } catch (err) {
            const ex = err as ApiException
            expect(ex.statusCode).toBe(500)
            expect(ex.errorCode).toBe(ErrorCode.INTERNAL_ERROR)
            expect(ex.message).toBe("Internal server error")
        }
    })

    test("accepts custom message", () => {
        try {
            throwInternalError("db crashed")
            expect.unreachable("should have thrown")
        } catch (err) {
            expect((err as ApiException).message).toBe("db crashed")
        }
    })
})

describe("parseZodError", () => {
    test("converts ZodError issues to ValidationErrorDetail[]", () => {
        const schema = z.object({
            name: z.string(),
            age: z.number(),
        })
        const result = schema.safeParse({ name: 123, age: "old" })
        expect(result.success).toBe(false)
        if (result.success) return

        const details = parseZodError(result.error)
        expect(details).toHaveLength(2)
        expect(details[0].field).toBe("name")
        expect(details[0].code).toBe("invalid_type")
        expect(details[1].field).toBe("age")
    })

    test("handles nested paths", () => {
        const schema = z.object({ address: z.object({ zip: z.string() }) })
        const result = schema.safeParse({ address: { zip: 123 } })
        expect(result.success).toBe(false)
        if (result.success) return

        const details = parseZodError(result.error)
        expect(details[0].field).toBe("address.zip")
    })
})

// errorHandler integration tests using Hono app.request()
function createTestApp(thrower: () => never) {
    const app = new Hono()
    app.onError(errorHandler)
    app.get("/test", () => {
        thrower()
    })
    return app
}

describe("errorHandler", () => {
    test("ApiException returns correct status + JSON body", async () => {
        const app = createTestApp(() => throwNotFound("Project"))
        const res = await app.request("/test")
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.code).toBe(ErrorCode.NOT_FOUND)
        expect(body.message).toBe("Project not found")
        expect(body.timestamp).toBeDefined()
    })

    test("ApiException with details includes them in body", async () => {
        const app = createTestApp(() => throwDuplicateEntry("User", "email", "x@y.com"))
        const res = await app.request("/test")
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.code).toBe(ErrorCode.DUPLICATE_ENTRY)
        expect(body.details).toHaveLength(1)
        expect(body.details[0].field).toBe("email")
    })

    test("ZodError returns 400 + validation details", async () => {
        const app = new Hono()
        app.onError(errorHandler)
        app.get("/test", () => {
            z.object({ id: z.number() }).parse({ id: "abc" })
        })
        const res = await app.request("/test")
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.code).toBe(ErrorCode.VALIDATION_ERROR)
        expect(body.message).toBe("Validation failed")
        expect(body.details).toHaveLength(1)
        expect(body.details[0].field).toBe("id")
    })

    test("HTTPException returns correct status", async () => {
        const app = new Hono()
        app.onError(errorHandler)
        app.get("/test", () => {
            throw new HTTPException(429, { message: "Too many requests" })
        })
        const res = await app.request("/test")
        expect(res.status).toBe(429)
        const body = await res.json()
        expect(body.code).toBe(ErrorCode.UNKNOWN_ERROR)
        expect(body.message).toBe("Too many requests")
    })

    test("unknown Error returns 500 + generic message", async () => {
        const app = new Hono()
        app.onError(errorHandler)
        app.get("/test", () => {
            throw new Error("something broke")
        })
        const res = await app.request("/test")
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.code).toBe(ErrorCode.INTERNAL_ERROR)
        expect(body.message).toBe("An unexpected error occurred")
    })
})
