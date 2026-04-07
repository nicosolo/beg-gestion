import { mkdir, readdir, rename, unlink, readFile, writeFile } from "node:fs/promises"
import { join, dirname, basename } from "node:path"
import { gzipSync } from "node:zlib"
import { DB_FILE_PATH } from "@src/config"
import { sqlite } from "@src/db"
import { audit } from "@src/tools/audit"

const SNAPSHOT_DIR = join(dirname(DB_FILE_PATH), "snapshots")

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

const TIER_PREFIXES = ["hourly-", "daily-", "weekly-", "monthly-", "yearly-"] as const
export type SnapshotTier = "hourly" | "daily" | "weekly" | "monthly" | "yearly"

function formatTimestamp(): string {
    const now = new Date()
    return now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

async function ensureSnapshotDir(): Promise<void> {
    await mkdir(SNAPSHOT_DIR, { recursive: true })
}

export function stripTierPrefix(filename: string): string {
    for (const prefix of TIER_PREFIXES) {
        if (filename.startsWith(prefix)) return filename.slice(prefix.length)
    }
    return filename
}

export function parseSnapshotTimestamp(filename: string): Date | null {
    const base = stripTierPrefix(filename)
    const match = base.match(/^db-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.sqlite/)
    if (!match) return null
    const date = new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`)
    return isNaN(date.getTime()) ? null : date
}

export function classifySnapshots(
    filenames: string[],
    now: Date
): { toDelete: string[]; tiers: Map<string, SnapshotTier> } {
    const snapshots = filenames
        .map((name) => ({ name, timestamp: parseSnapshotTimestamp(name) }))
        .filter((s): s is { name: string; timestamp: Date } => s.timestamp !== null)

    const sorted = [...snapshots].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const tiers = new Map<string, SnapshotTier>()
    const nowMs = now.getTime()

    // Process highest tier first so lower tiers overwrite — the prefix
    // reflects the *lowest* tier keeping a snapshot (hourly wins over daily, etc.)

    // Yearly: keep one per calendar year, no limit
    const yearlyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket = now.getUTCFullYear() - s.timestamp.getUTCFullYear()
        if (bucket >= 1 && !yearlyFilled.has(bucket)) {
            yearlyFilled.add(bucket)
            tiers.set(s.name, "yearly")
        }
    }

    // Monthly: 12 buckets (0-11)
    const monthlyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket =
            (now.getUTCFullYear() - s.timestamp.getUTCFullYear()) * 12 +
            (now.getUTCMonth() - s.timestamp.getUTCMonth())
        if (bucket >= 0 && bucket <= 11 && !monthlyFilled.has(bucket)) {
            monthlyFilled.add(bucket)
            tiers.set(s.name, "monthly")
        }
    }

    // Weekly: 8 buckets (0-7)
    const weeklyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket = Math.floor(Math.max(0, nowMs - s.timestamp.getTime()) / WEEK_MS)
        if (bucket <= 7 && !weeklyFilled.has(bucket)) {
            weeklyFilled.add(bucket)
            tiers.set(s.name, "weekly")
        }
    }

    // Daily: 14 buckets by calendar day (0-13), picks latest snapshot per day
    const nowDay = Math.floor(nowMs / DAY_MS)
    const dailyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket = nowDay - Math.floor(s.timestamp.getTime() / DAY_MS)
        if (bucket >= 0 && bucket <= 13 && !dailyFilled.has(bucket)) {
            dailyFilled.add(bucket)
            tiers.set(s.name, "daily")
        }
    }

    // Hourly: 48 buckets (0-47)
    const hourlyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket = Math.floor(Math.max(0, nowMs - s.timestamp.getTime()) / HOUR_MS)
        if (bucket <= 47 && !hourlyFilled.has(bucket)) {
            hourlyFilled.add(bucket)
            tiers.set(s.name, "hourly")
        }
    }

    const toDelete = sorted.filter((s) => !tiers.has(s.name)).map((s) => s.name)
    return { toDelete, tiers }
}

export function selectSnapshotsToDelete(filenames: string[], now: Date): string[] {
    return classifySnapshots(filenames, now).toDelete
}

async function cleanOldSnapshots(): Promise<void> {
    const files = await readdir(SNAPSHOT_DIR)
    const snapshotFiles = files.filter((f) => f.endsWith(".sqlite.gz") || f.endsWith(".sqlite"))

    const { toDelete, tiers } = classifySnapshots(snapshotFiles, new Date())

    for (const name of toDelete) {
        await unlink(join(SNAPSHOT_DIR, name))
        console.log(`🗑️ Removed old snapshot: ${name}`)
        audit(null, "SYS", "prune", "snapshot", null, { file: name })
    }

    // Rename files to match their tier prefix
    for (const [name, tier] of tiers) {
        const base = stripTierPrefix(name)
        const expected = `${tier}-${base}`
        if (name !== expected) {
            await rename(join(SNAPSHOT_DIR, name), join(SNAPSHOT_DIR, expected))
            console.log(`📁 ${name} → ${expected}`)
        }
    }
}

export async function createSnapshot(): Promise<string> {
    await ensureSnapshotDir()

    const timestamp = formatTimestamp()
    const tempPath = join(SNAPSHOT_DIR, `db-${timestamp}.sqlite`)
    const snapshotPath = join(SNAPSHOT_DIR, `hourly-db-${timestamp}.sqlite.gz`)

    // VACUUM INTO creates a consistent copy safe for live DBs
    sqlite.exec(`VACUUM INTO '${tempPath}'`)
    const dbBuffer = await readFile(tempPath)
    const compressed = gzipSync(dbBuffer)
    await writeFile(snapshotPath, compressed)
    await unlink(tempPath)
    console.log(`📸 Database snapshot created: ${snapshotPath}`)
    audit(null, "SYS", "create", "snapshot", null, { file: basename(snapshotPath) })

    await cleanOldSnapshots()

    return snapshotPath
}

let intervalId: Timer | null = null

export function startHourlySnapshots(): void {
    // Create initial snapshot
    createSnapshot().catch((err) => console.error("Failed to create initial snapshot:", err))

    // Schedule hourly snapshots
    const ONE_HOUR = 60 * 60 * 1000
    intervalId = setInterval(() => {
        createSnapshot().catch((err) => console.error("Failed to create snapshot:", err))
    }, ONE_HOUR)

    console.log("⏰ Hourly database snapshots enabled")
}

export function stopHourlySnapshots(): void {
    if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
        console.log("⏰ Hourly database snapshots disabled")
    }
}
