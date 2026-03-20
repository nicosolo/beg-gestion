import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mount, VueWrapper } from "@vue/test-utils"
import { createI18n } from "vue-i18n"
import DateRange from "../DateRange.vue"
import fr from "@/i18n/locales/fr"
import {
    getTodayRange,
    getWeekRange,
    getMonthRange,
    getYearRange,
} from "@/composables/utils/useDateRangePresets"

describe("DateRange", () => {
    let wrapper: VueWrapper

    const i18n = createI18n({
        legacy: false,
        locale: "fr",
        messages: { fr },
    })

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2026, 2, 19, 12, 0, 0)) // 2026-03-19
    })

    afterEach(() => {
        if (wrapper) wrapper.unmount()
        vi.useRealTimers()
    })

    const mountDateRange = (props: Record<string, unknown> = {}) => {
        wrapper = mount(DateRange, {
            props: {
                ...props,
            },
            global: {
                plugins: [i18n],
                stubs: {
                    DateField: {
                        template: '<input type="date" class="date-field" :value="modelValue" />',
                        props: ["modelValue", "label", "disabled"],
                    },
                },
            },
        })
        return wrapper
    }

    it("renders from and to date inputs", () => {
        mountDateRange()
        const dateFields = wrapper.findAll(".date-field")
        expect(dateFields).toHaveLength(2)
    })

    it("renders preset buttons", () => {
        mountDateRange()
        expect(wrapper.text()).toContain(fr.dateRange.allTime)
        expect(wrapper.text()).toContain(fr.dateRange.today)
        expect(wrapper.text()).toContain(fr.dateRange.week)
        expect(wrapper.text()).toContain(fr.dateRange.month)
        expect(wrapper.text()).toContain(fr.dateRange.year)
    })

    it("clicking Today sets today range", async () => {
        mountDateRange()
        const buttons = wrapper.findAll("button")
        const todayBtn = buttons.find((b) => b.text().includes(fr.dateRange.today))!
        await todayBtn.trigger("click")

        const { from, to } = getTodayRange()
        const changeEvents = wrapper.emitted("change") as Array<[{ fromDate: Date; toDate: Date }]>
        expect(changeEvents).toHaveLength(1)
        expect(changeEvents[0][0].fromDate.getTime()).toBe(from.getTime())
        expect(changeEvents[0][0].toDate.getTime()).toBe(to.getTime())
    })

    it("clicking Week sets week range", async () => {
        mountDateRange()
        const buttons = wrapper.findAll("button")
        const weekBtn = buttons.find((b) => b.text().includes(fr.dateRange.week))!
        await weekBtn.trigger("click")

        const { from, to } = getWeekRange()
        const changeEvents = wrapper.emitted("change") as Array<[{ fromDate: Date; toDate: Date }]>
        expect(changeEvents).toHaveLength(1)
        expect(changeEvents[0][0].fromDate.getTime()).toBe(from.getTime())
        expect(changeEvents[0][0].toDate.getTime()).toBe(to.getTime())
    })

    it("clicking Month sets month range", async () => {
        mountDateRange()
        const buttons = wrapper.findAll("button")
        const monthBtn = buttons.find((b) => b.text().includes(fr.dateRange.month))!
        await monthBtn.trigger("click")

        const { from, to } = getMonthRange()
        const changeEvents = wrapper.emitted("change") as Array<[{ fromDate: Date; toDate: Date }]>
        expect(changeEvents).toHaveLength(1)
        expect(changeEvents[0][0].fromDate.getTime()).toBe(from.getTime())
        expect(changeEvents[0][0].toDate.getTime()).toBe(to.getTime())
    })

    it("clicking Year sets year range", async () => {
        mountDateRange()
        const buttons = wrapper.findAll("button")
        const yearBtn = buttons.find((b) => b.text().includes(fr.dateRange.year))!
        await yearBtn.trigger("click")

        const { from, to } = getYearRange()
        const changeEvents = wrapper.emitted("change") as Array<[{ fromDate: Date; toDate: Date }]>
        expect(changeEvents).toHaveLength(1)
        expect(changeEvents[0][0].fromDate.getTime()).toBe(from.getTime())
        expect(changeEvents[0][0].toDate.getTime()).toBe(to.getTime())
    })

    it("clicking All Time clears dates", async () => {
        mountDateRange({ fromDate: new Date(), toDate: new Date() })
        const buttons = wrapper.findAll("button")
        const allTimeBtn = buttons.find((b) => b.text().includes(fr.dateRange.allTime))!
        await allTimeBtn.trigger("click")

        expect(wrapper.emitted("update:fromDate")![0]).toEqual([undefined])
        expect(wrapper.emitted("update:toDate")![0]).toEqual([undefined])
    })

    it("day navigation forward shifts range by +1 day", async () => {
        const { from, to } = getTodayRange()
        mountDateRange({ fromDate: from, toDate: to })

        const nextDayBtn = wrapper.find(`button[title="${fr.dateRange.nextDay}"]`)
        await nextDayBtn.trigger("click")

        const changeEvents = wrapper.emitted("change") as Array<[{ fromDate: Date; toDate: Date }]>
        expect(changeEvents).toHaveLength(1)
        const emittedFrom = changeEvents[0][0].fromDate
        expect(emittedFrom.getDate()).toBe(20) // tomorrow
    })

    it("day navigation backward shifts range by -1 day", async () => {
        const { from, to } = getTodayRange()
        mountDateRange({ fromDate: from, toDate: to })

        const prevDayBtn = wrapper.find(`button[title="${fr.dateRange.previousDay}"]`)
        await prevDayBtn.trigger("click")

        const changeEvents = wrapper.emitted("change") as Array<[{ fromDate: Date; toDate: Date }]>
        expect(changeEvents).toHaveLength(1)
        const emittedFrom = changeEvents[0][0].fromDate
        expect(emittedFrom.getDate()).toBe(18) // yesterday
    })

    it("month navigation forward shifts to next month", async () => {
        const { from, to } = getMonthRange()
        mountDateRange({ fromDate: from, toDate: to })

        const nextMonthBtn = wrapper.find(`button[title="${fr.dateRange.nextMonth}"]`)
        await nextMonthBtn.trigger("click")

        const changeEvents = wrapper.emitted("change") as Array<[{ fromDate: Date; toDate: Date }]>
        expect(changeEvents).toHaveLength(1)
        expect(changeEvents[0][0].fromDate.getMonth()).toBe(3) // April
    })

    it("emits update:fromDate and update:toDate on preset click", async () => {
        mountDateRange()
        const buttons = wrapper.findAll("button")
        const todayBtn = buttons.find((b) => b.text().includes(fr.dateRange.today))!
        await todayBtn.trigger("click")

        expect(wrapper.emitted("update:fromDate")).toHaveLength(1)
        expect(wrapper.emitted("update:toDate")).toHaveLength(1)
    })
})
