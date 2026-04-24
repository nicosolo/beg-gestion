<template>
    <Select
        :model-value="modelValue ?? ''"
        :options="options"
        :disabled="disabled"
        :required="required"
        @update:model-value="handleChange"
    />
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue"
import Select from "@/components/atoms/Select.vue"
import { useFetchCollaboratorGroupList } from "@/composables/api/useCollaboratorGroup"
import { useI18n } from "vue-i18n"

interface Props {
    modelValue?: number | null | undefined
    placeholder?: string
    required?: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    required: false,
    disabled: false,
})

const emit = defineEmits<{
    "update:modelValue": [value: number | null | undefined]
}>()

const { t } = useI18n()

const { get: fetchGroups, data } = useFetchCollaboratorGroupList()

onMounted(() => {
    fetchGroups({ query: { limit: 100, page: 1, sortBy: "name", sortOrder: "asc" } })
})

const options = computed(() => {
    const list = data.value?.data ?? []
    return [
        { label: props.placeholder ?? t("collaboratorGroup.all"), value: "" as string | number },
        ...list.map((g) => ({ label: g.name, value: g.id as string | number })),
    ]
})

const handleChange = (value: string | number | boolean | null) => {
    if (value === "" || value === null || value === undefined) {
        emit("update:modelValue", undefined)
        return
    }
    emit("update:modelValue", typeof value === "string" ? parseInt(value) : (value as number))
}
</script>
