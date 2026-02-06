import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import * as schema from "./schema"
import { DB_FILE_PATH } from "@src/config"

// Create SQLite database connection with optimized settings for concurrent access
const sqlite = new Database(DB_FILE_PATH, {
    // Enable WAL mode for better concurrent access
    // WAL mode allows multiple readers and one writer simultaneously
    create: true,
    readwrite: true,
})

// Configure SQLite for better concurrent access and performance
sqlite.exec("PRAGMA journal_mode = WAL") // Enable WAL mode
sqlite.exec("PRAGMA synchronous = NORMAL") // Balanced safety/performance
sqlite.exec("PRAGMA cache_size = 1000") // Increase cache size
sqlite.exec("PRAGMA foreign_keys = ON") // Enable foreign key constraints
sqlite.exec("PRAGMA busy_timeout = 5000") // Wait up to 5 seconds for locks
sqlite.exec("PRAGMA temp_store = memory") // Store temporary tables in memory
sqlite.exec("PRAGMA mmap_size = 134217728") // Enable memory mapping (128MB)

export { sqlite }
export const db = drizzle(sqlite, { schema })
