<template>
    <ToggleGroup
        :model-value="modelValue"
        :options="options"
        :allow-deselect="allowDeselect"
        @update:model-value="$emit('update:modelValue', $event as InvoiceStatus | undefined)"
    />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import ToggleGroup from "@/components/atoms/ToggleGroup.vue"
import type { InvoiceStatus } from "@beg/validations"

const props = defineProps<{
    modelValue: InvoiceStatus | undefined
    /** Allow deselecting (click active to clear). When true, disabled rules are ignored. */
    allowDeselect?: boolean
}>()

defineEmits<{
    "update:modelValue": [value: InvoiceStatus | undefined]
}>()

const { t } = useI18n()

const options = computed(() => [
    { value: "draft", label: t("invoice.status.draft"), activeClass: "bg-gray-500 text-white border-gray-500" },
    { value: "controle", label: t("invoice.status.controle"), activeClass: "bg-amber-500 text-white border-amber-500" },
    { value: "vise", label: t("invoice.status.vise"), disabled: !props.allowDeselect, activeClass: "bg-green-600 text-white border-green-600" },
    { value: "sent", label: t("invoice.status.sent"), disabled: !props.allowDeselect && props.modelValue !== "vise" && props.modelValue !== "sent", activeClass: "bg-blue-600 text-white border-blue-600" },
])
</script>
