// Database configuration

// SQLite configuration
export const DB_FILE_PATH = process.env.DB_FILE_PATH || "/app/data/db.sqlite"

// Server configuration
export const PORT = Number(process.env.PORT || 3000)

// JWT configuration
export const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-should-be-in-env"

export const MS_ACCESS_DB_PATH = "/export-mdb/beg.mdb"

// Project folder configuration
export const PROJECT_BASE_DIR = "/mandats"

export const FILE_STORAGE = "/app/files"
