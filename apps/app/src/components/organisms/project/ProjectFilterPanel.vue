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
                                v-model="filterData.name"
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

                <!-- Row 2: DateRange, Sort -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div class="md:col-span-2">
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
                    <div v-if="showSort" class="form-group">
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
                class="w-full lg:w-48 border-t lg:border-t-0 lg:border-l border-gray-300 pt-4 lg:pt-0 lg:pl-4"
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
                    <Checkbox
                        v-if="isRole('admin')"
                        v-model="filterData.includeDraft"
                        @update:model-value="emitChange"
                        :label="$t('projects.filters.includeDraft')"
                        id="includeDraft"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineOptions({ name: "ProjectFilterPanel" })

import { onActivated, onMounted, reactive, watch } from "vue"
import Label from "../../atoms/Label.vue"
import Select from "../../atoms/Select.vue"
import Button from "../../atoms/Button.vue"
import FormField from "../../molecules/FormField.vue"
import DateRange from "../../molecules/DateRange.vue"
import UserSelect from "../../organisms/user/UserSelect.vue"
import MultiProjectTypeSelect from "../../organisms/projectType/MultiProjectTypeSelect.vue"
import type { ProjectFilter } from "@beg/validations"
import Checkbox from "@/components/atoms/Checkbox.vue"
import Input from "@/components/atoms/Input.vue"
import { debounce } from "@/utils/debounce"
import { getYearRange } from "@/composables/utils/useDateRangePresets"
import { useAuthStore } from "@/stores/auth"

export type ProjectFilterModel = Omit<ProjectFilter, "page" | "limit" | "accountId">
interface ProjectFilterProps {
    filter: ProjectFilterModel
    showSort?: boolean
    showCheckboxes?: boolean
    showNameInput?: boolean
}

const { isRole } = useAuthStore()

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
    name: filter.name,
    includeArchived: filter.includeArchived,
    includeDraft: filter.includeDraft || false,
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
        filterData.name = newFilter.name
        filterData.includeArchived = newFilter.includeArchived
        filterData.includeDraft = newFilter.includeDraft
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

// Emit methods
const emitChange = () => {
    emit("update:filter", { ...filterData })
}

const emitInputChange = () => {
    debouncedFilterChange()
}

// Reset filters
const resetFilters = () => {
    const { from, to } = getYearRange()
    filterData.name = ""
    filterData.includeArchived = false
    filterData.includeDraft = false
    filterData.sortBy = "name"
    filterData.sortOrder = "asc"
    filterData.fromDate = from
    filterData.toDate = to
    filterData.referentUserId = undefined
    filterData.projectTypeIds = []
    filterData.hasUnbilledTime = false
    emitChange()
}
</script>
