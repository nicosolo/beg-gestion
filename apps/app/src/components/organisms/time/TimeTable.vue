<template>
    <div>
        <!-- Bulk actions bar -->
        <div
            v-if="selectedRows.size > 0 && !disableSelection"
            class="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4 shadow-sm"
        >
            <div class="flex items-center justify-between">
                <span class="text-sm text-blue-700">
                    {{ $t("common.itemsSelected", { count: selectedRows.size }) }}
                </span>
                <div class="flex gap-2">
                    <Button @click="updateSelectedRows('billed', true)" variant="primary" size="sm">
                        {{ $t("time.actions.markAsBilled") }}
                    </Button>
                    <Button
                        @click="updateSelectedRows('billed', false)"
                        variant="secondary"
                        size="sm"
                    >
                        {{ $t("time.actions.markAsUnbilled") }}
                    </Button>
                    <Button
                        @click="updateSelectedRows('disbursement', true)"
                        variant="secondary"
                        size="sm"
                    >
                        {{ $t("time.actions.markAsDisbursement") }}
                    </Button>
                    <Button
                        @click="updateSelectedRows('disbursement', false)"
                        variant="secondary"
                        size="sm"
                    >
                        {{ $t("time.actions.unmarkAsDisbursement") }}
                    </Button>
                    <Button @click="clearSelection" variant="ghost-primary" size="sm">
                        {{ $t("common.clearSelection") }}
                    </Button>
                </div>
            </div>
        </div>
        <!-- Totals section below the table -->
        <div v-if="totals" class="mb-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex flex-wrap gap-6 text-sm">
                <div v-if="totals.duration !== undefined" class="flex items-center gap-2">
                    <span class="font-semibold text-gray-700"
                        >{{ $t("time.columns.duration") }}:</span
                    >
                    <span class="text-gray-900">{{ formatDuration(totals.duration || 0) }}</span>
                </div>
                <div v-if="totals.kilometers !== undefined" class="flex items-center gap-2">
                    <span class="font-semibold text-gray-700"
                        >{{ $t("time.columns.kilometers") }}:</span
                    >
                    <span class="text-gray-900">{{ formatNumber(totals.kilometers || 0) }} km</span>
                </div>
                <div v-if="totals.expenses !== undefined" class="flex items-center gap-2">
                    <span class="font-semibold text-gray-700"
                        >{{ $t("time.columns.expenses") }}:</span
                    >
                    <span class="text-gray-900">{{ formatCurrency(totals.expenses || 0) }}</span>
                </div>
            </div>
        </div>
        <DataTable
            ref="dataTableRef"
            :items="activities"
            :columns="columns"
            item-key="id"
            :empty-message="$t('timeEntries.empty')"
            :sort="sort"
            @sort-change="handleSort"
            v-model="selectedRows"
            @selection-change="handleSelectionChange"
            :selectable="!disableSelection"
        >
            <template #cell:user="{ item }">
                {{ item.user ? `${item.user.initials}` : "-" }}
            </template>

            <template #cell:project="{ item }">
                <TruncateWithTooltip
                    :content="item.project?.name"
                    placement="right"
                    :disabled="!item.project?.name || item.project.name.length < 20"
                >
                    <span class="font-medium mr-2">{{ item.project?.projectNumber }}</span>
                    <span class="text-sm text-gray-600">{{
                        truncateText(item.project?.name, 20)
                    }}</span>
                </TruncateWithTooltip>
            </template>

            <template #cell:activityType="{ item }">
                {{ item.activityType?.code || "-" }}
            </template>

            <template #cell:date="{ item }">
                {{ formatDate(item.date) }}
            </template>

            <template #cell:duration="{ item }">
                {{ formatDuration(item.duration) }}
            </template>

            <template #cell:expenses="{ item }">
                {{ formatCurrency(item.expenses) }}
            </template>

            <template #cell:billed="{ item }">
                <input
                    type="checkbox"
                    :checked="item.billed"
                    @change="updateBilledStatus(item.id, !item.billed)"
                    @click.stop
                    :disabled="!canToggleBilled(item)"
                    :title="!canToggleBilled(item) ? $t('time.billedRestricted') : ''"
                    class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
            </template>

            <template #cell:disbursement="{ item }">
                <input
                    type="checkbox"
                    :checked="item.disbursement"
                    @change="updateDisbursementStatus(item.id, !item.disbursement)"
                    @click.stop
                    :disabled="isActivityLocked(item)"
                    :title="isActivityLocked(item) ? $t('time.locked') : ''"
                    class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
            </template>

            <template #cell:actions="{ item }">
                <div class="flex justify-end gap-2">
                    <slot name="actions" :item="item">
                        <Button
                            variant="ghost-primary"
                            size="sm"
                            @click="$emit('edit', item.id)"
                            :disabled="isBilledLocked(item)"
                            :title="isBilledLocked(item) ? $t('time.billedLocked') : ''"
                        >
                            {{ $t("common.edit") }}
                        </Button>
                    </slot>
                </div>
            </template>
        </DataTable>

        <!-- Totals section below the table -->
        <div v-if="totals" class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex flex-wrap gap-6 text-sm">
                <div v-if="totals.duration !== undefined" class="flex items-center gap-2">
                    <span class="font-semibold text-gray-700"
                        >{{ $t("time.columns.duration") }}:</span
                    >
                    <span class="text-gray-900">{{ formatDuration(totals.duration || 0) }}</span>
                </div>
                <div v-if="totals.kilometers !== undefined" class="flex items-center gap-2">
                    <span class="font-semibold text-gray-700"
                        >{{ $t("time.columns.kilometers") }}:</span
                    >
                    <span class="text-gray-900">{{ formatNumber(totals.kilometers || 0) }} km</span>
                </div>
                <div v-if="totals.expenses !== undefined" class="flex items-center gap-2">
                    <span class="font-semibold text-gray-700"
                        >{{ $t("time.columns.expenses") }}:</span
                    >
                    <span class="text-gray-900">{{ formatCurrency(totals.expenses || 0) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import DataTable, { type Column } from "@/components/molecules/DataTable.vue"
import Button from "@/components/atoms/Button.vue"
import { useFormat } from "@/composables/utils/useFormat"
import { useUpdateActivity } from "@/composables/api/useActivity"
import { useBulkUpdateActivities } from "@/composables/api/useActivityBulk"
import type { ActivityResponse } from "@beg/validations"
import { truncateText } from "@/utils/text"
import TruncateWithTooltip from "@/components/atoms/TruncateWithTooltip.vue"
import { useAlert } from "@/composables/utils/useAlert"
import { useAuthStore } from "@/stores/auth"
import { useActivityLock } from "@/composables/utils/useActivityLock"

const { isRole } = useAuthStore()
const { formatDuration, formatDate, formatNumber, formatCurrency } = useFormat()
const { t } = useI18n()
const { successAlert, errorAlert } = useAlert()
const { isActivityLocked, canToggleBilled, isBilledLocked } = useActivityLock()

interface Props {
    activities: ActivityResponse[]
    totals?: {
        duration: number
        kilometers: number
        expenses: number
    }
    editRoute?: string
    hideColumns?: string[]
    sort?: {
        key: string
        direction: "asc" | "desc"
    }
    disableSelection?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
    "sort-change": [sort: { key: string; direction: "asc" | "desc" }]
    edit: [activityId: number]
    "activities-updated": []
}>()

// API composables
const updateActivityApi = useUpdateActivity()
const bulkUpdateApi = useBulkUpdateActivities()

// Selection state
const selectedRows = ref<Set<string | number>>(new Set())
const dataTableRef = ref<any>(null)

const defaultColumns: Column[] = [
    { key: "date", label: t("time.columns.date"), sortKey: "date", width: "7rem" },
    { key: "user", label: t("time.columns.user"), sortKey: "userId", width: "3rem" },
    { key: "rateClass", label: t("time.columns.rateClass"), width: "3rem" },
    { key: "project", label: t("time.columns.project"), sortKey: "projectId", width: "11rem" },
    { key: "activityType", label: t("time.columns.activityType"), width: "4rem" },
    { key: "duration", label: t("time.columns.duration"), sortKey: "duration", width: "4rem" },
    {
        key: "kilometers",
        label: t("time.columns.kilometers"),
        sortKey: "kilometers",
        width: "4rem",
    },
    { key: "expenses", label: t("time.columns.expenses"), sortKey: "expenses", width: "5rem" },
    { key: "description", label: t("time.columns.description"), tooltip: true, fullWidth: true },
    { key: "billed", label: t("time.columns.billed"), size: "checkbox" as const },
    ...(isRole("admin")
        ? [
              {
                  key: "disbursement",
                  label: t("time.columns.disbursement"),
                  size: "checkbox" as const,
              },
          ]
        : []),
    { key: "actions", label: t("common.actions"), actions: true, size: "xs" as const },
]

const columns = computed(() => {
    if (!props.hideColumns || props.hideColumns.length === 0) {
        return defaultColumns
    }

    return defaultColumns.filter((col) => !props.hideColumns?.includes(col.key))
})

const handleSort = ({ key, direction }: { key: string; direction: "asc" | "desc" }) => {
    console.log(key, direction)
    emit("sort-change", { key, direction })
}

// Handle selection change from DataTable
const handleSelectionChange = (newSelection: Set<string | number>) => {
    selectedRows.value = newSelection
}

// Update billed status
const updateBilledStatus = async (activityId: number, billed: boolean) => {
    await updateActivityApi.put({
        params: { id: activityId },
        body: { billed },
    })
    emit("activities-updated")
    successAlert(billed ? t("time.alerts.markedAsBilled") : t("time.alerts.markedAsUnbilled"))
}

// Update disbursement status
const updateDisbursementStatus = async (activityId: number, disbursement: boolean) => {
    await updateActivityApi.put({
        params: { id: activityId },
        body: { disbursement },
    })
    emit("activities-updated")
    successAlert(
        disbursement
            ? t("time.alerts.markedAsDisbursement")
            : t("time.alerts.unmarkedAsDisbursement")
    )
}

// Bulk update selected rows
const updateSelectedRows = async (field: "billed" | "disbursement", value: boolean) => {
    const ids = Array.from(selectedRows.value).map((id) => Number(id))

    // Filter out locked activities and (for billed) activities without permission
    const selectedActivities = props.activities.filter((activity) => ids.includes(activity.id))
    const lockedActivities = selectedActivities.filter(
        (activity) => field === "billed" && !canToggleBilled(activity)
    )
    const editableIds = selectedActivities
        .filter((activity) => field !== "billed" || canToggleBilled(activity))
        .map((activity) => activity.id)

    // If there are locked activities, warn the user
    if (lockedActivities.length > 0) {
        errorAlert(
            t("time.alerts.lockedActivitiesSkipped", {
                count: lockedActivities.length,
                total: ids.length,
            })
        )
    }

    // If no editable activities, return early
    if (editableIds.length === 0) {
        return
    }

    const count = editableIds.length

    try {
        // Use bulk update endpoint with only editable activities
        await bulkUpdateApi.patch({
            body: {
                ids: editableIds,
                updates: { [field]: value },
            },
        })

        emit("activities-updated")
        clearSelection()

        // Show appropriate success message based on field and value
        if (field === "billed") {
            successAlert(
                value
                    ? t("time.alerts.bulkMarkedAsBilled", { count })
                    : t("time.alerts.bulkMarkedAsUnbilled", { count })
            )
        } else {
            successAlert(
                value
                    ? t("time.alerts.bulkMarkedAsDisbursement", { count })
                    : t("time.alerts.bulkUnmarkedAsDisbursement", { count })
            )
        }
    } catch (error) {
        errorAlert(t("time.alerts.bulkUpdateFailed"))
        console.error("Bulk update failed:", error)
    }
}

// Clear selection
const clearSelection = () => {
    dataTableRef.value?.clearSelection()
}

// Expose bulk update method for parent components
defineExpose({
    updateSelectedRows,
    selectedRows,
})
</script>
