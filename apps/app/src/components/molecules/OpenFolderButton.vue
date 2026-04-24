<template>
    <button
        v-if="!hasMultiple"
        type="button"
        :class="buttonClass"
        @click="onSingleClick"
    >
        <FolderOpenIcon class="h-4 w-4 shrink-0" />
        <span>{{ label }}</span>
    </button>

    <DropdownMenu v-else class="inline-block w-full sm:w-auto">
        <template #trigger="{ toggle }">
            <button type="button" :class="buttonClass" @click="toggle">
                <FolderOpenIcon class="h-4 w-4 shrink-0" />
                <span>{{ label }}</span>
                <ChevronDownIcon class="h-3.5 w-3.5" />
            </button>
        </template>
        <template #items="{ close }">
            <button
                v-for="entry in entries"
                :key="entry.source"
                type="button"
                class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                @click="selectEntry(entry, close)"
            >
                {{ entry.sourceLabel }}
            </button>
        </template>
    </DropdownMenu>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { ChevronDownIcon, FolderOpenIcon } from "@heroicons/vue/24/outline"
import DropdownMenu from "@/components/atoms/DropdownMenu.vue"
import type { OpenFolderEntry } from "@/composables/useOpenProjectFolder"

const props = defineProps<{
    entries: OpenFolderEntry[]
    label?: string
}>()

const emit = defineEmits<{
    open: [entry: OpenFolderEntry]
}>()

const { t } = useI18n()

const hasMultiple = computed(() => props.entries.length > 1)
const label = computed(() => props.label ?? t("projects.openFolder"))
const buttonClass =
    "text-sm px-3 py-1.5 rounded-md font-medium focus:outline-none focus:ring-2 cursor-pointer leading-none text-center hover:bg-indigo-200 text-indigo-700 inline-flex items-center justify-center gap-1 w-full sm:w-auto"

const onSingleClick = () => {
    if (props.entries.length === 1) emit("open", props.entries[0])
}

const selectEntry = (entry: OpenFolderEntry, close: () => void) => {
    close()
    emit("open", entry)
}
</script>
