import { describe, it, expect, vi, beforeEach } from "vitest"

const storage = new Map<string, string>()
const localStorageMock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    get length() {
        return storage.size
    },
    key: (index: number) => [...storage.keys()][index] ?? null,
}
vi.stubGlobal("localStorage", localStorageMock)

const mockIsTauri = vi.hoisted(() => ({ value: true }))

vi.mock("@/composables/useTauri", () => ({
    useTauri: () => ({
        isTauri: mockIsTauri,
    }),
}))

describe("useAppSettingsStore", () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        storage.clear()
        mockIsTauri.value = true
        vi.resetModules()

        const { setActivePinia, createPinia } = await import("pinia")
        setActivePinia(createPinia())
    })

    async function getStore() {
        const { useAppSettingsStore } = await import("../appSettings")
        return useAppSettingsStore()
    }

    describe("defaults", () => {
        it("basePath defaults to N:\\Mandats", async () => {
            const store = await getStore()
            expect(store.basePath).toBe("N:\\Mandats")
        })

        it("defaultBasePath is N:\\Mandats", async () => {
            const store = await getStore()
            expect(store.defaultBasePath).toBe("N:\\Mandats")
        })
    })

    describe("setBasePath", () => {
        it("updates basePath", async () => {
            const store = await getStore()
            store.setBasePath("/custom/path")
            expect(store.basePath).toBe("/custom/path")
        })

        it("saves to localStorage in Tauri mode", async () => {
            const store = await getStore()
            store.setBasePath("/custom/path")
            // Vue watcher is sync in test, but may need nextTick
            await vi.dynamicImportSettled()
            const stored = localStorage.getItem("app-settings")
            expect(stored).not.toBeNull()
            expect(JSON.parse(stored!).basePath).toBe("/custom/path")
        })

        it("does not save to localStorage outside Tauri", async () => {
            mockIsTauri.value = false
            const store = await getStore()
            store.setBasePath("/custom/path")
            expect(store.basePath).toBe("/custom/path")
            expect(localStorage.getItem("app-settings")).toBeNull()
        })
    })

    describe("resetToDefault", () => {
        it("resets basePath to default", async () => {
            const store = await getStore()
            store.setBasePath("/custom")
            store.resetToDefault()
            expect(store.basePath).toBe("N:\\Mandats")
        })
    })

    describe("getAbsolutePath", () => {
        it("joins basePath with relative path using backslash", async () => {
            const store = await getStore()
            expect(store.getAbsolutePath("subdir\\file.txt")).toBe(
                "N:\\Mandats\\subdir\\file.txt",
            )
        })

        it("joins with forward slash when basePath uses forward slashes", async () => {
            const store = await getStore()
            store.setBasePath("/data/projects")
            expect(store.getAbsolutePath("subdir/file.txt")).toBe(
                "/data/projects/subdir/file.txt",
            )
        })

        it("strips leading slashes from relative path", async () => {
            const store = await getStore()
            expect(store.getAbsolutePath("\\subdir\\file.txt")).toBe(
                "N:\\Mandats\\subdir\\file.txt",
            )
        })

        it("strips trailing slashes from basePath", async () => {
            const store = await getStore()
            store.setBasePath("N:\\Mandats\\")
            expect(store.getAbsolutePath("subdir")).toBe(
                "N:\\Mandats\\subdir",
            )
        })
    })

    describe("hydration from localStorage", () => {
        it("loads basePath from localStorage on init", async () => {
            storage.set(
                "app-settings",
                JSON.stringify({ basePath: "/stored/path" }),
            )
            const store = await getStore()
            expect(store.basePath).toBe("/stored/path")
        })

        it("keeps default when no stored settings", async () => {
            const store = await getStore()
            expect(store.basePath).toBe("N:\\Mandats")
        })

        it("handles invalid JSON gracefully", async () => {
            storage.set("app-settings", "not-json")
            const consoleSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {})
            const store = await getStore()
            expect(store.basePath).toBe("N:\\Mandats")
            consoleSpy.mockRestore()
        })

        it("skips hydration outside Tauri", async () => {
            mockIsTauri.value = false
            storage.set(
                "app-settings",
                JSON.stringify({ basePath: "/stored/path" }),
            )
            const store = await getStore()
            expect(store.basePath).toBe("N:\\Mandats")
        })
    })
})
