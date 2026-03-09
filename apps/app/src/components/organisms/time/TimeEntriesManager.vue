<template>
    <div>
        <div class="mb-4" v-if="!hideHeader">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 class="text-lg font-semibold">{{ $t("time.title") }}</h2>
                <div class="flex flex-wrap gap-2 justify-start sm:justify-end">
                    <DropdownMenu>
                        <template #trigger="{ toggle }">
                            <Button
                                variant="secondary"
                                size="md"
                                @click="toggle"
                                :disabled="exportLoading"
                                class="w-full sm:w-auto"
                            >
                                {{
                                    exportLoading
                                        ? $t("time.export.exporting")
                                        : $t("time.export.button")
                                }}
                            </Button>
                        </template>
                        <template #items="{ close }">
                            <button
                                @click="
                                    () => {
                                        handleExport(false)
                                        close()
                                    }
                                "
                                class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                role="menuitem"
                                type="button"
                            >
                                {{ $t("time.export.all") }}
                            </button>
                            <button
                                @click="
                                    () => {
                                        handleExport(true)
                                        close()
                                    }
                                "
                                class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                role="menuitem"
                                type="button"
                            >
                                {{ $t("time.export.perUser") }}
                            </button>
                        </template>
                    </DropdownMenu>
                    <Button
                        variant="primary"
                        size="md"
                        @click="openAddModal"
                        class="w-full sm:w-auto"
                    >
                        {{ $t("time.new") }}
                    </Button>
                </div>
            </div>
            <TimeFilterPanel
                v-model:filter="filter"
                :show-project-filter="showProjectFilter"
                :show-user-filter="showUserFilter"
                :available-users="availableUsers"
                :initial-filter="initialFilter"
            />
        </div>
        <LoadingOverlay :loading="loading">
            <Pagination
                v-if="activities.length > 0 || totalItems > 0"
                :current-page="currentPage"
                :total-pages="totalPages"
                :total-items="totalItems"
                :page-size="pageSize"
                @prev="prevPage"
                @next="nextPage"
                @go-to="goToPage"
            />
            <TimeTable
                :activities="activities"
                :totals="totals"
                :sort="sort"
                :empty-message="emptyMessage"
                @sort-change="handleSortChange"
                @edit="openEditModal"
                @activities-updated="loadActivities"
                :hide-columns="hideColumns"
                :disable-selection="disableSelection"
            />

            <Pagination
                v-if="activities.length > 0 || totalItems > 0"
                :current-page="currentPage"
                :total-pages="totalPages"
                :total-items="totalItems"
                :page-size="pageSize"
                @prev="prevPage"
                @next="nextPage"
                @go-to="goToPage"
            />
        </LoadingOverlay>

        <!-- Time Entry Modal -->
        <TimeEntryModal
            v-model="showTimeEntryModal"
            :activity-id="selectedActivityId"
            :default-project-id="defaultProjectId"
            @saved="onTimeEntrySaved"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onActivated, computed } from "vue"
import { useFetchActivityList, useExportActivities } from "@/composables/api/useActivity"
import TimeFilterPanel from "@/components/organisms/time/TimeFilterPanel.vue"
import TimeTable from "@/components/organisms/time/TimeTable.vue"
import Pagination from "@/components/organisms/Pagination.vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import TimeEntryModal from "@/components/organisms/time/TimeEntryModal.vue"
import Button from "@/components/atoms/Button.vue"
import DropdownMenu from "@/components/atoms/DropdownMenu.vue"
import type { ActivityFilter, ActivityResponse, ActivityListResponse } from "@beg/validations"
import { useExcelExport } from "@/composables/utils/useExcelExport"

interface Props {
    emptyMessage?: string
    showProjectFilter?: boolean
    showUserFilter?: boolean
    availableUsers?: number[]
    initialFilter?: Partial<ActivityFilter>
    hideColumns?: string[]
    hideHeader?: boolean
    disableSelection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    emptyMessage: "Aucune entrée d'heure trouvée",
    showProjectFilter: true,
    hideHeader: false,
    showUserFilter: false,
    availableUsers: undefined,
})

// API client
const { get: fetchActivities, loading, data } = useFetchActivityList()
const { get: exportActivities, loading: exportLoading } = useExportActivities()

// Excel export
const { exportToExcel } = useExcelExport()

// State
const activities = ref<ActivityResponse[]>([])
const totalItems = ref(0)
const totalPages = ref(0)
const currentPage = ref(1)
const pageSize = ref(100)
const totals = ref<{ duration: number; kilometers: number; expenses: number } | undefined>()

// Modal state
const showTimeEntryModal = ref(false)
const selectedActivityId = ref<number | null>(null)
const defaultProjectId = ref<number | undefined>(undefined)
// Filter state
const filter = ref<ActivityFilter>({
    userId: undefined,
    activityTypeId: undefined,
    includeBilled: false,
    includeUnbilled: false,
    includeDisbursed: false,
    sortBy: "date",
    sortOrder: "desc",
    ...props.initialFilter,
})

const sort = computed(() => ({
    key: filter.value.sortBy || "date",
    direction: filter.value.sortOrder || "desc",
}))

const handleSortChange = (sort: {
    key: ActivityFilter["sortBy"] | string
    direction: ActivityFilter["sortOrder"] | "asc" | "desc"
}) => {
    filter.value.sortBy = sort.key as ActivityFilter["sortBy"]
    filter.value.sortOrder = sort.direction as ActivityFilter["sortOrder"]
    loadActivities()
}

// Watch for API data changes
watch(
    data,
    (newData) => {
        if (newData) {
            const pageData = newData as unknown as ActivityListResponse
            activities.value = pageData.data
            totalItems.value = pageData.total
            totalPages.value = pageData.totalPages
            totals.value = pageData.totals
        }
    },
    { deep: true }
)

watch(
    filter,
    (newData) => {
        if (newData) {
            loadActivities()
        }
    },
    { deep: true }
)

const loadActivities = async () => {
    const params: ActivityFilter = {
        page: currentPage.value,
        limit: pageSize.value,
        ...filter.value,
    }

    await fetchActivities({
        query: params,
    })
}

// Pagination handlers
const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        loadActivities()
    }
}

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
        loadActivities()
    }
}

const goToPage = (page: number) => {
    currentPage.value = page
    loadActivities()
}

// Load initial data
onMounted(() => {
    loadActivities()
})

onActivated(() => {
    loadActivities()
})

// Modal handlers
const openEditModal = (activityId: number) => {
    selectedActivityId.value = activityId
    defaultProjectId.value = undefined // Don't override project when editing
    showTimeEntryModal.value = true
}

const openAddModal = () => {
    selectedActivityId.value = null
    // Use the project ID from filter if available
    defaultProjectId.value = filter.value.projectId
    showTimeEntryModal.value = true
}

const onTimeEntrySaved = () => {
    // Reload activities to update the list
    loadActivities()
}

// Export handler
const handleExport = async (perUser: boolean = false) => {
    const arrayBuffer = await exportActivities({
        query: { ...filter.value, perUser },
    })

    const today = new Date().toISOString().split("T")[0]
    const filename = `heures-${today}.xlsx`

    await exportToExcel(arrayBuffer, filename)
}

// Expose methods that parent components might need
defineExpose({
    loadActivities,
})
</script>
