import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { defineComponent, ref, nextTick } from "vue"
import { mount, type VueWrapper } from "@vue/test-utils"

let onBeforeRouteLeaveCallback: (() => boolean | void | Promise<boolean | void>) | null = null

vi.mock("vue-router", () => ({
    onBeforeRouteLeave: (cb: () => boolean | void | Promise<boolean | void>) => {
        onBeforeRouteLeaveCallback = cb
    },
}))

import { useUnsavedChanges } from "@/composables/utils/useUnsavedChanges"

function createWrapper(options = {}) {
    let composable: ReturnType<typeof useUnsavedChanges>
    const Comp = defineComponent({
        setup() {
            composable = useUnsavedChanges(options)
            return composable
        },
        template: "<div />",
    })
    const wrapper = mount(Comp)
    return { wrapper, composable: composable! }
}

describe("useUnsavedChanges", () => {
    let activeWrapper: VueWrapper | null = null

    beforeEach(() => {
        onBeforeRouteLeaveCallback = null
        // Ensure window.confirm exists for happy-dom
        window.confirm = vi.fn(() => true)
    })

    afterEach(() => {
        // Unmount to clean up beforeunload listeners
        if (activeWrapper) {
            activeWrapper.unmount()
            activeWrapper = null
        }
        vi.restoreAllMocks()
    })

    function create(options = {}) {
        const result = createWrapper(options)
        activeWrapper = result.wrapper
        return result
    }

    it("markDirty sets isDirty and hasUnsavedChanges to true", () => {
        const { composable } = create()

        expect(composable.isDirty.value).toBe(false)
        expect(composable.hasUnsavedChanges.value).toBe(false)

        composable.markDirty()

        expect(composable.isDirty.value).toBe(true)
        expect(composable.hasUnsavedChanges.value).toBe(true)
    })

    it("markClean sets isDirty back to false", () => {
        const { composable } = create()

        composable.markDirty()
        expect(composable.isDirty.value).toBe(true)

        composable.markClean()
        expect(composable.isDirty.value).toBe(false)
        expect(composable.hasUnsavedChanges.value).toBe(false)
    })

    it("hasUnsavedChanges reflects custom hasChanges option", async () => {
        const customChanges = ref(false)
        const { composable } = create({ hasChanges: customChanges })

        expect(composable.hasUnsavedChanges.value).toBe(false)

        customChanges.value = true
        await nextTick()
        expect(composable.hasUnsavedChanges.value).toBe(true)

        // isDirty still false — hasUnsavedChanges comes from custom ref
        expect(composable.isDirty.value).toBe(false)
    })

    it("hasUnsavedChanges is true when either isDirty or hasChanges is true", async () => {
        const customChanges = ref(false)
        const { composable } = create({ hasChanges: customChanges })

        composable.markDirty()
        expect(composable.hasUnsavedChanges.value).toBe(true)

        composable.markClean()
        customChanges.value = true
        await nextTick()
        expect(composable.hasUnsavedChanges.value).toBe(true)
    })

    it("beforeunload preventDefault when dirty", () => {
        const { composable } = create()
        composable.markDirty()

        const event = new Event("beforeunload") as BeforeUnloadEvent
        const spy = vi.spyOn(event, "preventDefault")
        window.dispatchEvent(event)

        expect(spy).toHaveBeenCalled()
    })

    it("beforeunload does nothing when clean", () => {
        create()

        const event = new Event("beforeunload") as BeforeUnloadEvent
        const spy = vi.spyOn(event, "preventDefault")
        window.dispatchEvent(event)

        expect(spy).not.toHaveBeenCalled()
    })

    it("beforeunload listener removed on unmount", () => {
        const { wrapper, composable } = createWrapper()
        composable.markDirty()

        wrapper.unmount()

        const event = new Event("beforeunload") as BeforeUnloadEvent
        const spy = vi.spyOn(event, "preventDefault")
        window.dispatchEvent(event)

        expect(spy).not.toHaveBeenCalled()
    })

    it("route guard blocks navigation when dirty", async () => {
        const { composable } = create()
        composable.markDirty()

        window.confirm = vi.fn(() => false)

        expect(onBeforeRouteLeaveCallback).toBeTruthy()
        const result = await onBeforeRouteLeaveCallback!()
        expect(result).toBe(false)
        expect(window.confirm).toHaveBeenCalled()
    })

    it("route guard allows navigation when clean", async () => {
        create()

        expect(onBeforeRouteLeaveCallback).toBeTruthy()
        const result = await onBeforeRouteLeaveCallback!()
        expect(result).toBeUndefined()
    })

    it("route guard allows navigation when user confirms", async () => {
        const { composable } = create()
        composable.markDirty()

        window.confirm = vi.fn(() => true)

        const result = await onBeforeRouteLeaveCallback!()
        expect(result).toBeUndefined()
    })

    it("no route guard when useRouteGuard is false", () => {
        create({ useRouteGuard: false })
        expect(onBeforeRouteLeaveCallback).toBeNull()
    })
})
