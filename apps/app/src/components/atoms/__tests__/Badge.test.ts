import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import Badge from "../Badge.vue"

describe("Badge", () => {
    it("renders slot text", () => {
        const wrapper = mount(Badge, {
            slots: { default: "Active" },
        })
        expect(wrapper.text()).toBe("Active")
    })

    it("renders as span element", () => {
        const wrapper = mount(Badge, {
            slots: { default: "Test" },
        })
        expect(wrapper.element.tagName).toBe("SPAN")
    })

    it("applies default variant classes when no variant", () => {
        const wrapper = mount(Badge)
        expect(wrapper.classes()).toContain("bg-gray-100")
        expect(wrapper.classes()).toContain("text-gray-800")
    })

    it("applies success variant classes", () => {
        const wrapper = mount(Badge, {
            props: { variant: "success" },
        })
        expect(wrapper.classes()).toContain("bg-green-100")
        expect(wrapper.classes()).toContain("text-green-800")
    })

    it("applies error variant classes", () => {
        const wrapper = mount(Badge, {
            props: { variant: "error" },
        })
        expect(wrapper.classes()).toContain("bg-red-100")
        expect(wrapper.classes()).toContain("text-red-800")
    })

    it("applies warning variant classes", () => {
        const wrapper = mount(Badge, {
            props: { variant: "warning" },
        })
        expect(wrapper.classes()).toContain("bg-yellow-100")
        expect(wrapper.classes()).toContain("text-yellow-800")
    })

    it("applies muted variant classes", () => {
        const wrapper = mount(Badge, {
            props: { variant: "muted" },
        })
        expect(wrapper.classes()).toContain("bg-gray-200")
        expect(wrapper.classes()).toContain("text-gray-500")
    })

    it("applies sm size by default", () => {
        const wrapper = mount(Badge)
        expect(wrapper.classes()).toContain("px-2")
        expect(wrapper.classes()).toContain("text-xs")
    })

    it("applies md size classes", () => {
        const wrapper = mount(Badge, {
            props: { size: "md" },
        })
        expect(wrapper.classes()).toContain("px-3")
        expect(wrapper.classes()).toContain("py-1")
        expect(wrapper.classes()).toContain("text-sm")
    })

    it("applies custom className", () => {
        const wrapper = mount(Badge, {
            props: { className: "ml-2" },
        })
        expect(wrapper.classes()).toContain("ml-2")
    })

    it("always has base classes", () => {
        const wrapper = mount(Badge)
        expect(wrapper.classes()).toContain("inline-flex")
        expect(wrapper.classes()).toContain("items-center")
        expect(wrapper.classes()).toContain("font-semibold")
        expect(wrapper.classes()).toContain("rounded-full")
    })
})
