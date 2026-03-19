import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { debounce, debounceAsync } from "../debounce"

describe("debounce", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("calls fn once after delay", () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced()
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledOnce()
    })

    it("multiple rapid calls → only last one executes", () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced("a")
        debounced("b")
        debounced("c")

        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledOnce()
        expect(fn).toHaveBeenCalledWith("c")
    })

    it("passes arguments to the original function", () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 50)

        debounced(1, "two", true)
        vi.advanceTimersByTime(50)

        expect(fn).toHaveBeenCalledWith(1, "two", true)
    })

    it("resets timer on each call", () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced()
        vi.advanceTimersByTime(80)
        expect(fn).not.toHaveBeenCalled()

        debounced()
        vi.advanceTimersByTime(80)
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(20)
        expect(fn).toHaveBeenCalledOnce()
    })
})

describe("debounceAsync", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("calls async fn once after delay", async () => {
        const fn = vi.fn().mockResolvedValue(undefined)
        const debounced = debounceAsync(fn, 100)

        const promise = debounced()
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(100)
        await promise

        expect(fn).toHaveBeenCalledOnce()
    })

    it("multiple rapid calls → only last one executes", async () => {
        const fn = vi.fn().mockResolvedValue(undefined)
        const debounced = debounceAsync(fn, 100)

        debounced("a")
        debounced("b")
        const promise = debounced("c")

        vi.advanceTimersByTime(100)
        await promise

        expect(fn).toHaveBeenCalledOnce()
        expect(fn).toHaveBeenCalledWith("c")
    })

    it("returns a promise that resolves after fn completes", async () => {
        let resolved = false
        const fn = vi.fn().mockResolvedValue(undefined)
        const debounced = debounceAsync(fn, 50)

        const promise = debounced()
        promise.then(() => {
            resolved = true
        })

        expect(resolved).toBe(false)
        vi.advanceTimersByTime(50)
        await promise

        expect(resolved).toBe(true)
        expect(fn).toHaveBeenCalledOnce()
    })
})
