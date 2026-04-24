<template>
    <AutocompleteSelect
        :model-value="modelValue ?? null"
        mode="static"
        :options="options"
        :display-field="(item) => item.name"
        :placeholder="placeholder || $t('projects.filters.subProjectName')"
        :disabled="disabled"
        :class-name="className"
        @update:model-value="handleChange"
    />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import AutocompleteSelect from "@/components/atoms/AutocompleteSelect.vue"
import { SUB_PROJECT_NAMES } from "@beg/validations"

interface Props {
    modelValue: string | undefined
    placeholder?: string
    disabled?: boolean
    className?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
    "update:modelValue": [value: string | undefined]
}>()

const {} = useI18n()

const options = computed(() => {
    const list = SUB_PROJECT_NAMES.map((name) => ({ id: name, name }))
    // Preserve legacy/out-of-list value so the current selection is visible.
    const current = props.modelValue?.trim()
    if (current && !SUB_PROJECT_NAMES.includes(current as (typeof SUB_PROJECT_NAMES)[number])) {
        return [{ id: current, name: current }, ...list]
    }
    return list
})

const handleChange = (value: number | string | undefined | null) => {
    emit("update:modelValue", value == null ? undefined : String(value))
}
</script>
