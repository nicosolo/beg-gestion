<template>
    <AutocompleteSelect
        :model-value="modelValue"
        mode="async"
        :items="projects"
        :loading="loading"
        :fetch-function="fetchProjects"
        :display-field="formatProjectLabel"
        :placeholder="placeholder || $t('common.select')"
        :disabled="disabled"
        :required="required"
        :class-name="className"
        :min-search-length="1"
        @update:model-value="$emit('update:modelValue', $event ?? undefined)"
    >
        <template #item="{ item }">
            <div class="font-medium flex items-center gap-2">
                <Badge v-if="item.status === 'offer'" variant="info" size="sm">
                    {{ $t("projects.status.offer") }}
                </Badge>
                <Badge v-else-if="item.status === 'draft'" variant="warning" size="sm">
                    {{ $t("projects.status.draft") }}
                </Badge>
                <Badge v-if="item.ended" variant="muted" size="sm">
                    {{ $t("projects.ended") }}
                </Badge>
                <span :class="{ 'text-gray-500': item.status !== 'active' || item.ended }">{{
                    formatProjectLabel(item)
                }}</span>
            </div>
        </template>
    </AutocompleteSelect>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useFetchProjectList, useFetchProject } from "@/composables/api/useProject"
import AutocompleteSelect from "@/components/atoms/AutocompleteSelect.vue"
import Badge from "@/components/atoms/Badge.vue"
import type { ProjectResponse } from "@beg/validations"

interface ProjectSelectProps {
    modelValue: number | undefined
    placeholder?: string
    disabled?: boolean
    required?: boolean
    className?: string
    includeArchived?: boolean
}

const props = withDefaults(defineProps<ProjectSelectProps>(), {
    includeArchived: false,
})

defineEmits<{
    "update:modelValue": [value: number | undefined]
}>()

const {} = useI18n()
const { loading, data, get } = useFetchProjectList()
const { get: fetchSingleProject } = useFetchProject()
const projects = ref<ProjectResponse[]>([])

// Format project label (without badges, for dropdown items)
const formatProjectLabel = (project: ProjectResponse): string => {
    const projectNumber = project.projectNumber || "Sans numéro"
    if (project.subProjectName) {
        return `${projectNumber} ${project.subProjectName} - ${project.name}`
    }
    return `${projectNumber} - ${project.name}`
}

// Fetch selected item when modelValue changes
const fetchSelectedItem = async () => {
    if (props.modelValue && !projects.value.find((p) => p.id === props.modelValue)) {
        const projectData = await fetchSingleProject({ params: { id: props.modelValue } })
        if (projectData) {
            // Add the selected item to the projects array if not already there
            projects.value = [projectData, ...projects.value.filter((p) => p.id !== projectData.id)]
        }
    }
}

// Watch for external changes to modelValue
watch(
    () => props.modelValue,
    async (newValue) => {
        if (newValue) {
            await fetchSelectedItem()
        }
    },
    { immediate: true }
)

// Update local projects when data changes from API
watch(
    () => data.value,
    (newData) => {
        if (newData) {
            // Merge new data with existing projects, avoiding duplicates
            projects.value = newData.data
        }
    }
)

// Fetch function that receives search text (minimum 2 characters required)
const fetchProjects = async (searchText: string) => {
    if (searchText.length < 1) {
        projects.value = []
        return
    }
    await get({
        query: {
            name: searchText,
            includeArchived: props.includeArchived,
            limit: 50,
            sortBy: "projectNumber",
        },
    })
}
</script>
