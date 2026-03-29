import { describe, expect, test } from "bun:test"
import { parseSnapshotTimestamp, selectSnapshotsToDelete } from "../snapshot"

function snapsAt(date: Date): string {
    const ts = date.toISOString().replace(/[:.]/g, "-").slice(0, 19)
    return `db-${ts}.sqlite.gz`
}

function hoursAgo(now: Date, hours: number): Date {
    return new Date(now.getTime() - hours * 3_600_000)
}

function daysAgo(now: Date, days: number): Date {
    return new Date(now.getTime() - days * 86_400_000)
}

describe("parseSnapshotTimestamp", () => {
    test("parses .sqlite.gz filename", () => {
        const date = parseSnapshotTimestamp("db-2026-03-23T14-30-45.sqlite.gz")
        expect(date).toEqual(new Date("2026-03-23T14:30:45Z"))
    })

    test("parses .sqlite filename", () => {
        const date = parseSnapshotTimestamp("db-2026-01-01T00-00-00.sqlite")
        expect(date).toEqual(new Date("2026-01-01T00:00:00Z"))
    })

    test("returns null for non-matching filename", () => {
        expect(parseSnapshotTimestamp("backup.sqlite.gz")).toBeNull()
        expect(parseSnapshotTimestamp("random-file.txt")).toBeNull()
    })

    test("returns null for malformed date", () => {
        expect(parseSnapshotTimestamp("db-9999-99-99T99-99-99.sqlite.gz")).toBeNull()
    })
})

describe("selectSnapshotsToDelete", () => {
    const now = new Date("2026-06-15T12:00:00Z")

    test("empty list returns empty", () => {
        expect(selectSnapshotsToDelete([], now)).toEqual([])
    })

    test("all within 48h kept", () => {
        const snapshots = Array.from({ length: 10 }, (_, i) => snapsAt(hoursAgo(now, i)))
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual([])
    })

    test("two snapshots in same hour bucket — only newest kept", () => {
        const snapshots = [
            snapsAt(new Date("2026-06-15T11:50:00Z")),
            snapsAt(new Date("2026-06-15T11:20:00Z")),
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual(["db-2026-06-15T11-20-00.sqlite.gz"])
    })

    test("48 hourly slots fill exactly", () => {
        const snapshots = Array.from({ length: 50 }, (_, i) => snapsAt(hoursAgo(now, i)))
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        // Hours 0-47 kept by hourly. Hours 48-49 both in daily bucket 2,
        // only newest (hour 48) kept — hour 49 deleted
        expect(toDelete.length).toBe(1)
        expect(toDelete).toContain(snapsAt(hoursAgo(now, 49)))
    })

    test("daily tier keeps snapshots beyond 48h", () => {
        const snapshots = [
            snapsAt(hoursAgo(now, 1)), // hourly
            snapsAt(daysAgo(now, 3)), // daily bucket 3
            snapsAt(daysAgo(now, 5)), // daily bucket 5
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual([])
    })

    test("weekly tier keeps snapshots beyond 7 days", () => {
        const snapshots = [
            snapsAt(hoursAgo(now, 1)),
            snapsAt(daysAgo(now, 14)), // week 2
            snapsAt(daysAgo(now, 21)), // week 3
            snapsAt(daysAgo(now, 50)), // week 7
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual([])
    })

    test("monthly tier keeps snapshots beyond 8 weeks", () => {
        const snapshots = [
            snapsAt(hoursAgo(now, 1)),
            snapsAt(new Date("2026-03-15T12:00:00Z")), // 3 months ago
            snapsAt(new Date("2025-12-15T12:00:00Z")), // 6 months ago
            snapsAt(new Date("2025-07-15T12:00:00Z")), // 11 months ago
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual([])
    })

    test("yearly tier keeps one per calendar year forever", () => {
        const snapshots = [
            snapsAt(hoursAgo(now, 1)),
            snapsAt(new Date("2025-06-15T12:00:00Z")), // 1 year
            snapsAt(new Date("2024-06-15T12:00:00Z")), // 2 years
            snapsAt(new Date("2020-01-01T00:00:00Z")), // 6 years
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual([])
    })

    test("yearly keeps only one per year", () => {
        const snapshots = [
            snapsAt(hoursAgo(now, 1)),
            snapsAt(new Date("2024-08-15T12:00:00Z")), // year bucket 2
            snapsAt(new Date("2024-03-10T12:00:00Z")), // year bucket 2 (dup)
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        // newest in year 2024 is Aug, March gets deleted (not in monthly range either)
        expect(toDelete).toContain("db-2024-03-10T12-00-00.sqlite.gz")
    })

    test("deletes snapshots that fit no tier", () => {
        // 100 days ago, one per day — many will be pruned
        const snapshots = Array.from({ length: 100 }, (_, i) => snapsAt(daysAgo(now, i)))
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        // Should keep: up to 48 hourly (only 2 fit: day 0,1), 7 daily, 8 weekly, 12 monthly
        // Many beyond week 8 / month 12 should be deleted (except if yearly)
        expect(toDelete.length).toBeGreaterThan(0)
        // Day 0 and day 1 kept (hourly/daily), verify they're not deleted
        expect(toDelete).not.toContain(snapsAt(daysAgo(now, 0)))
        expect(toDelete).not.toContain(snapsAt(daysAgo(now, 1)))
    })

    test("future snapshots are kept", () => {
        const snapshots = [
            snapsAt(new Date("2026-06-16T12:00:00Z")), // 1 day in future
            snapsAt(hoursAgo(now, 1)),
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual([])
    })
})
