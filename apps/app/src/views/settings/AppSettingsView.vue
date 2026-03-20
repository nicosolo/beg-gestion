<template>
    <div class="container mx-auto px-6 py-8 max-w-4xl">
        <div class="flex items-center gap-4 mb-8">
            <IconSettings class="h-6 w-6 text-gray-600" />
            <h1 class="text-2xl font-semibold">{{ $t("appSettings.title") }}</h1>
        </div>

        <Card>
            <div class="space-y-6">
                <!-- Base Path Configuration -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        {{ $t("appSettings.basePath.label") }}
                    </label>
                    <p class="text-sm text-gray-600 mb-3">
                        {{ $t("appSettings.basePath.description") }}
                    </p>
                    <div class="flex gap-2">
                        <div class="flex-1 relative">
                            <input
                                v-model="basePath"
                                @input="onPathInput"
                                @focus="onPathFocus"
                                @blur="onPathBlur"
                                @keydown="onPathKeyDown"
                                type="text"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                :placeholder="$t('appSettings.basePath.placeholder')"
                            />

                            <!-- Directory suggestions dropdown -->
                            <div
                                v-if="
                                    showDirectorySuggestions &&
                                        (directoryItems.length > 0 || isLoadingDirectories)
                                "
                                class="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                            >
                                <!-- Loading state -->
                                <div v-if="isLoadingDirectories" class="px-3 py-2 text-gray-500">
                                    <div class="flex items-center">
                                        <Spinner class="h-4 w-4 mr-2 animate-spin" />
                                        {{ $t("common.loading") }}
                                    </div>
                                </div>

                                <!-- Directory items -->
                                <button
                                    v-for="(item, index) in directoryItems"
                                    :key="item.path"
                                    @mousedown.prevent="selectDirectory(item.path)"
                                    @mouseenter="focusedSuggestionIndex = index"
                                    :class="[
                                        'w-full px-3 py-2 text-left hover:bg-gray-100 focus:outline-none',
                                        focusedSuggestionIndex === index ? 'bg-gray-100' : '',
                                    ]"
                                >
                                    <div class="flex items-center">
                                        <IconFolder class="h-4 w-4 mr-2 text-gray-400" />
                                        <span class="text-sm">{{ item.path }}</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <Button
                            @click="testPath"
                            :disabled="isTestingPath"
                            variant="secondary"
                            class="whitespace-nowrap"
                        >
                            <IconFolder v-if="!isTestingPath" class="h-4 w-4 mr-2" />
                            <Spinner v-else class="h-4 w-4 mr-2 animate-spin" />
                            {{ $t("appSettings.basePath.test") }}
                        </Button>
                    </div>

                    <!-- Test Result Message -->
                    <div v-if="testResult" class="mt-2">
                        <div
                            :class="[
                                'px-3 py-2 rounded-md text-sm',
                                testResult.success
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200',
                            ]"
                        >
                            {{ testResult.message }}
                        </div>
                    </div>

                    <!-- Default Path Info -->
                    <div class="mt-3 text-sm text-gray-500">
                        {{ $t("appSettings.basePath.default") }}: {{ defaultBasePath }}
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex justify-between pt-4 border-t border-gray-200">
                    <Button @click="resetToDefault" variant="secondary">
                        {{ $t("appSettings.resetToDefault") }}
                    </Button>
                    <div class="flex gap-2">
                        <Button @click="cancel" variant="secondary">
                            {{ $t("common.cancel") }}
                        </Button>
                        <Button @click="save" variant="primary">
                            <IconCheck class="h-4 w-4 mr-2" />
                            {{ $t("common.save") }}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import Card from "@/components/atoms/Card.vue"
import { useI18n } from "vue-i18n"
import { useAppSettingsStore } from "@/stores/appSettings"
import { useTauri } from "@/composables/useTauri"
import { useAlert } from "@/composables/utils/useAlert"
import { invoke } from "@tauri-apps/api/core"
import Button from "@/components/atoms/Button.vue"
import {
    Cog6ToothIcon as IconSettings,
    FolderIcon as IconFolder,
    CheckIcon as IconCheck,
} from "@heroicons/vue/24/outline"
import { ArrowPathIcon as Spinner } from "@heroicons/vue/24/solid"

const router = useRouter()
const { t } = useI18n()
const appSettingsStore = useAppSettingsStore()
const { isTauri } = useTauri()
const { successAlert } = useAlert()

// Redirect if not in Tauri environment
onMounted(() => {
    if (!isTauri.value) {
        router.push("/")
    }
})

// Local state
const basePath = ref(appSettingsStore.basePath)
const defaultBasePath = appSettingsStore.defaultBasePath
const isTestingPath = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)
const directoryItems = ref<{ path: string }[]>([])
const isLoadingDirectories = ref(false)
const showDirectorySuggestions = ref(false)
const focusedSuggestionIndex = ref(0)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Clear test result when path changes
watch(basePath, () => {
    testResult.value = null
})

// Fetch directories for autocomplete
const fetchDirectories = async (searchPath: string) => {
    isLoadingDirectories.value = true
    try {
        // Get parent directory from search path for listing
        let pathToList = searchPath

        // If typing a new segment, list parent directory
        if (searchPath && !searchPath.endsWith("/") && !searchPath.endsWith("\\")) {
            const lastSlash = Math.max(searchPath.lastIndexOf("/"), searchPath.lastIndexOf("\\"))
            if (lastSlash > 0) {
                pathToList = searchPath.substring(0, lastSlash + 1)
            }
        }

        const directories = await invoke<string[]>("list_directories", {
            path: pathToList,
        })

        // Filter directories based on search if typing beyond parent path
        const search = searchPath.toLowerCase()
        const filtered = directories.filter(
            (dir) => dir.toLowerCase().includes(search) || search.includes(dir.toLowerCase())
        )

        directoryItems.value = filtered.map((path) => ({ path }))
    } catch (error) {
        console.error("Failed to fetch directories:", error)
        directoryItems.value = []
    } finally {
        isLoadingDirectories.value = false
    }
}

// Handle input field input event
const onPathInput = () => {
    showDirectorySuggestions.value = true
    focusedSuggestionIndex.value = 0

    // Clear previous debounce timer
    if (debounceTimer) {
        clearTimeout(debounceTimer)
    }

    // Debounce the directory fetch
    debounceTimer = setTimeout(() => {
        fetchDirectories(basePath.value)
    }, 300)
}

// Handle input field focus
const onPathFocus = () => {
    showDirectorySuggestions.value = true
    if (!directoryItems.value.length) {
        fetchDirectories(basePath.value || "")
    }
}

// Handle input field blur
const onPathBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
        showDirectorySuggestions.value = false
    }, 200)
}

// Handle keyboard navigation
const onPathKeyDown = (event: KeyboardEvent) => {
    if (!showDirectorySuggestions.value || !directoryItems.value.length) return

    switch (event.key) {
        case "ArrowDown":
            event.preventDefault()
            focusedSuggestionIndex.value = Math.min(
                focusedSuggestionIndex.value + 1,
                directoryItems.value.length - 1
            )
            break
        case "ArrowUp":
            event.preventDefault()
            focusedSuggestionIndex.value = Math.max(focusedSuggestionIndex.value - 1, 0)
            break
        case "Enter":
            event.preventDefault()
            if (directoryItems.value[focusedSuggestionIndex.value]) {
                selectDirectory(directoryItems.value[focusedSuggestionIndex.value].path)
            }
            break
        case "Escape":
            event.preventDefault()
            showDirectorySuggestions.value = false
            break
    }
}

// Select a directory from the dropdown
const selectDirectory = (path: string) => {
    basePath.value = path
    showDirectorySuggestions.value = false
    focusedSuggestionIndex.value = 0
}

// Test if the path exists
const testPath = async () => {
    if (!basePath.value.trim()) {
        testResult.value = {
            success: false,
            message: t("appSettings.basePath.errors.empty"),
        }
        return
    }

    isTestingPath.value = true
    testResult.value = null

    try {
        const path = basePath.value.trim()

        // Basic path format validation first
        if (!path || path.length < 3) {
            testResult.value = {
                success: false,
                message: t("appSettings.basePath.errors.invalid"),
            }
            return
        }

        // On Windows, check for drive letter format
        if (path.includes("\\") && !path.match(/^[A-Za-z]:\\/)) {
            testResult.value = {
                success: false,
                message: t("appSettings.basePath.errors.invalidWindows"),
            }
            return
        }

        // Check if the path actually exists using Tauri command
        const pathExists = await invoke<boolean>("check_path_exists", {
            path: path,
        })

        if (pathExists) {
            testResult.value = {
                success: true,
                message: t("appSettings.basePath.success"),
            }
        } else {
            testResult.value = {
                success: false,
                message: t("appSettings.basePath.errors.pathNotFound"),
            }
        }
    } catch (error) {
        console.error("Failed to check path:", error)
        testResult.value = {
            success: false,
            message: t("appSettings.basePath.errors.testFailed"),
        }
    } finally {
        isTestingPath.value = false
    }
}

// Save settings
const save = () => {
    if (basePath.value.trim()) {
        appSettingsStore.setBasePath(basePath.value.trim())
        successAlert(t("common.save"))
        router.push("/")
    }
}

// Reset to default
const resetToDefault = () => {
    basePath.value = defaultBasePath
    testResult.value = null
}

// Cancel and go back
const cancel = () => {
    router.push("/")
}
</script>
