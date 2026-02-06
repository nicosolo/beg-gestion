import { useTauri } from "@/composables/useTauri"

export type SaveDialogFilters = { name: string; extensions: string[] }[]

export function useFileDownload() {
    const { isTauri, openFile } = useTauri()

    /**
     * Open a blob directly (temp dir in Tauri, new tab in browser)
     */
    const openBlob = async (blob: Blob, fileName: string) => {
        if (isTauri.value) {
            const { writeFile } = await import("@tauri-apps/plugin-fs")
            const { tempDir } = await import("@tauri-apps/api/path")
            const tmpPath = `${await tempDir()}${fileName}`
            const buffer = await blob.arrayBuffer()
            await writeFile(tmpPath, new Uint8Array(buffer))
            await openFile(tmpPath)
            return
        }

        const objectUrl = URL.createObjectURL(blob)
        window.open(objectUrl, "_blank")
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }

    /**
     * Download a blob (save dialog in Tauri, browser download in web)
     */
    const downloadBlob = async (blob: Blob, fileName: string, filters?: SaveDialogFilters) => {
        if (isTauri.value) {
            const { save } = await import("@tauri-apps/plugin-dialog")
            const { writeFile } = await import("@tauri-apps/plugin-fs")
            const savePath = await save({ defaultPath: fileName, filters })
            if (!savePath) return
            const buffer = await blob.arrayBuffer()
            await writeFile(savePath, new Uint8Array(buffer))
            await openFile(savePath)
            return
        }

        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = objectUrl
        link.download = fileName
        link.click()
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }

    return { openBlob, downloadBlob }
}
