import { db } from "./index"
import { resolve } from "node:path"
import { existsSync } from "node:fs"
import { dirname } from "node:path"
import { mkdir } from "node:fs/promises"
import { DB_FILE_PATH } from "@src/config"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"

export async function runMigrations() {
    try {
        // Ensure the database directory exists
        const dbDir = dirname(DB_FILE_PATH)
        if (!existsSync(dbDir)) {
            await mkdir(dbDir, { recursive: true })
            console.log(`Created database directory: ${dbDir}`)
        }

        // Note: Foreign keys and other PRAGMA settings are now configured in db/index.ts
        // This ensures consistent settings across all database connections

        // Use drizzle-orm/migrator for applying migrations
        console.log("Running migrations using drizzle-orm migrator...")
        const migrationsFolder = resolve(import.meta.dir, "../../drizzle")
        console.log(migrationsFolder)

        // Apply the migrations
        try {
            await migrate(db, { migrationsFolder })
            console.log("Migrations applied successfully")
        } catch (migrateError) {
            console.error("Error applying migrations:", migrateError)
            throw migrateError
        }

        console.log("Database ready")
    } catch (error) {
        console.error("Migration error:", error)
        throw error
    }
}

// Run migrations if this file is executed directly
if (import.meta.path === Bun.main) {
    await runMigrations()
}
