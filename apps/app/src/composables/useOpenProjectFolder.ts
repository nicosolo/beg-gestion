import { computed } from "vue"
import { useProjectFolder, type ProjectFolderMatch } from "@/composables/api/useProject"
import { useTauri } from "@/composables/useTauri"
import { useAppSettingsStore, type FolderShortcutKey } from "@/stores/appSettings"

export interface OpenFolderEntry {
    source: FolderShortcutKey
    sourceLabel: string
    folderName: string
    absolutePath: string
}

export function useOpenProjectFolder() {
    const { get: fetchProjectFolder, data: projectFolder } = useProjectFolder({ silent: true })
    const { isTauri, openFolder } = useTauri()
    const appSettingsStore = useAppSettingsStore()

    const entries = computed<OpenFolderEntry[]>(() => {
        const matches = projectFolder.value?.matches ?? []
        return matches.map((m: ProjectFolderMatch) => ({
            source: m.source as FolderShortcutKey,
            sourceLabel: m.sourceLabel,
            folderName: m.folderName,
            absolutePath: appSettingsStore.getShortcutAbsolutePath(
                m.source as FolderShortcutKey,
                m.fullPath
            ),
        }))
    })

    const canOpen = computed(() => isTauri.value && entries.value.length > 0)

    // Primary path for document upload defaults: prefer the Mandats match.
    const primaryPath = computed(() => {
        const mandats = entries.value.find((e) => e.source === "mandats")
        return (mandats ?? entries.value[0])?.absolutePath
    })

    const safeFetchProjectFolder = async (...args: Parameters<typeof fetchProjectFolder>) => {
        try {
            return await fetchProjectFolder(...args)
        } catch {
            // fail silently — folder lookup is non-critical
        }
    }

    const openEntry = async (entry: OpenFolderEntry, e?: Event) => {
        if (!isTauri.value) return
        e?.preventDefault()
        await openFolder(entry.absolutePath)
    }

    return {
        fetchProjectFolder: safeFetchProjectFolder,
        projectFolder,
        entries,
        canOpen,
        primaryPath,
        openEntry,
    }
}
