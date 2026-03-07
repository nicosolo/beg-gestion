export type DateRangePresetKey = "today" | "week" | "month" | "year" | "allTime"

export interface DateRangeInterval {
    from: Date
    to: Date
}

export function startOfDay(date: Date): Date {
    const value = new Date(date)
    value.setHours(0, 0, 0, 0)
    return value
}

export function endOfDay(date: Date): Date {
    const value = new Date(date)
    value.setHours(23, 59, 59, 999)
    return value
}

export function getTodayRange(referenceDate: Date = new Date()): DateRangeInterval {
    const start = startOfDay(referenceDate)
    const end = endOfDay(referenceDate)
    return { from: start, to: end }
}

export function getWeekRange(referenceDate: Date = new Date()): DateRangeInterval {
    const base = new Date(referenceDate)
    const day = base.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day

    const monday = new Date(base)
    monday.setDate(base.getDate() + diffToMonday)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return { from: startOfDay(monday), to: endOfDay(sunday) }
}

export function getMonthRange(referenceDate: Date = new Date()): DateRangeInterval {
    const year = referenceDate.getFullYear()
    const month = referenceDate.getMonth()

    const firstDay = startOfDay(new Date(year, month, 1))
    const lastDay = endOfDay(new Date(year, month + 1, 0))

    return { from: firstDay, to: lastDay }
}

export function getYearRange(
    referenceDate: Date = new Date(),
    yearsBefore: number = 0
): DateRangeInterval {
    const year = referenceDate.getFullYear()
    const firstDay = startOfDay(new Date(year - yearsBefore, 0, 1))
    const lastDay = endOfDay(new Date(year, 11, 31))
    return { from: firstDay, to: lastDay }
}

export function shiftDayRange(currentFrom: Date | undefined, direction: number): DateRangeInterval {
    const base = currentFrom ? new Date(currentFrom) : new Date()
    base.setDate(base.getDate() + direction)
    return getTodayRange(base)
}

export function shiftWeekRange(
    currentFrom: Date | undefined,
    direction: number
): DateRangeInterval {
    const base = currentFrom ? new Date(currentFrom) : new Date()
    base.setDate(base.getDate() + 7 * direction)
    return getWeekRange(base)
}

export function shiftMonthRange(
    currentFrom: Date | undefined,
    direction: number
): DateRangeInterval {
    const base = currentFrom ? new Date(currentFrom) : new Date()
    const year = base.getFullYear()
    const month = base.getMonth()

    const target = new Date(year, month + direction, 1)
    return getMonthRange(target)
}

export function shiftYearRange(
    currentFrom: Date | undefined,
    direction: number
): DateRangeInterval {
    const base = currentFrom ? new Date(currentFrom) : new Date()
    const target = new Date(base)
    target.setFullYear(target.getFullYear() + direction)
    return getYearRange(target)
}

export function normaliseFromDate(date: Date): Date {
    return startOfDay(date)
}

export function normaliseToDate(date: Date): Date {
    return endOfDay(date)
}

export function detectPreset(from?: Date, to?: Date): DateRangePresetKey | null {
    if (!from || !to) return "allTime"

    const todayRange = getTodayRange()
    if (isSameTimestamp(from, todayRange.from) && isSameTimestamp(to, todayRange.to)) {
        return "today"
    }

    const weekRange = getWeekRange()
    if (isSameTimestamp(from, weekRange.from) && isSameTimestamp(to, weekRange.to)) {
        return "week"
    }

    const monthRange = getMonthRange()
    if (isSameTimestamp(from, monthRange.from) && isSameTimestamp(to, monthRange.to)) {
        return "month"
    }

    const yearRange = getYearRange()
    if (isSameTimestamp(from, yearRange.from) && isSameTimestamp(to, yearRange.to)) {
        return "year"
    }

    return null
}

function isSameTimestamp(first?: Date, second?: Date): boolean {
    if (!first || !second) return false
    return first.getTime() === second.getTime()
}
