import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import DataTable from "../DataTable.vue"
import type { Column } from "../DataTable.vue"

vi.mock("@vueuse/core", () => ({
    useMediaQuery: () => ({ value: true }),
}))

const columns: Column[] = [
    { key: "name", label: "Name", sortKey: "name" },
    { key: "age", label: "Age" },
]

const items = [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
]

describe("DataTable", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("renders column headers", () => {
        const wrapper = mount(DataTable, {
            props: { columns, items },
            global: {
                stubs: {
                    SortIcon: true,
                    TruncateWithTooltip: {
                        template: "<div><slot /></div>",
                        props: ["content", "placement"],
                    },
                },
            },
        })
        expect(wrapper.text()).toContain("Name")
        expect(wrapper.text()).toContain("Age")
    })

    it("renders row data", () => {
        const wrapper = mount(DataTable, {
            props: { columns, items },
            global: {
                stubs: {
                    SortIcon: true,
                    TruncateWithTooltip: {
                        template: "<div><slot /></div>",
                        props: ["content", "placement"],
                    },
                },
            },
        })
        expect(wrapper.text()).toContain("Alice")
        expect(wrapper.text()).toContain("30")
        expect(wrapper.text()).toContain("Bob")
        expect(wrapper.text()).toContain("25")
    })

    it("emits sort-change when clicking sortable header", async () => {
        const wrapper = mount(DataTable, {
            props: {
                columns,
                items,
                sort: { key: "age", direction: "asc" as const },
            },
            global: {
                stubs: {
                    SortIcon: true,
                    TruncateWithTooltip: {
                        template: "<div @click='$emit(\"click\")'><slot /></div>",
                        props: ["content", "placement"],
                    },
                },
            },
        })
        // Click the "Name" sortable header (first column)
        const headers = wrapper.findAll("[class*='cursor-pointer']")
        const sortableHeader = headers.find((h) => h.text().includes("Name"))
        expect(sortableHeader).toBeTruthy()
        await sortableHeader!.trigger("click")

        expect(wrapper.emitted("sort-change")).toBeTruthy()
        expect(wrapper.emitted("sort-change")![0][0]).toEqual({
            key: "name",
            direction: "asc",
        })
    })

    it("toggles sort direction when clicking same column", async () => {
        const wrapper = mount(DataTable, {
            props: {
                columns,
                items,
                sort: { key: "name", direction: "asc" as const },
            },
            global: {
                stubs: {
                    SortIcon: true,
                    TruncateWithTooltip: {
                        template: "<div><slot /></div>",
                        props: ["content", "placement"],
                    },
                },
            },
        })
        const headers = wrapper.findAll("[class*='cursor-pointer']")
        const nameHeader = headers.find((h) => h.text().includes("Name"))
        await nameHeader!.trigger("click")

        expect(wrapper.emitted("sort-change")![0][0]).toEqual({
            key: "name",
            direction: "desc",
        })
    })

    it("does not emit sort-change for non-sortable column", async () => {
        const wrapper = mount(DataTable, {
            props: {
                columns,
                items,
                sort: { key: "name", direction: "asc" as const },
            },
            global: {
                stubs: {
                    SortIcon: true,
                    TruncateWithTooltip: {
                        template: "<div><slot /></div>",
                        props: ["content", "placement"],
                    },
                },
            },
        })
        // "Age" column has no sortKey
        const headers = wrapper.findAll("[class*='px-3']")
        const ageHeader = headers.find(
            (h) => h.text().includes("Age") && !h.text().includes("Alice")
        )
        await ageHeader!.trigger("click")

        expect(wrapper.emitted("sort-change")).toBeFalsy()
    })

    it("shows empty message when no items", () => {
        const wrapper = mount(DataTable, {
            props: { columns, items: [] },
            global: {
                stubs: { SortIcon: true, TruncateWithTooltip: true },
            },
        })
        expect(wrapper.text()).toContain("No items found")
    })

    it("shows custom empty message", () => {
        const wrapper = mount(DataTable, {
            props: { columns, items: [], emptyMessage: "Nothing here" },
            global: {
                stubs: { SortIcon: true, TruncateWithTooltip: true },
            },
        })
        expect(wrapper.text()).toContain("Nothing here")
    })

    it("does not show header row when items empty", () => {
        const wrapper = mount(DataTable, {
            props: { columns, items: [] },
            global: {
                stubs: { SortIcon: true, TruncateWithTooltip: true },
            },
        })
        expect(wrapper.find("[class*='sticky']").exists()).toBe(false)
    })

    it("emits row-click when clicking a row", async () => {
        const wrapper = mount(DataTable, {
            props: { columns, items },
            global: {
                stubs: {
                    SortIcon: true,
                    TruncateWithTooltip: {
                        template: "<div><slot /></div>",
                        props: ["content", "placement"],
                    },
                },
            },
        })
        const rows = wrapper.findAll("[class*='block cursor-pointer']")
        await rows[0].trigger("click")

        expect(wrapper.emitted("row-click")).toBeTruthy()
        expect(wrapper.emitted("row-click")![0][0]).toEqual({
            name: "Alice",
            age: 30,
        })
        expect(wrapper.emitted("row-click")![0][1]).toBe(0)
    })

    it("renders footer when showFooter is true", () => {
        const wrapper = mount(DataTable, {
            props: { columns, items, showFooter: true },
            global: {
                stubs: {
                    SortIcon: true,
                    TruncateWithTooltip: {
                        template: "<div><slot /></div>",
                        props: ["content", "placement"],
                    },
                },
            },
        })
        expect(wrapper.find("[class*='bg-gray-50']").exists()).toBe(true)
    })

    it("does not render footer by default", () => {
        const wrapper = mount(DataTable, {
            props: { columns, items },
            global: {
                stubs: {
                    SortIcon: true,
                    TruncateWithTooltip: {
                        template: "<div><slot /></div>",
                        props: ["content", "placement"],
                    },
                },
            },
        })
        expect(wrapper.find("[class*='bg-gray-50']").exists()).toBe(false)
    })
})
