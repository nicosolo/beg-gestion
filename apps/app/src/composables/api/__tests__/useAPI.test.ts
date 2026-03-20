import { describe, it, expect, vi, beforeEach } from "vitest"
import { z } from "zod"

const {
    mockMethodFn,
    mockGetAuthHeaders,
    mockLogout,
    mockErrorAlert,
    mockParseApiError,
} = vi.hoisted(() => ({
    mockMethodFn: vi.fn(),
    mockGetAuthHeaders: vi.fn(() => ({ Authorization: "Bearer test-token" })),
    mockLogout: vi.fn(),
    mockErrorAlert: vi.fn(),
    mockParseApiError: vi.fn(),
}))

// Mock hono/client — all client[endpoint][$method] calls resolve through mockMethodFn
vi.mock("hono/client", () => ({
    hc: () =>
        new Proxy(
            {},
            {
                get: () =>
                    new Proxy(
                        {},
                        {
                            get: () => mockMethodFn,
                        },
                    ),
            },
        ),
}))

// Mock auth store
vi.mock("@/stores/auth", () => ({
    useAuthStore: () => ({
        getAuthHeaders: mockGetAuthHeaders,
        logout: mockLogout,
    }),
}))

// Mock vue-i18n
vi.mock("vue-i18n", () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

// Mock useAlert
vi.mock("@/composables/utils/useAlert", () => ({
    useAlert: () => ({ errorAlert: mockErrorAlert }),
}))

// Partial mock — keep real ApiError, mock parseApiError
vi.mock("@/utils/api-error", async () => {
    const actual = await vi.importActual<typeof import("@/utils/api-error")>("@/utils/api-error")
    return {
        ...actual,
        parseApiError: mockParseApiError,
    }
})

import { useGet, usePost } from "@/composables/api/useAPI"
import { ApiError } from "@/utils/api-error"

function makeOkResponse(data: unknown) {
    return {
        ok: true,
        json: () => Promise.resolve(data),
    }
}

function makeErrorResponse(status: number) {
    return { ok: false, status, statusText: `Error ${status}` }
}

function makeApiError(code: string, message: string, statusCode: number) {
    return new ApiError(
        { code: code as any, message, timestamp: new Date().toISOString() },
        statusCode,
    )
}

describe("useGet", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("calls hono client with auth headers", async () => {
        mockMethodFn.mockResolvedValue(makeOkResponse({ id: 1 }))

        const { get } = useGet("users")
        await get()

        expect(mockGetAuthHeaders).toHaveBeenCalled()
        expect(mockMethodFn).toHaveBeenCalledWith(
            {},
            { headers: { Authorization: "Bearer test-token" } },
        )
    })

    it("passes query params when schema provided", async () => {
        mockMethodFn.mockResolvedValue(makeOkResponse([]))

        const querySchema = z.object({ page: z.number() })
        const { get } = useGet("users", { query: querySchema })
        await get({ query: { page: 2 } })

        expect(mockMethodFn).toHaveBeenCalledWith(
            { query: { page: 2 } },
            { headers: { Authorization: "Bearer test-token" } },
        )
    })

    it("sets loading=true during request, false after", async () => {
        let resolveResponse!: (value: unknown) => void
        mockMethodFn.mockReturnValue(
            new Promise((resolve) => {
                resolveResponse = resolve
            }),
        )

        const { get, loading } = useGet("users")
        expect(loading.value).toBe(false)

        const promise = get()
        expect(loading.value).toBe(true)

        resolveResponse(makeOkResponse([]))
        await promise
        expect(loading.value).toBe(false)
    })

    it("sets data on success", async () => {
        const responseData = { id: 1, name: "Test" }
        mockMethodFn.mockResolvedValue(makeOkResponse(responseData))

        const { get, data } = useGet("users")
        await get()

        expect(data.value).toEqual(responseData)
    })

    it("sets error on failure and parses ApiError", async () => {
        const apiError = makeApiError("NOT_FOUND", "Not found", 404)
        mockParseApiError.mockResolvedValue(apiError)
        mockMethodFn.mockResolvedValue(makeErrorResponse(404))

        const { get, error } = useGet("users")
        await expect(get()).rejects.toThrow()

        expect(error.value).toBe("Not found")
        expect(mockErrorAlert).toHaveBeenCalled()
    })

    it("does not show alert when silent=true", async () => {
        const apiError = makeApiError("NOT_FOUND", "Not found", 404)
        mockParseApiError.mockResolvedValue(apiError)
        mockMethodFn.mockResolvedValue(makeErrorResponse(404))

        const { get } = useGet("users", undefined, { silent: true })
        await expect(get()).rejects.toThrow()

        expect(mockErrorAlert).not.toHaveBeenCalled()
    })

    it("triggers logout on auth error (401)", async () => {
        const authError = makeApiError("UNAUTHORIZED", "Unauthorized", 401)
        mockParseApiError.mockResolvedValue(authError)
        mockMethodFn.mockResolvedValue(makeErrorResponse(401))

        const { get } = useGet("users")
        await expect(get()).rejects.toThrow()

        expect(mockLogout).toHaveBeenCalled()
    })

    it("sets error on network error", async () => {
        mockMethodFn.mockRejectedValue(new Error("Network error"))

        const { get, error } = useGet("users")
        await expect(get()).rejects.toThrow("Network error")

        expect(error.value).toBe("Network error")
    })

    it("loading=false after error", async () => {
        mockMethodFn.mockRejectedValue(new Error("fail"))

        const { get, loading } = useGet("users")
        await expect(get()).rejects.toThrow()

        expect(loading.value).toBe(false)
    })
})

describe("usePost", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("calls hono client with POST and JSON body", async () => {
        mockMethodFn.mockResolvedValue(makeOkResponse({ id: 1 }))

        const bodySchema = z.object({ name: z.string() })
        const { post } = usePost("users", { body: bodySchema })
        await post({ body: { name: "Test" } })

        expect(mockMethodFn).toHaveBeenCalledWith(
            { json: { name: "Test" } },
            { headers: { Authorization: "Bearer test-token" } },
        )
    })

    it("sets data on success", async () => {
        const responseData = { id: 1, name: "Created" }
        mockMethodFn.mockResolvedValue(makeOkResponse(responseData))

        const { post, data } = usePost("users")
        await post()

        expect(data.value).toEqual(responseData)
    })

    it("sets loading during request", async () => {
        let resolveResponse!: (value: unknown) => void
        mockMethodFn.mockReturnValue(
            new Promise((resolve) => {
                resolveResponse = resolve
            }),
        )

        const { post, loading } = usePost("users")
        expect(loading.value).toBe(false)

        const promise = post()
        expect(loading.value).toBe(true)

        resolveResponse(makeOkResponse({}))
        await promise
        expect(loading.value).toBe(false)
    })

    it("sets error on failure and shows alert", async () => {
        const apiError = makeApiError("VALIDATION_ERROR", "Invalid data", 422)
        mockParseApiError.mockResolvedValue(apiError)
        mockMethodFn.mockResolvedValue(makeErrorResponse(422))

        const { post, error } = usePost("users")
        await expect(post()).rejects.toThrow()

        expect(error.value).toBe("Invalid data")
        expect(mockErrorAlert).toHaveBeenCalled()
    })

    it("triggers logout on auth error", async () => {
        const authError = makeApiError("UNAUTHORIZED", "Unauthorized", 401)
        mockParseApiError.mockResolvedValue(authError)
        mockMethodFn.mockResolvedValue(makeErrorResponse(401))

        const { post } = usePost("users")
        await expect(post()).rejects.toThrow()

        expect(mockLogout).toHaveBeenCalled()
    })

    it("sets error on network error", async () => {
        mockMethodFn.mockRejectedValue(new Error("Failed to fetch"))

        const { post, error } = usePost("users")
        await expect(post()).rejects.toThrow("Failed to fetch")

        expect(error.value).toBe("Failed to fetch")
    })
})
