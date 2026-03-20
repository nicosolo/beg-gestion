import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useAlert } from "@/composables/utils/useAlert"

describe("useAlert", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        // Clear shared alerts state
        const { alerts, removeAlert } = useAlert()
        while (alerts.value.length > 0) {
            removeAlert(alerts.value[0].id)
        }
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("addAlert adds alert to alerts array", () => {
        const { alerts, addAlert } = useAlert()
        addAlert("ok", "success")

        expect(alerts.value).toHaveLength(1)
        expect(alerts.value[0].message).toBe("ok")
        expect(alerts.value[0].type).toBe("success")
        expect(alerts.value[0].visible).toBe(true)
    })

    it("addAlert returns alert id", () => {
        const { addAlert } = useAlert()
        const id = addAlert("test", "info")
        expect(typeof id).toBe("string")
    })

    it("max 5 alerts — oldest removed when 6th added", () => {
        const { alerts, addAlert } = useAlert()

        for (let i = 0; i < 6; i++) {
            vi.advanceTimersByTime(1) // ensure unique Date.now()
            addAlert(`msg-${i}`, "info", 0)
        }

        expect(alerts.value).toHaveLength(5)
        expect(alerts.value[0].message).toBe("msg-1")
        expect(alerts.value[4].message).toBe("msg-5")
    })

    it("auto-dismiss after timeout", () => {
        const { alerts, addAlert } = useAlert()
        addAlert("dismiss me", "success", 3000)

        expect(alerts.value).toHaveLength(1)
        vi.advanceTimersByTime(3000)
        expect(alerts.value).toHaveLength(0)
    })

    it("no auto-dismiss when duration is 0", () => {
        const { alerts, addAlert } = useAlert()
        addAlert("stay", "info", 0)

        vi.advanceTimersByTime(10000)
        expect(alerts.value).toHaveLength(1)
    })

    it("removeAlert removes specific alert", () => {
        const { alerts, addAlert, removeAlert } = useAlert()
        const id1 = addAlert("first", "info", 0)
        vi.advanceTimersByTime(1)
        addAlert("second", "info", 0)

        removeAlert(id1)

        expect(alerts.value).toHaveLength(1)
        expect(alerts.value[0].message).toBe("second")
    })

    it("removeAlert with unknown id does nothing", () => {
        const { alerts, addAlert, removeAlert } = useAlert()
        addAlert("test", "info", 0)

        removeAlert("nonexistent")
        expect(alerts.value).toHaveLength(1)
    })

    it("successAlert sets type to success", () => {
        const { alerts, successAlert } = useAlert()
        successAlert("ok", 0)

        expect(alerts.value[0].type).toBe("success")
        expect(alerts.value[0].message).toBe("ok")
    })

    it("errorAlert sets type to error", () => {
        const { alerts, errorAlert } = useAlert()
        errorAlert("fail", 0)

        expect(alerts.value[0].type).toBe("error")
        expect(alerts.value[0].message).toBe("fail")
    })

    it("infoAlert sets type to info", () => {
        const { alerts, infoAlert } = useAlert()
        infoAlert("note", 0)

        expect(alerts.value[0].type).toBe("info")
    })

    it("warningAlert sets type to warning", () => {
        const { alerts, warningAlert } = useAlert()
        warningAlert("warn", 0)

        expect(alerts.value[0].type).toBe("warning")
    })
})
