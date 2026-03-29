#!/usr/bin/env bun
// Remove when Production
/**
 * Standalone script to import MS Access database
 * Usage: bun run src/scripts/import-mdb.ts [mdb-file-path]
 * Or use MS_ACCESS_DB_PATH environment variable
 */

import { exportMdbToJson } from "@src/tools/mdb-export"
import { runImport } from "@src/db/import"
import { existsSync } from "fs"
import { rm } from "fs/promises"
import path from "path"
import { MS_ACCESS_DB_PATH } from "@src/config"
import { rebuildAllProjectSearchIndex } from "@src/db/fts"

export async function importMdbToSqlite() {
    try {
        // console.log("Import is disabled")
        // return
        // Get MDB path from command line argument or environment variable
        const mdbPath = MS_ACCESS_DB_PATH

        if (!mdbPath) {
            console.error("Error: No MDB file path provided")
            console.error("Usage: bun run src/scripts/import-mdb.ts [mdb-file-path]")
            console.error("Or set MS_ACCESS_DB_PATH environment variable")
            process.exit(1)
        }

        // Check if MDB file exists
        if (!existsSync(mdbPath)) {
            console.error(`Error: MDB file not found at path: ${mdbPath}`)
            process.exit(1)
        }

        // Use /tmp directory for temporary JSON files
        const tempExportDir = path.join("/tmp", `mdb-export-${Date.now()}`)

        console.log("=".repeat(60))
        console.log("MS Access Database Import")
        console.log("=".repeat(60))
        console.log(`MDB file: ${mdbPath}`)
        console.log(`Temp directory: ${tempExportDir}`)
        console.log("")

        // Step 1: Export MDB to JSON files
        console.log("📦 Step 1: Exporting MDB to JSON...")
        console.log("-".repeat(40))
        await exportMdbToJson(mdbPath, tempExportDir)
        console.log("")

        // Step 2: Import JSON files to database
        console.log("💾 Step 2: Importing JSON to database...")
        console.log("-".repeat(40))
        await runImport(tempExportDir)
        console.log("")

        // Step 3: Clean up temporary files
        console.log("🧹 Step 3: Cleaning up temporary files...")
        await rm(tempExportDir, { recursive: true, force: true })
        console.log(`✓ Removed temporary directory: ${tempExportDir}`)
        console.log("")

        // Step 4: Rebuild FTS index
        console.log("🔄 Step 4: Rebuilding FTS index...")
        console.log("-".repeat(40))
        await rebuildAllProjectSearchIndex()
        console.log("")

        console.log("=".repeat(60))
        console.log("✅ Import completed successfully!")
        console.log("=".repeat(60))
        return tempExportDir
    } catch (error) {
        console.error("")
        console.error("=".repeat(60))
        console.error("❌ Import failed!")
        console.error("=".repeat(60))
        console.error(error)
        process.exit(1)
    }
}

// Run the import
if (import.meta.main) {
    importMdbToSqlite()
}
