<template>
    <div class="bg-indigo-50 p-4 border border-gray-200 rounded-lg mb-6">
        <div class="flex flex-col lg:flex-row gap-4">
            <!-- Left section: Filters -->
            <div class="flex-1">
                <!-- Row 1: Name, User, Type -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField v-if="showNameInput" :label="$t('projects.name')">
                        <template #input>
                            <Input
                                v-model="filterData.text"
                                :placeholder="$t('projects.filters.searchByNameAndNumber')"
                                @update:model-value="emitInputChange"
                            />
                        </template>
                    </FormField>
                    <div class="form-group">
                        <Label>{{ $t("projects.filters.referentUser") }}</Label>
                        <UserSelect
                            v-model="filterData.referentUserId"
                            :placeholder="$t('shared.selectReferentUser')"
                            @update:model-value="emitChange"
                        />
                    </div>
                    <div class="form-group">
                        <Label>{{ $t("projects.type") }}</Label>
                        <MultiProjectTypeSelect
                            v-model="filterData.projectTypeIds!"
                            :placeholder="$t('projects.filters.selectType')"
                            @update:model-value="emitChange"
                        />
                    </div>
                </div>

                <!-- Row 2: DateRange, Sort, Sous-mandat -->
                <div class="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
                    <div class="md:col-span-3">
                        <DateRange
                            :from-date="filterData.fromDate"
                            :to-date="filterData.toDate"
                            :from-label="$t('projects.filters.fromDate')"
                            :to-label="$t('projects.filters.toDate')"
                            @update:from-date="
                                (value) => {
                                    filterData.fromDate = value
                                    emitChange()
                                }
                            "
                            @update:to-date="
                                (value) => {
                                    filterData.toDate = value
                                    emitChange()
                                }
                            "
                        />
                    </div>
                    <div v-if="showSort" class="form-group md:col-span-2">
                        <Label>{{ $t("projects.filters.sortBy") }}</Label>
                        <div class="flex gap-2">
                            <Select
                                v-model="filterData.sortBy"
                                @update:model-value="emitChange"
                                :options="[
                                    {
                                        label: $t('projects.unBilledDuration'),
                                        value: 'unBilledDuration',
                                    },
                                    { label: $t('projects.totalDuration'), value: 'totalDuration' },
                                    {
                                        label: $t('projects.firstActivity'),
                                        value: 'firstActivityDate',
                                    },
                                    {
                                        label: $t('projects.lastActivity'),
                                        value: 'lastActivityDate',
                                    },
                                    { label: $t('projects.createdAt'), value: 'createdAt' },
                                    { label: $t('projects.projectNumber'), value: 'projectNumber' },
                                    { label: $t('projects.name'), value: 'name' },
                                ]"
                            ></Select>
                            <Select
                                v-model="filterData.sortOrder"
                                @update:model-value="emitChange"
                                :options="[
                                    { label: $t('projects.filters.ascending'), value: 'asc' },
                                    { label: $t('projects.filters.descending'), value: 'desc' },
                                ]"
                            ></Select>
                        </div>
                    </div>
                    <div class="form-group">
                        <Label>{{ $t("projects.filters.subProjectName") }}</Label>
                        <SubProjectNameSelect
                            v-model="filterData.subProjectName"
                            @update:model-value="emitChange"
                        />
                    </div>
                </div>

                <div class="mt-4">
                    <Button @click="resetFilters" variant="secondary">
                        {{ $t("projects.filters.reset") }}
                    </Button>
                </div>
            </div>

            <!-- Right section: Checkboxes -->
            <div
                v-if="showCheckboxes"
                class="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-300 pt-4 lg:pt-0 lg:pl-4"
            >
                <div class="space-y-2">
                    <Checkbox
                        v-model="filterData.hasUnbilledTime"
                        @update:model-value="emitChange"
                        :label="$t('projects.filters.hasUnbilledTime')"
                        id="hasUnbilledTime"
                    />
                    <Checkbox
                        v-model="filterData.includeArchived"
                        @update:model-value="emitChange"
                        :label="$t('projects.filters.includeArchived')"
                        id="includeArchived"
                    />
                    <div>
                        <Label class="text-xs mb-1.5 block">{{
                            $t("projects.filters.status")
                        }}</Label>
                        <ProjectStatusSelect
                            :model-value="filterData.status"
                            :allow-deselect="true"
                            @update:model-value="handleStatusChange"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import type { ProjectFilter } from "@beg/validations"

export type ProjectFilterModel = Omit<ProjectFilter, "page" | "limit" | "accountId">

export const getDefaultProjectFilter = (): ProjectFilterModel => {
    return {
        text: "",
        subProjectName: undefined,
        includeArchived: false,
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
        fromDate: undefined,
        toDate: undefined,
        referentUserId: undefined,
        projectTypeIds: [],
        hasUnbilledTime: false,
    }
}
</script>

<script setup lang="ts">
defineOptions({ name: "ProjectFilterPanel" })

import { onActivated, onMounted, reactive, watch } from "vue"
import Label from "../../atoms/Label.vue"
import Select from "../../atoms/Select.vue"
import ProjectStatusSelect from "./ProjectStatusSelect.vue"
import Button from "../../atoms/Button.vue"
import FormField from "../../molecules/FormField.vue"
import DateRange from "../../molecules/DateRange.vue"
import UserSelect from "../../organisms/user/UserSelect.vue"
import MultiProjectTypeSelect from "../../organisms/projectType/MultiProjectTypeSelect.vue"
import Checkbox from "@/components/atoms/Checkbox.vue"
import Input from "@/components/atoms/Input.vue"
import SubProjectNameSelect from "@/components/organisms/project/SubProjectNameSelect.vue"
import { debounce } from "@/utils/debounce"
interface ProjectFilterProps {
    filter: ProjectFilterModel
    showSort?: boolean
    showCheckboxes?: boolean
    showNameInput?: boolean
}

// Define props for the component
const {
    filter,
    showSort = true,
    showCheckboxes = true,
    showNameInput = true,
} = defineProps<ProjectFilterProps>()

// Define emitted events
const emit = defineEmits<{
    (e: "update:filter", filter: ProjectFilterProps["filter"]): void
    (e: "filter-change"): void
}>()

// Create reactive copy of the filter
const filterData = reactive<ProjectFilterProps["filter"]>({
    text: filter.text,
    subProjectName: filter.subProjectName,
    includeArchived: filter.includeArchived,
    status: filter.status,
    sortBy: filter.sortBy,
    sortOrder: filter.sortOrder,
    fromDate: filter.fromDate,
    toDate: filter.toDate,
    referentUserId: filter.referentUserId || undefined,
    projectTypeIds: filter.projectTypeIds || [],
    hasUnbilledTime: filter.hasUnbilledTime || false,
})
onMounted(() => {
    console.log("onMounted a ProjectFilterPanel")
})
onActivated(() => {
    console.log("onActivated a ProjectFilterPanel")
})
// Watch for external filter changes
watch(
    () => filter,
    (newFilter) => {
        filterData.text = newFilter.text
        filterData.subProjectName = newFilter.subProjectName
        filterData.includeArchived = newFilter.includeArchived
        filterData.status = newFilter.status
        filterData.sortBy = newFilter.sortBy
        filterData.sortOrder = newFilter.sortOrder
        filterData.fromDate = newFilter.fromDate
        filterData.toDate = newFilter.toDate
        filterData.referentUserId = newFilter.referentUserId
        filterData.projectTypeIds = newFilter.projectTypeIds
        filterData.hasUnbilledTime = newFilter.hasUnbilledTime
    },
    { deep: true }
)

// Create debounced filter change for text input
const debouncedFilterChange = debounce(() => {
    emit("update:filter", { ...filterData })
}, 300)

const handleStatusChange = (value: string | undefined) => {
    filterData.status = value as typeof filterData.status
    emitChange()
}

// Emit methods
const emitChange = () => {
    emit("update:filter", {
        ...filterData,
        status: filterData.status || undefined,
    })
}

const emitInputChange = () => {
    debouncedFilterChange()
}

// Reset filters
const resetFilters = () => {
    const defaultFilter = getDefaultProjectFilter()
    filterData.text = defaultFilter.text
    filterData.subProjectName = defaultFilter.subProjectName
    filterData.includeArchived = defaultFilter.includeArchived
    filterData.status = defaultFilter.status
    filterData.sortBy = defaultFilter.sortBy
    filterData.sortOrder = defaultFilter.sortOrder
    filterData.fromDate = defaultFilter.fromDate
    filterData.toDate = defaultFilter.toDate
    filterData.referentUserId = defaultFilter.referentUserId
    filterData.projectTypeIds = defaultFilter.projectTypeIds
    filterData.hasUnbilledTime = defaultFilter.hasUnbilledTime
    emitChange()
}
</script>
