import path from "node:path"

export const normalizeStoredPath = (value: string) => value.replace(/\\/g, "/").trim()

export const fileBaseName = (value: string) => {
    const normalized = normalizeStoredPath(value)
    const parts = normalized.split("/")
    return parts[parts.length - 1] || normalized
}

export const guessMimeType = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
        case "pdf":
            return "application/pdf"
        case "doc":
            return "application/msword"
        case "docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        case "xls":
            return "application/vnd.ms-excel"
        case "xlsx":
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        case "html":
        case "htm":
            return "text/html"
        case "txt":
            return "text/plain"
        case "png":
            return "image/png"
        case "jpg":
        case "jpeg":
            return "image/jpeg"
        case "gif":
            return "image/gif"
        default:
            return "application/octet-stream"
    }
}

export const contentDispositionInline = (fileName: string) => {
    // ASCII-only fallback for filename param (non-ASCII chars replaced)
    const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, '\\"')
    const encoded = encodeURIComponent(fileName)
    return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
}

export const matchesStoredPath = (stored: string | null | undefined, requested: string) => {
    if (!stored) return false
    const normalizedStored = normalizeStoredPath(stored)
    if (!normalizedStored) return false
    const normalizedRequested = normalizeStoredPath(requested)
    if (normalizedStored === normalizedRequested) return true
    const storedBase = fileBaseName(normalizedStored)
    const requestedBase = fileBaseName(normalizedRequested)
    return storedBase === requestedBase
}

export const pathIsWithin = (candidate: string, baseDir: string) => {
    const normalizedCandidate = path.normalize(candidate)
    const normalizedBase = path.normalize(baseDir)
    return normalizedCandidate === normalizedBase || normalizedCandidate.startsWith(`${normalizedBase}${path.sep}`)
}
