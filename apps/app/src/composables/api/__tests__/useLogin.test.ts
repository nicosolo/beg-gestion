import { describe, it, expect, vi, beforeEach } from "vitest"

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

vi.mock("@/stores/auth", () => ({
    useAuthStore: () => ({
        getAuthHeaders: mockGetAuthHeaders,
        logout: mockLogout,
    }),
}))

vi.mock("vue-i18n", () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock("@/composables/utils/useAlert", () => ({
    useAlert: () => ({ errorAlert: mockErrorAlert }),
}))

vi.mock("@/utils/api-error", async () => {
    const actual = await vi.importActual<typeof import("@/utils/api-error")>("@/utils/api-error")
    return {
        ...actual,
        parseApiError: mockParseApiError,
    }
})

import { useLogin } from "@/composables/api/useLogin"
import { ApiError } from "@/utils/api-error"

function makeOkResponse(data: unknown) {
    return { ok: true, json: () => Promise.resolve(data) }
}

function makeErrorResponse(status: number) {
    return { ok: false, status, statusText: `Error ${status}` }
}

describe("useLogin", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("returns token and user on successful login", async () => {
        const loginResponse = {
            token: "jwt-token-123",
            user: { id: 1, email: "test@example.com", role: "user" },
        }
        mockMethodFn.mockResolvedValue(makeOkResponse(loginResponse))

        const { post, data } = useLogin()
        await post({ body: { email: "test@example.com", password: "password123" } })

        expect(data.value).toEqual(loginResponse)
        expect(mockMethodFn).toHaveBeenCalledWith(
            { json: { email: "test@example.com", password: "password123" } },
            { headers: { Authorization: "Bearer test-token" } },
        )
    })

    it("sets error on failed login", async () => {
        const apiError = new ApiError(
            { code: "INVALID_CREDENTIALS" as any, message: "Invalid credentials", timestamp: new Date().toISOString() },
            401,
        )
        mockParseApiError.mockResolvedValue(apiError)
        mockMethodFn.mockResolvedValue(makeErrorResponse(401))

        const { post, error } = useLogin()
        await expect(post({ body: { email: "wrong@example.com", password: "bad" } })).rejects.toThrow()

        expect(error.value).toBe("Invalid credentials")
        expect(mockErrorAlert).toHaveBeenCalled()
    })

    it("triggers logout on auth error", async () => {
        const authError = new ApiError(
            { code: "UNAUTHORIZED" as any, message: "Unauthorized", timestamp: new Date().toISOString() },
            401,
        )
        mockParseApiError.mockResolvedValue(authError)
        mockMethodFn.mockResolvedValue(makeErrorResponse(401))

        const { post } = useLogin()
        await expect(post({ body: { email: "a@b.com", password: "wrong" } })).rejects.toThrow()

        expect(mockLogout).toHaveBeenCalled()
    })

    it("sets loading during request", async () => {
        let resolveResponse!: (value: unknown) => void
        mockMethodFn.mockReturnValue(new Promise((resolve) => { resolveResponse = resolve }))

        const { post, loading } = useLogin()
        expect(loading.value).toBe(false)

        const promise = post({ body: { email: "a@b.com", password: "pass" } })
        expect(loading.value).toBe(true)

        resolveResponse(makeOkResponse({ token: "t", user: {} }))
        await promise
        expect(loading.value).toBe(false)
    })
})
