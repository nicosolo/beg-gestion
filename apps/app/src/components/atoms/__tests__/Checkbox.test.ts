import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import Checkbox from "../Checkbox.vue"

describe("Checkbox", () => {
    it("renders unchecked by default", () => {
        const wrapper = mount(Checkbox, {
            props: { modelValue: false },
        })
        const input = wrapper.find("input[type='checkbox']")
        expect((input.element as HTMLInputElement).checked).toBe(false)
    })

    it("renders checked when modelValue is true", () => {
        const wrapper = mount(Checkbox, {
            props: { modelValue: true },
        })
        const input = wrapper.find("input[type='checkbox']")
        expect((input.element as HTMLInputElement).checked).toBe(true)
    })

    it("emits update:modelValue on toggle", async () => {
        const wrapper = mount(Checkbox, {
            props: { modelValue: false },
        })
        await wrapper.find("input").setValue(true)
        expect(wrapper.emitted("update:modelValue")).toBeTruthy()
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([true])
    })

    it("emits false when unchecking", async () => {
        const wrapper = mount(Checkbox, {
            props: { modelValue: true },
        })
        await wrapper.find("input").setValue(false)
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([false])
    })

    it("applies disabled attribute", () => {
        const wrapper = mount(Checkbox, {
            props: { modelValue: false, disabled: true },
        })
        expect(wrapper.find("input").attributes("disabled")).toBeDefined()
    })

    it("renders label when provided", () => {
        const wrapper = mount(Checkbox, {
            props: { modelValue: false, label: "Accept terms" },
        })
        expect(wrapper.find("label").text()).toBe("Accept terms")
    })

    it("does not render label when not provided", () => {
        const wrapper = mount(Checkbox, {
            props: { modelValue: false },
        })
        expect(wrapper.find("label").exists()).toBe(false)
    })

    it("links label to input via id", () => {
        const wrapper = mount(Checkbox, {
            props: { modelValue: false, label: "Check me", id: "my-checkbox" },
        })
        expect(wrapper.find("input").attributes("id")).toBe("my-checkbox")
        expect(wrapper.find("label").attributes("for")).toBe("my-checkbox")
    })
})
