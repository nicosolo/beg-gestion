import { computed } from "vue"
import { useProjectFolder } from "@/composables/api/useProject"
import { useTauri } from "@/composables/useTauri"
import { useAppSettingsStore } from "@/stores/appSettings"

export function useOpenProjectFolder() {
    const { get: fetchProjectFolder, data: projectFolder } = useProjectFolder({ silent: true })
    const { isTauri, openFolder } = useTauri()
    const appSettingsStore = useAppSettingsStore()

    const canOpen = computed(() => isTauri.value && projectFolder.value?.found)

    const absolutePath = computed(() =>
        projectFolder.value?.folder?.fullPath
            ? appSettingsStore.getAbsolutePath(projectFolder.value.folder.fullPath)
            : undefined
    )

    const safeFetchProjectFolder = async (...args: Parameters<typeof fetchProjectFolder>) => {
        try {
            return await fetchProjectFolder(...args)
        } catch {
            // fail silently — folder lookup is non-critical
        }
    }

    const open = async (e?: Event) => {
        if (!projectFolder.value?.folder?.fullPath || !isTauri.value) return
        e?.preventDefault()
        await openFolder(appSettingsStore.getAbsolutePath(projectFolder.value.folder.fullPath))
    }

    return {
        fetchProjectFolder: safeFetchProjectFolder,
        projectFolder,
        canOpen,
        absolutePath,
        openProjectFolder: open,
    }
}
