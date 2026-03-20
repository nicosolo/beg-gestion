<template>
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto">
            <h1 class="text-3xl font-bold mb-8">Database Import</h1>

            <!-- Status Card -->
            <Card class="mb-6">
                <h2 class="text-xl font-semibold mb-4">System Status</h2>

                <div v-if="statusLoading" class="text-gray-500">Loading...</div>

                <div v-else-if="statusError" class="text-red-600">Error: {{ statusError }}</div>

                <div v-else-if="status" class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="font-medium">Import Available:</span>
                        <span :class="status.available ? 'text-green-600' : 'text-red-600'">
                            {{ status.available ? "Yes" : "No" }}
                        </span>
                    </div>

                    <div v-if="status.mdbPath" class="flex flex-col">
                        <span class="font-medium mb-1">MDB File Path:</span>
                        <code class="bg-gray-100 p-2 rounded text-sm break-all">{{
                            status.mdbPath
                        }}</code>
                    </div>

                    <div class="flex items-center justify-between">
                        <span class="font-medium">File Exists:</span>
                        <span :class="status.mdbExists ? 'text-green-600' : 'text-red-600'">
                            {{ status.mdbExists ? "Yes" : "No" }}
                        </span>
                    </div>

                    <div class="flex items-center justify-between">
                        <span class="font-medium">MDB Tools:</span>
                        <span :class="status.mdbToolsAvailable ? 'text-green-600' : 'text-red-600'">
                            {{ status.mdbToolsAvailable ? "Installed" : "Not Installed" }}
                        </span>
                    </div>
                </div>
            </Card>

            <!-- Import Action Card -->
            <Card>
                <h2 class="text-xl font-semibold mb-4">Import Action</h2>

                <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <div class="flex">
                        <svg
                            class="h-5 w-5 text-yellow-400 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-yellow-800">Warning</h3>
                            <div class="mt-2 text-sm text-yellow-700">
                                <p>
                                    This action will replace all existing data in the database. Make
                                    sure you have a backup before continuing.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="importResult" class="mb-4">
                    <div
                        v-if="importResult.success"
                        class="bg-green-50 border border-green-200 rounded-md p-4"
                    >
                        <div class="flex">
                            <svg
                                class="h-5 w-5 text-green-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                            <div class="ml-3">
                                <p class="text-sm font-medium text-green-800">
                                    {{ importResult.message }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div v-else class="bg-red-50 border border-red-200 rounded-md p-4">
                        <div class="flex">
                            <svg
                                class="h-5 w-5 text-red-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                            <div class="ml-3">
                                <p class="text-sm font-medium text-red-800">
                                    {{ importError || "Import failed" }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="importProgress" class="mb-4">
                    <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div class="flex items-center">
                            <svg
                                class="animate-spin h-5 w-5 text-blue-600"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                ></circle>
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            <span class="ml-3 text-sm text-blue-700">
                                {{ importProgress }}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    @click="runImport"
                    :disabled="!canImport || importing"
                    class="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span v-if="importing" class="flex items-center justify-center">
                        <svg
                            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                class="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                stroke-width="4"
                            ></circle>
                            <path
                                class="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                        Importing...
                    </span>
                    <span v-else> Start Import </span>
                </button>

                <p v-if="!canImport && status" class="mt-2 text-sm text-gray-500 text-center">
                    {{ getDisabledReason() }}
                </p>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import Card from "@/components/atoms/Card.vue"
import {
    useImportStatus,
    useRunImport,
    type ImportStatus,
    type ImportResult,
} from "@/composables/api/useImport"

// Initialize composables at setup level
const importStatusComposable = useImportStatus()
const runImportComposable = useRunImport()

// Status
const status = ref<ImportStatus | null>(null)
const statusLoading = ref(false)
const statusError = ref<string | null>(null)

// Import
const importing = ref(false)
const importProgress = ref<string | null>(null)
const importResult = ref<ImportResult | null>(null)
const importError = ref<string | null>(null)

const canImport = computed(() => {
    return status.value?.available && status.value?.mdbExists && status.value?.mdbToolsAvailable
})

const getDisabledReason = () => {
    if (!status.value) return ""
    if (!status.value.available) return "No MDB path configured"
    if (!status.value.mdbExists) return "MDB file not found"
    if (!status.value.mdbToolsAvailable) return "MDB tools not installed"
    return ""
}

const fetchStatus = async () => {
    statusLoading.value = true
    statusError.value = null

    try {
        const { data, error, get } = importStatusComposable
        await get()
        if (error.value) {
            statusError.value = error.value
        } else if (data.value) {
            status.value = data.value
        }
    } catch (err) {
        statusError.value = err instanceof Error ? err.message : String(err)
    } finally {
        statusLoading.value = false
    }
}

const runImport = async () => {
    if (!canImport.value || importing.value) return

    importing.value = true
    importProgress.value = "Starting import..."
    importResult.value = null
    importError.value = null

    try {
        // Simulate progress updates
        setTimeout(() => {
            importProgress.value = "Exporting data from Access database..."
        }, 1000)

        setTimeout(() => {
            importProgress.value = "Importing data into SQLite..."
        }, 3000)

        const { data, error, post } = runImportComposable
        await post()
        if (error.value) {
            importError.value = error.value
            importResult.value = { success: false } as ImportResult
        } else if (data.value) {
            importResult.value = data.value
        }
    } catch (err) {
        importError.value = err instanceof Error ? err.message : String(err)
        importResult.value = { success: false } as ImportResult
    } finally {
        importing.value = false
        importProgress.value = null
    }
}

onMounted(() => {
    fetchStatus()
})
</script>
