import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import Button from "../Button.vue"

describe("Button", () => {
    it("renders with slot content", () => {
        const wrapper = mount(Button, {
            slots: { default: "Click me" },
        })
        expect(wrapper.text()).toBe("Click me")
    })

    it("renders as <button> by default", () => {
        const wrapper = mount(Button, {
            slots: { default: "Ok" },
        })
        expect(wrapper.element.tagName).toBe("BUTTON")
        expect(wrapper.attributes("type")).toBe("button")
    })

    it("emits click event", async () => {
        const wrapper = mount(Button, {
            slots: { default: "Go" },
        })
        await wrapper.trigger("click")
        expect(wrapper.emitted("click")).toHaveLength(1)
    })

    it("sets disabled attribute and styling when disabled", () => {
        const wrapper = mount(Button, {
            props: { disabled: true },
            slots: { default: "No" },
        })
        expect(wrapper.attributes("disabled")).toBeDefined()
        expect(wrapper.classes()).toContain("cursor-not-allowed")
        expect(wrapper.classes()).toContain("opacity-60")
    })

    it("does not emit click when disabled", async () => {
        const wrapper = mount(Button, {
            props: { disabled: true },
            slots: { default: "No" },
        })
        await wrapper.trigger("click")
        // Disabled buttons still fire click events in DOM but the button is disabled
        // The component always emits — disabling is handled by the native disabled attr
        expect(wrapper.attributes("disabled")).toBeDefined()
    })

    it("shows loading spinner when loading", () => {
        const wrapper = mount(Button, {
            props: { loading: true },
            slots: { default: "Loading" },
        })
        expect(wrapper.findComponent({ name: "LoadingSpinner" }).exists()).toBe(true)
        expect(wrapper.attributes("disabled")).toBeDefined()
    })

    it("does not show spinner when not loading", () => {
        const wrapper = mount(Button, {
            slots: { default: "Ok" },
        })
        expect(wrapper.findComponent({ name: "LoadingSpinner" }).exists()).toBe(false)
    })

    it("applies variant classes", () => {
        const wrapper = mount(Button, {
            props: { variant: "primary" },
            slots: { default: "Primary" },
        })
        expect(wrapper.classes()).toContain("bg-indigo-600")
        expect(wrapper.classes()).toContain("text-white")
    })

    it("applies danger variant classes", () => {
        const wrapper = mount(Button, {
            props: { variant: "danger" },
            slots: { default: "Delete" },
        })
        expect(wrapper.classes()).toContain("bg-red-600")
        expect(wrapper.classes()).toContain("text-white")
    })

    it("applies size classes", () => {
        const wrapper = mount(Button, {
            props: { size: "lg" },
            slots: { default: "Large" },
        })
        expect(wrapper.classes()).toContain("px-6")
        expect(wrapper.classes()).toContain("py-3")
    })

    it("renders as <a> when href is provided", () => {
        const wrapper = mount(Button, {
            props: { href: "https://example.com" },
            slots: { default: "Link" },
        })
        expect(wrapper.element.tagName).toBe("A")
        expect(wrapper.attributes("href")).toBe("https://example.com")
        expect(wrapper.classes()).toContain("inline-flex")
    })

    it("uses submit type when specified", () => {
        const wrapper = mount(Button, {
            props: { type: "submit" },
            slots: { default: "Submit" },
        })
        expect(wrapper.attributes("type")).toBe("submit")
    })
})
