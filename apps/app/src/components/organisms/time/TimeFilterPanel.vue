<template>
    <div class="bg-indigo-50 p-4 border border-gray-200 rounded-lg mb-6">
        <div class="flex flex-col lg:flex-row gap-4">
            <!-- Left section: Filters -->
            <div class="flex-1">
                <!-- Row 1: Project, User, Sort (adapts based on visible filters) -->
                <div
                    class="grid grid-cols-1 gap-4"
                    :class="{
                        'md:grid-cols-3': showProjectFilter && (isRole('admin') || showUserFilter),
                        'md:grid-cols-2': showProjectFilter !== (isRole('admin') || showUserFilter),
                        'md:grid-cols-1': !showProjectFilter && !isRole('admin') && !showUserFilter,
                    }"
                >
                    <!-- Project Filter -->
                    <div class="form-group" v-if="showProjectFilter">
                        <Label>{{ $t("time.filters.project") }}</Label>
                        <ProjectSelect
                            v-model="localFilter.projectId"
                            :placeholder="$t('projects.filters.searchByNameAndNumber')"
                            @update:modelValue="handleFilterChange"
                        />
                    </div>

                    <!-- User Filter -->
                    <div class="form-group" v-if="isRole('admin') || showUserFilter">
                        <Label>{{ $t("shared.collaborator") }}</Label>
                        <UserSelect
                            :only-show="availableUsers"
                            v-model="localFilter.userId"
                            :placeholder="$t('shared.collaborator')"
                            @update:modelValue="handleFilterChange"
                        />
                    </div>

                    <!-- Sort controls -->
                    <div class="form-group">
                        <Label>{{ $t("projects.filters.sortBy") }}</Label>
                        <div class="flex gap-2">
                            <Select
                                v-model="localFilter.sortBy"
                                :options="[
                                    { label: $t('time.columns.date'), value: 'date' },
                                    { label: $t('time.columns.user'), value: 'userId' },
                                    { label: $t('time.columns.project'), value: 'projectId' },
                                    { label: $t('time.columns.durationLong'), value: 'duration' },
                                    { label: $t('time.columns.kilometers'), value: 'kilometers' },
                                    { label: $t('time.columns.expenses'), value: 'expenses' },
                                ]"
                                @update:modelValue="handleFilterChange"
                            ></Select>
                            <Select
                                v-model="localFilter.sortOrder"
                                :options="[
                                    { label: $t('projects.filters.ascending'), value: 'asc' },
                                    { label: $t('projects.filters.descending'), value: 'desc' },
                                ]"
                                @update:modelValue="handleFilterChange"
                            ></Select>
                        </div>
                    </div>
                </div>

                <!-- Row 2: DateRange, Activity Type -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div class="md:col-span-2">
                        <DateRange
                            :from-date="localFilter.fromDate"
                            :to-date="localFilter.toDate"
                            :from-label="$t('time.filters.fromDate')"
                            :to-label="$t('time.filters.toDate')"
                            @update:from-date="
                                (value) => {
                                    localFilter.fromDate = value
                                    handleFilterChange()
                                }
                            "
                            @update:to-date="
                                (value) => {
                                    localFilter.toDate = value
                                    handleFilterChange()
                                }
                            "
                        />
                    </div>

                    <!-- Activity Type Filter -->
                    <div class="form-group">
                        <Label>{{ $t("time.filters.activityType") }}</Label>
                        <ActivityTypeSelect
                            v-model="localFilter.activityTypeId"
                            :show-all-option="true"
                            @update:modelValue="handleFilterChange"
                        />
                    </div>
                </div>

                <div class="mt-4">
                    <Button @click="resetFilters" variant="secondary">
                        {{ $t("common.resetFilters") }}
                    </Button>
                </div>
            </div>

            <!-- Right section: Checkboxes -->
            <div
                class="w-full lg:w-48 border-t lg:border-t-0 lg:border-l border-gray-300 pt-4 lg:pt-0 lg:pl-4"
            >
                <div class="space-y-2">
                    <Checkbox
                        :model-value="!!localFilter.includeUnbilled"
                        @update:model-value="
                            (v) => {
                                localFilter.includeUnbilled = v
                                handleFilterChange()
                            }
                        "
                        :label="$t('time.filters.unbilled')"
                        id="includeUnbilled"
                    />
                    <Checkbox
                        :model-value="!!localFilter.includeBilled"
                        @update:model-value="
                            (v) => {
                                localFilter.includeBilled = v
                                handleFilterChange()
                            }
                        "
                        :label="$t('time.filters.billed')"
                        id="includeBilled"
                    />
                    <Checkbox
                        v-if="isRole('admin')"
                        :model-value="!!localFilter.includeNotDisbursed"
                        @update:model-value="
                            (v) => {
                                localFilter.includeNotDisbursed = v
                                handleFilterChange()
                            }
                        "
                        :label="$t('time.filters.notDisbursed')"
                        id="includeNotDisbursed"
                    />
                    <Checkbox
                        v-if="isRole('admin')"
                        :model-value="!!localFilter.includeDisbursed"
                        @update:model-value="
                            (v) => {
                                localFilter.includeDisbursed = v
                                handleFilterChange()
                            }
                        "
                        :label="$t('time.filters.disbursed')"
                        id="includeDisbursed"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue"
import Label from "@/components/atoms/Label.vue"
import Select from "@/components/atoms/Select.vue"
import Button from "@/components/atoms/Button.vue"
import ActivityTypeSelect from "@/components/organisms/activityType/ActivityTypeSelect.vue"
import Checkbox from "@/components/atoms/Checkbox.vue"
import DateRange from "@/components/molecules/DateRange.vue"
import ProjectSelect from "@/components/organisms/project/ProjectSelect.vue"
import { useFetchUsers } from "@/composables/api/useUser"
import type { ActivityFilter } from "@beg/validations"
import UserSelect from "@/components/organisms/user/UserSelect.vue"
import { useAuthStore } from "@/stores/auth"
import { getTodayRange } from "@/composables/utils/useDateRangePresets"

// For backwards compatibility, keep the old interface name as an alias
export type TimeFilters = ActivityFilter

interface Props {
    filter: ActivityFilter
    showProjectFilter?: boolean
    showUserFilter?: boolean
    availableUsers?: number[]
    initialFilter?: Partial<ActivityFilter>
}

const {
    filter,
    showProjectFilter = true,
    showUserFilter = false,
    availableUsers = undefined,
    initialFilter,
} = defineProps<Props>()
const { isRole } = useAuthStore()
const emit = defineEmits<{
    "update:filter": [value: ActivityFilter]
}>()

// Local filter state
const localFilter = ref<ActivityFilter>({ ...filter })

// Fetch data for dropdowns
const { get: fetchUsers, loading: loadingUsers, data: usersData } = useFetchUsers()

const userOptions = ref<Array<{ label: string; value: number }>>([])

// Watch for data changes and update options
watch(usersData, (newData) => {
    if (newData) {
        userOptions.value = newData.map((user: any) => ({
            label: `${user.firstName} ${user.lastName}`,
            value: user.id,
        }))
    }
})

// Watch for prop changes
watch(
    () => filter,
    (newFilter) => {
        localFilter.value = { ...newFilter }
    },
    { deep: true }
)

// Handle filter changes
const handleFilterChange = () => {
    emit("update:filter", { ...localFilter.value })
}

// Reset filters
const resetFilters = () => {
    const { from, to } = getTodayRange()
    localFilter.value = {
        userId: undefined,
        projectId: undefined,
        activityTypeId: undefined,
        fromDate: from,
        toDate: to,
        includeBilled: false,
        includeUnbilled: false,
        includeDisbursed: false,
        includeNotDisbursed: false,
        sortBy: "date",
        sortOrder: "desc",
        ...(initialFilter || {}),
    }
    handleFilterChange()
}

// Load data on mount
onMounted(async () => {
    await fetchUsers()
})
</script>
