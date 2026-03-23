import { mkdir, readdir, unlink, readFile, writeFile } from "node:fs/promises"
import { join, dirname, basename } from "node:path"
import { gzipSync } from "node:zlib"
import { DB_FILE_PATH } from "@src/config"
import { sqlite } from "@src/db"
import { audit } from "@src/tools/audit"

const SNAPSHOT_DIR = join(dirname(DB_FILE_PATH), "snapshots")

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

function formatTimestamp(): string {
    const now = new Date()
    return now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

async function ensureSnapshotDir(): Promise<void> {
    await mkdir(SNAPSHOT_DIR, { recursive: true })
}

export function parseSnapshotTimestamp(filename: string): Date | null {
    const match = filename.match(/^db-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})\.sqlite/)
    if (!match) return null
    const date = new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`)
    return isNaN(date.getTime()) ? null : date
}

export function selectSnapshotsToDelete(
    snapshots: { name: string; timestamp: Date }[],
    now: Date
): string[] {
    const sorted = [...snapshots].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const keepSet = new Set<string>()
    const nowMs = now.getTime()

    // Hourly: 48 buckets (0-47)
    const hourlyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket = Math.floor(Math.max(0, nowMs - s.timestamp.getTime()) / HOUR_MS)
        if (bucket <= 47 && !hourlyFilled.has(bucket)) {
            hourlyFilled.add(bucket)
            keepSet.add(s.name)
        }
    }

    // Daily: 7 buckets (0-6)
    const dailyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket = Math.floor(Math.max(0, nowMs - s.timestamp.getTime()) / DAY_MS)
        if (bucket <= 6 && !dailyFilled.has(bucket)) {
            dailyFilled.add(bucket)
            keepSet.add(s.name)
        }
    }

    // Weekly: 8 buckets (0-7)
    const weeklyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket = Math.floor(Math.max(0, nowMs - s.timestamp.getTime()) / WEEK_MS)
        if (bucket <= 7 && !weeklyFilled.has(bucket)) {
            weeklyFilled.add(bucket)
            keepSet.add(s.name)
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
            keepSet.add(s.name)
        }
    }

    // Yearly: keep one per calendar year, no limit
    const yearlyFilled = new Set<number>()
    for (const s of sorted) {
        const bucket = now.getUTCFullYear() - s.timestamp.getUTCFullYear()
        if (bucket >= 1 && !yearlyFilled.has(bucket)) {
            yearlyFilled.add(bucket)
            keepSet.add(s.name)
        }
    }

    return sorted.filter((s) => !keepSet.has(s.name)).map((s) => s.name)
}

async function cleanOldSnapshots(): Promise<void> {
    const files = await readdir(SNAPSHOT_DIR)
    const snapshotFiles = files.filter((f) => f.endsWith(".sqlite.gz") || f.endsWith(".sqlite"))

    const snapshots: { name: string; timestamp: Date }[] = []
    for (const name of snapshotFiles) {
        const timestamp = parseSnapshotTimestamp(name)
        if (timestamp) {
            snapshots.push({ name, timestamp })
        } else {
            console.warn(`⚠️ Skipping unparseable snapshot filename: ${name}`)
        }
    }

    const toDelete = selectSnapshotsToDelete(snapshots, new Date())
    for (const name of toDelete) {
        await unlink(join(SNAPSHOT_DIR, name))
        console.log(`🗑️ Removed old snapshot: ${name}`)
        audit(null, "SYS", "prune", "snapshot", null, { file: name })
    }
}

export async function createSnapshot(): Promise<string> {
    await ensureSnapshotDir()

    const timestamp = formatTimestamp()
    const tempPath = join(SNAPSHOT_DIR, `db-${timestamp}.sqlite`)
    const snapshotPath = `${tempPath}.gz`

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
