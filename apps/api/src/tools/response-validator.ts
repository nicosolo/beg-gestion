import type { TypedResponse } from "hono"
import { createMiddleware } from "hono/factory"
import type { StatusCode } from "hono/utils/http-status"
import { ZodSchema } from "zod"
import { throwResponseValidationError } from "./error-handler"

declare module "hono" {
    interface ContextRenderer {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data: any, status: StatusCode): TypedResponse
    }
}

type Params = Partial<Record<StatusCode, ZodSchema>>

export const responseValidator = (params: Params) =>
    createMiddleware(async (c, next) => {
        c.setRenderer((data, status) => {
            for (const [code, schema] of Object.entries(params)) {
                if (status.toString() === code) {
                    const result = schema.safeParse(data)

                    if (!result.success) {
                        throwResponseValidationError("Validation response error", result.error)
                    }
                    return c.json(result.data)
                }
            }
            return c.json({ message: "Invalid!" }, 500)
        })
        await next()
    })
