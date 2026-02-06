import path from "node:path"
import { mkdir, copyFile, unlink, stat } from "node:fs/promises"
import { createReadStream } from "node:fs"
import { Readable } from "node:stream"
import { FILE_STORAGE, PROJECT_BASE_DIR } from "@src/config"
import {
    guessMimeType,
    contentDispositionInline,
    normalizeStoredPath,
    fileBaseName,
} from "@src/tools/file-utils"

const sanitizeFileName = (filename: string) => {
    const base = path.basename(filename)
    const sanitized = base.replace(/[\\/:*?"<>|]/g, "_").trim()
    return sanitized.length > 0 ? sanitized : `document-${Date.now()}`
}

/**
 * Store an uploaded File to disk, return DB path.
 * Storage: FILE_STORAGE/{entityType}/{folderId}/{originalName}
 * DB path: files/{entityType}/{folderId}/{originalName}
 */
export async function storeFile(
    file: File,
    entityType: "invoice",
    folderId: string
): Promise<string> {
    const fileName = sanitizeFileName(file.name)
    const dirPath = path.join(FILE_STORAGE, entityType, folderId)
    const filePath = path.join(dirPath, fileName)

    await mkdir(dirPath, { recursive: true })
    const buffer = await file.arrayBuffer()
    await Bun.write(filePath, buffer)

    return `files/${entityType}/${folderId}/${fileName}`
}

/**
 * Copy an existing file from disk to FILE_STORAGE, return DB path.
 */
export async function storeFileFromPath(
    sourcePath: string,
    entityType: "invoice",
    folderId: string
): Promise<string | null> {
    try {
        await stat(sourcePath)
    } catch {
        console.warn(`File not found, skipping: ${sourcePath}`)
        return null
    }

    const fileName = sanitizeFileName(path.basename(sourcePath))
    const dirPath = path.join(FILE_STORAGE, entityType, folderId)
    const filePath = path.join(dirPath, fileName)

    await mkdir(dirPath, { recursive: true })
    await copyFile(sourcePath, filePath)

    return `files/${entityType}/${folderId}/${fileName}`
}

/**
 * Delete file on disk from its DB path.
 */
export async function deleteFile(dbPath: string): Promise<void> {
    const resolved = resolveFilePath(dbPath)
    if (!resolved) return
    try {
        await unlink(resolved)
    } catch {
        // ignore if already deleted
    }
}

/**
 * Resolve DB path → absolute path on disk.
 * - "files/..." → FILE_STORAGE + rest
 * - "/mandats/..." → absolute path as-is
 * - relative → PROJECT_BASE_DIR + path
 */
export function resolveFilePath(dbPath: string): string | null {
    const normalized = normalizeStoredPath(dbPath)
    if (!normalized) return null

    if (normalized.startsWith("files/")) {
        return path.join(FILE_STORAGE, normalized.slice("files/".length))
    }

    if (path.isAbsolute(normalized)) {
        return normalized
    }

    return path.join(PROJECT_BASE_DIR, normalized)
}

/**
 * Stream file as HTTP response.
 */
export async function serveFile(dbPath: string, displayName?: string): Promise<Response> {
    const absolutePath = resolveFilePath(dbPath)
    if (!absolutePath) {
        return new Response("File not found", { status: 404 })
    }

    let fileStats: Awaited<ReturnType<typeof stat>>
    try {
        fileStats = await stat(absolutePath)
        if (!fileStats.isFile()) {
            return new Response("File not found", { status: 404 })
        }
    } catch {
        return new Response("File not found", { status: 404 })
    }

    const fileName = displayName || fileBaseName(dbPath)
    const nodeStream = createReadStream(absolutePath)
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream

    const headers = new Headers({
        "Content-Type": guessMimeType(fileName),
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": contentDispositionInline(fileName),
    })

    return new Response(webStream, { headers })
}
