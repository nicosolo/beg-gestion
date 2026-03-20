import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import Input from "../Input.vue"

describe("Input", () => {
    it("renders with placeholder", () => {
        const wrapper = mount(Input, {
            props: { placeholder: "Enter text" },
        })
        expect(wrapper.find("input").attributes("placeholder")).toBe("Enter text")
    })

    it("renders with default type text", () => {
        const wrapper = mount(Input)
        expect(wrapper.find("input").attributes("type")).toBeUndefined()
    })

    it("renders with custom type", () => {
        const wrapper = mount(Input, {
            props: { type: "email" },
        })
        expect(wrapper.find("input").attributes("type")).toBe("email")
    })

    it("renders with modelValue", () => {
        const wrapper = mount(Input, {
            props: { modelValue: "hello" },
        })
        expect(wrapper.find("input").element.value).toBe("hello")
    })

    it("emits update:modelValue on input", async () => {
        const wrapper = mount(Input)
        const input = wrapper.find("input")
        await input.setValue("new value")
        expect(wrapper.emitted("update:modelValue")).toBeTruthy()
        expect(wrapper.emitted("update:modelValue")![0]).toEqual(["new value"])
    })

    it("disabled state sets attribute and styling", () => {
        const wrapper = mount(Input, {
            props: { disabled: true },
        })
        const input = wrapper.find("input")
        expect(input.attributes("disabled")).toBeDefined()
        expect(input.classes()).toContain("bg-gray-100")
        expect(input.classes()).toContain("cursor-not-allowed")
    })

    it("enabled state has white background", () => {
        const wrapper = mount(Input, {
            props: { disabled: false },
        })
        const input = wrapper.find("input")
        expect(input.classes()).toContain("bg-white")
        expect(input.classes()).not.toContain("bg-gray-100")
    })

    it("error state styling via className prop", () => {
        const wrapper = mount(Input, {
            props: { className: "border-red-500" },
        })
        expect(wrapper.find("input").classes()).toContain("border-red-500")
    })

    it("required attribute is set", () => {
        const wrapper = mount(Input, {
            props: { required: true },
        })
        expect(wrapper.find("input").attributes("required")).toBeDefined()
    })

    it("passes min and max attributes", () => {
        const wrapper = mount(Input, {
            props: { min: "0", max: "100" },
        })
        const input = wrapper.find("input")
        expect(input.attributes("min")).toBe("0")
        expect(input.attributes("max")).toBe("100")
    })
})
