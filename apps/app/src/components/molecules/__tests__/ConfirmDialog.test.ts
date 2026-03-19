import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mount, VueWrapper } from "@vue/test-utils"
import { createI18n } from "vue-i18n"
import ConfirmDialog from "../ConfirmDialog.vue"
import fr from "@/i18n/locales/fr"

describe("ConfirmDialog", () => {
    let wrapper: VueWrapper

    const i18n = createI18n({
        legacy: false,
        locale: "fr",
        messages: { fr },
    })

    beforeEach(() => {
        document.body.style.overflow = ""
    })

    afterEach(() => {
        if (wrapper) wrapper.unmount()
        document.body.style.overflow = ""
    })

    const mountConfirmDialog = (props: Record<string, unknown> = {}) => {
        wrapper = mount(ConfirmDialog, {
            props: {
                modelValue: true,
                title: "Confirm Action",
                message: "Are you sure?",
                ...props,
            },
            global: {
                plugins: [i18n],
                stubs: {
                    Teleport: true,
                },
            },
        })
        return wrapper
    }

    it("shows message", () => {
        mountConfirmDialog({ message: "Delete this item?" })
        expect(wrapper.text()).toContain("Delete this item?")
    })

    it("renders title in dialog", () => {
        mountConfirmDialog({ title: "Warning" })
        expect(wrapper.text()).toContain("Warning")
    })

    it("confirm button emits confirm", async () => {
        mountConfirmDialog()
        const buttons = wrapper.findAll("button")
        const confirmBtn = buttons.find((b) => b.text().includes(fr.common.confirm))!
        await confirmBtn.trigger("click")
        expect(wrapper.emitted("confirm")).toHaveLength(1)
    })

    it("cancel button emits cancel and update:modelValue false", async () => {
        mountConfirmDialog()
        const buttons = wrapper.findAll("button")
        const cancelBtn = buttons.find((b) => b.text().includes(fr.common.cancel))!
        await cancelBtn.trigger("click")
        expect(wrapper.emitted("cancel")).toHaveLength(1)
        expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
    })

    it("uses custom confirmText and cancelText", () => {
        mountConfirmDialog({ confirmText: "Yes, delete", cancelText: "No, keep" })
        expect(wrapper.text()).toContain("Yes, delete")
        expect(wrapper.text()).toContain("No, keep")
    })

    it("shows warning icon by default", () => {
        mountConfirmDialog()
        expect(wrapper.find(".bg-yellow-100").exists()).toBe(true)
        expect(wrapper.find(".text-yellow-600").exists()).toBe(true)
    })

    it("shows danger icon when type is danger", () => {
        mountConfirmDialog({ type: "danger" })
        expect(wrapper.find(".bg-red-100").exists()).toBe(true)
        expect(wrapper.find(".text-red-600").exists()).toBe(true)
    })

    it("confirm button uses danger variant when type is danger", () => {
        mountConfirmDialog({ type: "danger" })
        const buttons = wrapper.findAll("button")
        const confirmBtn = buttons.find((b) => b.text().includes(fr.common.confirm))!
        expect(confirmBtn.classes()).toContain("bg-red-600")
    })

    it("backdrop close emits cancel", async () => {
        mountConfirmDialog()
        const backdrop = wrapper.find(".fixed.inset-0.bg-gray-500\\/50")
        await backdrop.trigger("click")
        expect(wrapper.emitted("cancel")).toHaveLength(1)
        expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
    })

    it("does not render when modelValue is false", () => {
        mountConfirmDialog({ modelValue: false })
        expect(wrapper.find("[role=\"dialog\"]").exists()).toBe(false)
    })
})
