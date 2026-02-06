import { mkdir, readdir, unlink, stat, readFile, writeFile } from "node:fs/promises"
import { join, dirname } from "node:path"
import { gzipSync } from "node:zlib"
import { DB_FILE_PATH } from "@src/config"
import { sqlite } from "@src/db"

const SNAPSHOT_DIR = join(dirname(DB_FILE_PATH), "snapshots")
const MAX_SNAPSHOTS = 48 // Keep 48 hours of snapshots

function formatTimestamp(): string {
    const now = new Date()
    return now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

async function ensureSnapshotDir(): Promise<void> {
    await mkdir(SNAPSHOT_DIR, { recursive: true })
}

async function cleanOldSnapshots(): Promise<void> {
    const files = await readdir(SNAPSHOT_DIR)
    const snapshots = files.filter((f) => f.endsWith(".sqlite.gz") || f.endsWith(".sqlite"))

    if (snapshots.length <= MAX_SNAPSHOTS) return

    // Get file stats and sort by mtime
    const withStats = await Promise.all(
        snapshots.map(async (name) => {
            const path = join(SNAPSHOT_DIR, name)
            const stats = await stat(path)
            return { name, path, mtime: stats.mtime }
        })
    )

    withStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())

    // Remove oldest files
    const toDelete = withStats.slice(0, withStats.length - MAX_SNAPSHOTS)
    for (const file of toDelete) {
        await unlink(file.path)
        console.log(`🗑️ Removed old snapshot: ${file.name}`)
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
