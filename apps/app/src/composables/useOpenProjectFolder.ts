import { computed } from "vue"
import { useProjectFolder } from "@/composables/api/useProject"
import { useTauri } from "@/composables/useTauri"
import { useAppSettingsStore } from "@/stores/appSettings"

export function useOpenProjectFolder() {
    const { get: fetchProjectFolder, data: projectFolder } = useProjectFolder()
    const { isTauri, openFolder } = useTauri()
    const appSettingsStore = useAppSettingsStore()

    const canOpen = computed(() => isTauri.value && projectFolder.value?.found)

    const absolutePath = computed(() =>
        projectFolder.value?.folder?.fullPath
            ? appSettingsStore.getAbsolutePath(projectFolder.value.folder.fullPath)
            : undefined
    )

    const open = async (e?: Event) => {
        if (!projectFolder.value?.folder?.fullPath || !isTauri.value) return
        e?.preventDefault()
        await openFolder(appSettingsStore.getAbsolutePath(projectFolder.value.folder.fullPath))
    }

    return {
        fetchProjectFolder,
        projectFolder,
        canOpen,
        absolutePath,
        openProjectFolder: open,
    }
}
