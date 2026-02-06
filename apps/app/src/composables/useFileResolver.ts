export type ResolvedFile = { relativePath: string; file: File }

/**
 * Resolve an absolute file path: always read the file bytes for upload.
 * The server stores files in FILE_STORAGE, so we always send the actual file.
 */
export async function resolveFilePath(filePath: string): Promise<ResolvedFile> {
    const { readFile } = await import("@tauri-apps/plugin-fs")
    const contents = await readFile(filePath)
    const fileName = filePath.split(/[/\\]/).pop() || "file"
    const file = new File([contents], fileName)
    return { relativePath: fileName, file }
}
