import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import InputNumber from "../InputNumber.vue"

describe("InputNumber", () => {
    it("renders with numeric value", () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 42 },
        })
        const input = wrapper.find("input")
        expect(input.element.value).toBe("42")
        expect(input.attributes("type")).toBe("text")
        expect(input.attributes("inputmode")).toBe("decimal")
    })

    it("renders with null value", () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: null },
        })
        expect(wrapper.find("input").element.value).toBe("")
    })

    it("emits update:modelValue on input", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 0 },
        })
        const input = wrapper.find("input")
        await input.setValue("15.5")
        expect(wrapper.emitted("update:modelValue")).toBeTruthy()
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([15.5])
    })

    it("sets min attribute", () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 5, min: 0 },
        })
        expect(wrapper.find("input").attributes("min")).toBe("0")
    })

    it("ArrowUp increments by step", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 10, step: 2 },
        })
        await wrapper.find("input").trigger("keydown", { key: "ArrowUp" })
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([12])
    })

    it("ArrowDown decrements by step", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 10, step: 3 },
        })
        await wrapper.find("input").trigger("keydown", { key: "ArrowDown" })
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([7])
    })

    it("ArrowDown respects min constraint", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 1, step: 5, min: 0 },
        })
        await wrapper.find("input").trigger("keydown", { key: "ArrowDown" })
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([0])
    })

    it("ArrowDown respects string min constraint", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 1, step: 5, min: "0" },
        })
        await wrapper.find("input").trigger("keydown", { key: "ArrowDown" })
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([0])
    })

    it("uses default step per type", async () => {
        // percentage type defaults to step=0.1 (but explicit step=1 overrides)
        // When step prop = 1 (default), stepValue returns step directly
        // To test type-based defaults, we need step to be falsy
        const wrapper = mount(InputNumber, {
            props: { modelValue: 5, type: "time", step: 0 },
        })
        await wrapper.find("input").trigger("keydown", { key: "ArrowUp" })
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([5.25])
    })

    it("rounds result to 3 decimal places", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 0.1, step: 0.2 },
        })
        await wrapper.find("input").trigger("keydown", { key: "ArrowUp" })
        // 0.1 + 0.2 = 0.30000000000000004 → rounds to 0.3
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([0.3])
    })

    it("width class varies by type", () => {
        const percentage = mount(InputNumber, {
            props: { modelValue: 0, type: "percentage" },
        })
        expect(percentage.find("input").classes()).toContain("w-16")

        const amount = mount(InputNumber, {
            props: { modelValue: 0, type: "amount" },
        })
        expect(amount.find("input").classes()).toContain("w-24")

        const number = mount(InputNumber, {
            props: { modelValue: 0, type: "number" },
        })
        expect(number.find("input").classes()).toContain("w-20")

        const distance = mount(InputNumber, {
            props: { modelValue: 0, type: "distance" },
        })
        expect(distance.find("input").classes()).toContain("w-16")
    })

    it("handles null modelValue on ArrowUp", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: null, step: 1 },
        })
        await wrapper.find("input").trigger("keydown", { key: "ArrowUp" })
        // null → 0 + 1 = 1
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([1])
    })

    it("accepts comma as decimal separator", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 0 },
        })
        const input = wrapper.find("input")
        await input.setValue("15,5")
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([15.5])
    })

    it("accepts dot as decimal separator", async () => {
        const wrapper = mount(InputNumber, {
            props: { modelValue: 0 },
        })
        const input = wrapper.find("input")
        await input.setValue("15.5")
        expect(wrapper.emitted("update:modelValue")![0]).toEqual([15.5])
    })
})
