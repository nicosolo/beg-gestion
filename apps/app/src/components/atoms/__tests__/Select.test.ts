import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import Select from "../Select.vue"

const defaultOptions = [
    { label: "-- Choose --", value: "" },
    { label: "Option A", value: "a" },
    { label: "Option B", value: "b" },
    { label: "Option C", value: "c" },
]

describe("Select", () => {
    it("renders all options", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions },
        })
        const options = wrapper.findAll("option")
        expect(options).toHaveLength(4)
        expect(options[0].text()).toBe("-- Choose --")
        expect(options[1].text()).toBe("Option A")
        expect(options[2].text()).toBe("Option B")
    })

    it("sets option values correctly", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions },
        })
        const options = wrapper.findAll("option")
        expect(options[0].attributes("value")).toBe("")
        expect(options[1].attributes("value")).toBe("a")
        expect(options[2].attributes("value")).toBe("b")
    })

    it("emits update:modelValue on change", async () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions, modelValue: "" },
        })
        await wrapper.find("select").setValue("b")
        expect(wrapper.emitted("update:modelValue")).toBeTruthy()
        expect(wrapper.emitted("update:modelValue")![0]).toEqual(["b"])
    })

    it("shows placeholder when no value selected", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions, modelValue: "" },
        })
        const select = wrapper.find("select")
        expect((select.element as HTMLSelectElement).value).toBe("")
    })

    it("reflects modelValue as selected option", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions, modelValue: "b" },
        })
        const select = wrapper.find("select")
        expect((select.element as HTMLSelectElement).value).toBe("b")
    })

    it("applies disabled attribute and styling", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions, disabled: true },
        })
        const select = wrapper.find("select")
        expect(select.attributes("disabled")).toBeDefined()
        expect(select.classes()).toContain("bg-gray-100")
        expect(select.classes()).toContain("cursor-not-allowed")
    })

    it("applies enabled styling when not disabled", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions },
        })
        const select = wrapper.find("select")
        expect(select.classes()).toContain("bg-white")
    })

    it("sets required attribute", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions, required: true },
        })
        expect(wrapper.find("select").attributes("required")).toBeDefined()
    })

    it("disables empty-value option when required", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions, required: true },
        })
        const options = wrapper.findAll("option")
        expect(options[0].attributes("disabled")).toBeDefined()
        expect(options[1].attributes("disabled")).toBeUndefined()
    })

    it("applies custom className", () => {
        const wrapper = mount(Select, {
            props: { options: defaultOptions, className: "border-red-500" },
        })
        expect(wrapper.find("select").classes()).toContain("border-red-500")
    })

    it("handles null option value", async () => {
        const options = [
            { label: "None", value: null },
            { label: "Some", value: "x" },
        ]
        const wrapper = mount(Select, {
            props: { options, modelValue: null },
        })
        const optionEls = wrapper.findAll("option")
        expect(optionEls[0].attributes("value")).toBe("")
        expect((wrapper.find("select").element as HTMLSelectElement).value).toBe("")
    })

    it("emits null for option with null value", async () => {
        const options = [
            { label: "None", value: null },
            { label: "Some", value: "x" },
        ]
        const wrapper = mount(Select, {
            props: { options, modelValue: "x" },
        })
        await wrapper.find("select").setValue("")
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([null])
    })
})
