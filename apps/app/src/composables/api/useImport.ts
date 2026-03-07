import { useGet, usePost } from "./useAPI"

export interface ImportStatus {
    available: boolean
    mdbPath: string | null
    mdbExists: boolean
    mdbToolsAvailable: boolean
}

export interface ImportResult {
    success: boolean
    message: string
    mdbPath: string
    tempDir: string
}

export function useImportStatus() {
    return useGet<ImportStatus>("import/status")
}

export function useRunImport() {
    return usePost<ImportResult>("import")
}
