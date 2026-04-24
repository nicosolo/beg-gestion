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
import { computed, onMounted, watch } from "vue"
import { useI18n } from "vue-i18n"
import AutocompleteSelect from "@/components/atoms/AutocompleteSelect.vue"
import { useFetchSubProjectNames } from "@/composables/api/useProject"

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
const { data, get } = useFetchSubProjectNames()

const options = computed(() =>
    (data.value ?? []).map((name) => ({ id: name, name }))
)

const handleChange = (value: number | string | undefined | null) => {
    emit("update:modelValue", value == null ? undefined : String(value))
}

onMounted(() => {
    get()
})

// Re-fetch on mount also when modelValue arrives pre-populated (e.g. after route reload)
watch(
    () => props.modelValue,
    () => {
        if (!data.value) get()
    }
)
</script>
