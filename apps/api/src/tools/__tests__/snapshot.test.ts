import { describe, expect, test } from "bun:test"
import {
    parseSnapshotTimestamp,
    selectSnapshotsToDelete,
    classifySnapshots,
    stripTierPrefix,
} from "../snapshot"

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

describe("stripTierPrefix", () => {
    test("strips known prefixes", () => {
        expect(stripTierPrefix("hourly-db-2026-03-23T14-30-45.sqlite.gz")).toBe(
            "db-2026-03-23T14-30-45.sqlite.gz"
        )
        expect(stripTierPrefix("daily-db-2026-03-23T14-30-45.sqlite.gz")).toBe(
            "db-2026-03-23T14-30-45.sqlite.gz"
        )
        expect(stripTierPrefix("yearly-db-2026-03-23T14-30-45.sqlite.gz")).toBe(
            "db-2026-03-23T14-30-45.sqlite.gz"
        )
    })

    test("returns unchanged if no prefix", () => {
        expect(stripTierPrefix("db-2026-03-23T14-30-45.sqlite.gz")).toBe(
            "db-2026-03-23T14-30-45.sqlite.gz"
        )
    })
})

describe("parseSnapshotTimestamp", () => {
    test("parses .sqlite.gz filename", () => {
        const date = parseSnapshotTimestamp("db-2026-03-23T14-30-45.sqlite.gz")
        expect(date).toEqual(new Date("2026-03-23T14:30:45Z"))
    })

    test("parses .sqlite filename", () => {
        const date = parseSnapshotTimestamp("db-2026-01-01T00-00-00.sqlite")
        expect(date).toEqual(new Date("2026-01-01T00:00:00Z"))
    })

    test("parses prefixed filename", () => {
        const date = parseSnapshotTimestamp("hourly-db-2026-03-23T14-30-45.sqlite.gz")
        expect(date).toEqual(new Date("2026-03-23T14:30:45Z"))
        const date2 = parseSnapshotTimestamp("monthly-db-2026-01-01T00-00-00.sqlite.gz")
        expect(date2).toEqual(new Date("2026-01-01T00:00:00Z"))
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
        expect(toDelete).toContain("db-2024-03-10T12-00-00.sqlite.gz")
    })

    test("deletes snapshots that fit no tier", () => {
        const snapshots = Array.from({ length: 100 }, (_, i) => snapsAt(daysAgo(now, i)))
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete.length).toBeGreaterThan(0)
        expect(toDelete).not.toContain(snapsAt(daysAgo(now, 0)))
        expect(toDelete).not.toContain(snapsAt(daysAgo(now, 1)))
    })

    test("future snapshots are kept", () => {
        const snapshots = [
            snapsAt(new Date("2026-06-16T12:00:00Z")),
            snapsAt(hoursAgo(now, 1)),
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual([])
    })

    test("handles prefixed filenames", () => {
        const snapshots = [
            "hourly-db-2026-06-15T11-00-00.sqlite.gz",
            "hourly-db-2026-06-15T10-00-00.sqlite.gz",
        ]
        const toDelete = selectSnapshotsToDelete(snapshots, now)
        expect(toDelete).toEqual([])
    })
})

describe("classifySnapshots", () => {
    const now = new Date("2026-06-15T12:00:00Z")

    test("snapshot stays hourly when a newer one fills higher tiers", () => {
        const newer = snapsAt(hoursAgo(now, 1))
        const older = snapsAt(hoursAgo(now, 5))
        const { tiers } = classifySnapshots([newer, older], now)
        // newer fills daily/weekly/monthly bucket 0, older stays hourly
        expect(tiers.get(older)).toBe("hourly")
    })

    test("snapshot promoted to daily when in daily range", () => {
        const name = snapsAt(daysAgo(now, 3))
        const { tiers } = classifySnapshots([snapsAt(hoursAgo(now, 1)), name], now)
        expect(tiers.get(name)).toBe("daily")
    })

    test("snapshot promoted to weekly", () => {
        const name = snapsAt(daysAgo(now, 14))
        const { tiers } = classifySnapshots([snapsAt(hoursAgo(now, 1)), name], now)
        expect(tiers.get(name)).toBe("weekly")
    })

    test("snapshot promoted to monthly", () => {
        const name = snapsAt(new Date("2026-03-15T12:00:00Z"))
        const { tiers } = classifySnapshots([snapsAt(hoursAgo(now, 1)), name], now)
        expect(tiers.get(name)).toBe("monthly")
    })

    test("snapshot promoted to yearly", () => {
        const name = snapsAt(new Date("2025-06-15T12:00:00Z"))
        const { tiers } = classifySnapshots([snapsAt(hoursAgo(now, 1)), name], now)
        expect(tiers.get(name)).toBe("yearly")
    })

    test("single recent snapshot promoted to monthly (highest applicable tier)", () => {
        const name = snapsAt(now)
        const { tiers } = classifySnapshots([name], now)
        // fills bucket 0 for hourly, daily, weekly, monthly — last write wins
        expect(tiers.get(name)).toBe("monthly")
    })
})
