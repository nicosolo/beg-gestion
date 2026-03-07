import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status"
import {
    ErrorCode,
    createApiError,
    type ErrorCodeType,
    type ValidationErrorDetail,
} from "@beg/validations"
import { ZodError } from "zod"

export class ApiException extends HTTPException {
    constructor(
        public statusCode: StatusCode,
        public errorCode: ErrorCodeType,
        message: string,
        public details?: ValidationErrorDetail[]
    ) {
        super(statusCode as ContentfulStatusCode, { message })
    }
}

// Helper functions to throw standardized errors
export function throwNotFound(resource: string): never {
    throw new ApiException(404, ErrorCode.NOT_FOUND, `${resource} not found`)
}

export function throwUnauthorized(message = "Unauthorized"): never {
    throw new ApiException(401, ErrorCode.UNAUTHORIZED, message)
}

export function throwForbidden(message = "Forbidden"): never {
    throw new ApiException(403, ErrorCode.FORBIDDEN, message)
}

export function throwDuplicateEntry(resource: string, field: string, value: string): never {
    throw new ApiException(
        400,
        ErrorCode.DUPLICATE_ENTRY,
        `${resource} with ${field} '${value}' already exists`,
        [{ field, message: `This ${field} is already taken` }]
    )
}

export function throwValidationError(message: string, details?: ValidationErrorDetail[]): never {
    throw new ApiException(400, ErrorCode.VALIDATION_ERROR, message, details)
}

export function throwActivityLocked(message = "Activity is locked and cannot be modified"): never {
    throw new ApiException(403, ErrorCode.ACTIVITY_LOCKED, message, [
        { field: "date", message: "Activities older than 60 days cannot be modified by non-admin users" },
    ])
}

export function throwNoProjectFolderError(
    message: string,
    details?: ValidationErrorDetail[]
): never {
    throw new ApiException(400, ErrorCode.NO_PROJECT_FOLDER, message, details)
}

export function throwResponseValidationError(message: string, details?: ZodError): never {
    throw new ApiException(
        400,
        ErrorCode.RESPONSE_VALIDATION_ERROR,
        message,
        details ? parseZodError(details) : []
    )
}

export function throwInternalError(message = "Internal server error"): never {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, message)
}

// Convert Zod errors to our format
export function parseZodError(error: ZodError): ValidationErrorDetail[] {
    return error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
    }))
}

// Global error handler middleware
export async function errorHandler(err: Error, c: Context) {
    console.error("[Error]", err)

    // Handle our custom API exceptions
    if (err instanceof ApiException) {
        const errorResponse = createApiError(err.errorCode, err.message, err.details)
        console.log(errorResponse)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return c.json(errorResponse, err.statusCode as any)
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        const errorResponse = createApiError(
            ErrorCode.VALIDATION_ERROR,
            "Validation failed",
            parseZodError(err)
        )

        return c.json(errorResponse, 400)
    }

    // Handle Hono HTTP exceptions
    if (err instanceof HTTPException) {
        const errorResponse = createApiError(ErrorCode.UNKNOWN_ERROR, err.message)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return c.json(errorResponse, err.status as any)
    }

    // Default error
    const errorResponse = createApiError(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred")

    return c.json(errorResponse, 500)
}
