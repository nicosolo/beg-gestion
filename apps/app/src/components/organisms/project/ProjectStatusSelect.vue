<template>
    <ToggleGroup
        :model-value="modelValue"
        :options="options"
        :allow-deselect="allowDeselect"
        @update:model-value="$emit('update:modelValue', $event as ProjectStatus | undefined)"
    />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import ToggleGroup from "@/components/atoms/ToggleGroup.vue"
import type { ProjectStatus } from "@beg/validations"

defineProps<{
    modelValue: ProjectStatus | undefined
    allowDeselect?: boolean
}>()

defineEmits<{
    "update:modelValue": [value: ProjectStatus | undefined]
}>()

const { t } = useI18n()

const options = computed(() => [
    {
        value: "active",
        label: t("projects.status.active"),
        activeClass: "bg-emerald-600 text-white border-emerald-600",
    },
    {
        value: "draft",
        label: t("projects.status.draft"),
        activeClass: "bg-amber-500 text-white border-amber-500",
    },
    {
        value: "offer",
        label: t("projects.status.offer"),
        activeClass: "bg-blue-600 text-white border-blue-600",
    },
])
</script>
