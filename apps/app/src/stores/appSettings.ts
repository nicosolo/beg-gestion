import { defineStore } from "pinia"
import { ref, computed, watch } from "vue"
import { useTauri } from "@/composables/useTauri"

const STORAGE_KEY = "app-settings"
const DEFAULT_BASE_PATH = "N:\\Mandats"

export const useAppSettingsStore = defineStore("appSettings", () => {
    const { isTauri } = useTauri()

    // State
    const basePath = ref<string>(DEFAULT_BASE_PATH)

    // Load settings from localStorage on initialization
    const loadSettings = () => {
        if (!isTauri.value) return

        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const settings = JSON.parse(stored)
                if (settings.basePath) {
                    basePath.value = settings.basePath
                }
            }
        } catch (error) {
            console.error("Failed to load app settings:", error)
        }
    }

    // Save settings to localStorage
    const saveSettings = () => {
        if (!isTauri.value) return

        try {
            const settings = {
                basePath: basePath.value,
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
        } catch (error) {
            console.error("Failed to save app settings:", error)
        }
    }

    // Watch for changes and auto-save
    watch(basePath, () => {
        saveSettings()
    })

    // Actions
    const setBasePath = (path: string) => {
        basePath.value = path
    }

    const resetToDefault = () => {
        basePath.value = DEFAULT_BASE_PATH
    }

    // Helper to build absolute path from relative path
    const getAbsolutePath = (relativePath: string) => {
        // Remove leading slashes from relative path
        const cleanRelative = relativePath.replace(/^[\/\\]+/, "")

        // Combine paths with proper separator based on OS
        const separator = basePath.value.includes("\\") ? "\\" : "/"

        // Ensure base path doesn't end with separator
        const cleanBase = basePath.value.replace(/[\/\\]+$/, "")

        return `${cleanBase}${separator}${cleanRelative}`
    }

    // Initialize on store creation
    loadSettings()

    return {
        // State
        basePath: computed(() => basePath.value),
        defaultBasePath: DEFAULT_BASE_PATH,

        // Actions
        setBasePath,
        resetToDefault,
        getAbsolutePath,
    }
})
