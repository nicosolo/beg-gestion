<template>
    <div class="container mx-auto px-6 py-8 max-w-4xl">
        <div class="flex items-center gap-4 mb-8">
            <ArrowDownTrayIcon class="h-6 w-6 text-gray-600" />
            <h1 class="text-2xl font-semibold">{{ $t("downloadApp.title") }}</h1>
        </div>

        <div class="bg-white shadow-sm rounded-lg p-6">
            <p class="text-gray-600 mb-6">{{ $t("downloadApp.description") }}</p>

            <div class="grid gap-4 md:grid-cols-2">
                <!-- Windows x86 -->
                <button
                    @click="download(downloads.windowsX86)"
                    :class="[
                        'flex flex-col items-center p-6 border rounded-lg transition-colors cursor-pointer',
                        detectedOS === 'windows-x86'
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                            : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50',
                    ]"
                >
                    <ComputerDesktopIcon class="h-12 w-12 text-gray-600 mb-3" />
                    <span class="font-medium text-gray-900">Windows</span>
                    <span class="text-sm text-gray-500">x86 (64-bit)</span>
                    <span
                        v-if="detectedOS === 'windows-x86'"
                        class="mt-2 text-xs text-blue-600 font-medium"
                    >
                        {{ $t("downloadApp.recommended") }}
                    </span>
                </button>
            </div>

            <div class="mt-6 text-sm text-gray-500">
                <p>{{ $t("downloadApp.version") }}: {{ version }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { ArrowDownTrayIcon, ComputerDesktopIcon } from "@heroicons/vue/24/outline"
import desktopVersion from "@/config/desktop-version.json"
import { useFileDownload } from "@/composables/utils/useFileDownload"

const version = desktopVersion.version
const { downloadBlob } = useFileDownload()

const downloads = computed(() => ({
    macos: `/downloads/BEG-Gestion_${version}_universal.dmg`,
    windowsX86: `/downloads/BEG-Gestion_${version}_x64-setup.exe`,
    windowsArm: `/downloads/BEG-Gestion_${version}_arm64-setup.exe`,
}))

const download = async (url: string) => {
    const fileName = url.split("/").pop() || "setup.exe"
    const response = await fetch(url)
    const blob = await response.blob()
    await downloadBlob(blob, fileName, [{ name: "Installer", extensions: ["exe"] }])
}

const detectedOS = computed(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const platform = navigator.platform?.toLowerCase() || ""

    // Check for macOS
    if (platform.includes("mac") || userAgent.includes("macintosh")) {
        return "macos"
    }

    // Check for Windows
    if (platform.includes("win") || userAgent.includes("windows")) {
        // Try to detect ARM Windows
        if (userAgent.includes("arm") || userAgent.includes("aarch64")) {
            return "windows-arm"
        }
        return "windows-x86"
    }

    return null
})
</script>
