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

// Roots to search when resolving a project folder. All three roots share the
// same "range folder / project folder" layout as /mandats. Keys align with the
// frontend folder shortcut keys in apps/app/src/stores/appSettings.ts.
export const PROJECT_ROOTS = [
    { key: "mandats", path: "/mandats", label: "Mandats" },
    { key: "photographies", path: "/photographies", label: "Photographies" },
    { key: "sigMandats", path: "/sig-mandats", label: "SIG Mandats" },
] as const

export type ProjectRootKey = (typeof PROJECT_ROOTS)[number]["key"]

export const FILE_STORAGE = "/app/files"
