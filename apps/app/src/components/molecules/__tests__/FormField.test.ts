import { describe, it, expect, afterEach } from "vitest"
import { mount, VueWrapper } from "@vue/test-utils"
import FormField from "../FormField.vue"

describe("FormField", () => {
    let wrapper: VueWrapper

    afterEach(() => {
        if (wrapper) wrapper.unmount()
    })

    const mountFormField = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) => {
        wrapper = mount(FormField, {
            props,
            slots,
        })
        return wrapper
    }

    it("renders label text", () => {
        mountFormField({ label: "Username" })
        expect(wrapper.text()).toContain("Username")
        expect(wrapper.find("label").exists()).toBe(true)
    })

    it("does not render label when label prop is absent", () => {
        mountFormField()
        expect(wrapper.find("label").exists()).toBe(false)
    })

    it("renders required indicator when required is true", () => {
        mountFormField({ label: "Email", required: true })
        const asterisk = wrapper.find(".text-red-500")
        expect(asterisk.exists()).toBe(true)
        expect(asterisk.text()).toBe("*")
    })

    it("does not render required indicator when required is false", () => {
        mountFormField({ label: "Email", required: false })
        expect(wrapper.find(".text-red-500").exists()).toBe(false)
    })

    it("renders input slot content", () => {
        mountFormField({ label: "Name" }, { input: '<input type="text" class="test-input" />' })
        expect(wrapper.find(".test-input").exists()).toBe(true)
    })

    it("renders help-text slot content", () => {
        mountFormField({}, { "help-text": "Must be at least 8 characters" })
        expect(wrapper.text()).toContain("Must be at least 8 characters")
        expect(wrapper.find("p.text-sm.text-gray-500").exists()).toBe(true)
    })

    it("renders help slot content (overrides default help)", () => {
        mountFormField({}, { help: '<span class="custom-help">Custom help</span>' })
        expect(wrapper.find(".custom-help").exists()).toBe(true)
        expect(wrapper.find("p.text-sm.text-gray-500").exists()).toBe(false)
    })

    it("passes labelClassName to Label component", () => {
        mountFormField({ label: "Field", labelClassName: "text-blue-500" })
        const label = wrapper.find("label")
        expect(label.classes()).toContain("text-blue-500")
    })

    it("uses default label class when no labelClassName", () => {
        mountFormField({ label: "Field" })
        const label = wrapper.find("label")
        expect(label.classes()).toContain("text-gray-700")
    })

    it("renders form-group wrapper", () => {
        mountFormField()
        expect(wrapper.find(".form-group").exists()).toBe(true)
    })
})
