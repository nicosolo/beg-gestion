import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mount, VueWrapper } from "@vue/test-utils"
import Dialog from "../Dialog.vue"

describe("Dialog", () => {
    let wrapper: VueWrapper
    const teleportTarget = document.createElement("div")

    beforeEach(() => {
        document.body.appendChild(teleportTarget)
        document.body.style.overflow = ""
    })

    afterEach(() => {
        if (wrapper) wrapper.unmount()
        teleportTarget.innerHTML = ""
        document.body.style.overflow = ""
    })

    const mountDialog = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) => {
        wrapper = mount(Dialog, {
            props: {
                modelValue: true,
                title: "Test Dialog",
                ...props,
            },
            slots,
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })
        return wrapper
    }

    it("renders when modelValue is true", () => {
        mountDialog()
        expect(wrapper.find("[role=\"dialog\"]").exists()).toBe(true)
    })

    it("does not render when modelValue is false", () => {
        mountDialog({ modelValue: false })
        expect(wrapper.find("[role=\"dialog\"]").exists()).toBe(false)
    })

    it("renders title", () => {
        mountDialog({ title: "My Title" })
        expect(wrapper.find("#modal-title").text()).toBe("My Title")
    })

    it("renders default slot content", () => {
        mountDialog({}, { default: "<p>Dialog body</p>" })
        expect(wrapper.html()).toContain("Dialog body")
    })

    it("renders footer slot content", () => {
        mountDialog({}, { footer: "<button>Save</button>" })
        expect(wrapper.html()).toContain("Save")
    })

    it("emits update:modelValue false on backdrop click", async () => {
        mountDialog()
        const backdrop = wrapper.find(".fixed.inset-0.bg-gray-500\\/50")
        await backdrop.trigger("click")
        expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
    })

    it("emits update:modelValue false on ESC key", async () => {
        // Mount closed, then open to trigger watcher that registers keydown
        mountDialog({ modelValue: false })
        await wrapper.setProps({ modelValue: true })
        await wrapper.vm.$nextTick()
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
        expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
    })

    it("does not emit on inner content click (stopPropagation)", async () => {
        mountDialog({}, { default: "<p class=\"inner\">content</p>" })
        // The inner dialog panel has @click.stop
        const panel = wrapper.find(".bg-white.p-4")
        await panel.trigger("click")
        expect(wrapper.emitted("update:modelValue")).toBeUndefined()
    })

    it("applies size classes", () => {
        mountDialog({ size: "sm" })
        expect(wrapper.html()).toContain("sm:max-w-md")
    })

    it("defaults to lg size", () => {
        mountDialog()
        expect(wrapper.html()).toContain("sm:max-w-3xl")
    })

    it("applies xl size class", () => {
        mountDialog({ size: "xl" })
        expect(wrapper.html()).toContain("sm:max-w-5xl")
    })
})
