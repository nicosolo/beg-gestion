<template>
    <div class="bg-indigo-50 p-4 border border-gray-200 rounded-lg mb-6">
        <div class="flex flex-col lg:flex-row gap-4">
            <!-- Left section: Filters -->
            <div class="flex-1">
                <!-- Row 1: Status, In Charge, Visa User, Sort -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="form-group">
                        <Label>{{ $t("invoice.status.title") }}</Label>
                        <InvoiceStatusSelect
                            :model-value="filterData.status || undefined"
                            allow-deselect
                            @update:model-value="filterData.status = $event || ''; emitChange()"
                        />
                    </div>
                    <div class="form-group">
                        <Label>{{ $t("invoice.inChargeUser") }}</Label>
                        <UserSelect
                            id="inChargeUserIdFilter"
                            v-model="filterData.inChargeUserId"
                            :placeholder="$t('common.all')"
                            @update:model-value="emitChange"
                        />
                    </div>
                    <div class="form-group" v-if="isRole('admin')">
                        <Label>{{ $t("invoice.visaByUser") }}</Label>
                        <UserSelect
                            id="visaByUserIdFilter"
                            v-model="filterData.visaByUserId"
                            :roles="['super_admin', 'admin', 'user_visa']"
                            :placeholder="$t('common.all')"
                            @update:model-value="emitChange"
                        />
                    </div>
                    <div class="form-group">
                        <Label>{{ $t("projects.filters.sortBy") }}</Label>
                        <div class="flex gap-2">
                            <Select
                                v-model="filterData.sortBy"
                                :options="sortByOptions"
                                @update:model-value="emitChange"
                            />
                            <Select
                                v-model="filterData.sortOrder"
                                :options="sortOrderOptions"
                                @update:model-value="emitChange"
                            />
                        </div>
                    </div>
                </div>

                <!-- Row 2: Date Range -->
                <div class="mt-4">
                    <DateRange
                        :from-date="filterData.fromDate"
                        :to-date="filterData.toDate"
                        :from-label="$t('invoice.filters.fromDate')"
                        :to-label="$t('invoice.filters.toDate')"
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

                <div class="mt-4">
                    <Button @click="resetFilters" variant="secondary">
                        {{ $t("common.resetFilters") }}
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import Label from "@/components/atoms/Label.vue"
import Select from "@/components/atoms/Select.vue"
import Button from "@/components/atoms/Button.vue"
import DateRange from "@/components/molecules/DateRange.vue"
import UserSelect from "@/components/organisms/user/UserSelect.vue"
import InvoiceStatusSelect from "@/components/organisms/invoice/InvoiceStatusSelect.vue"
import type { InvoiceStatus } from "@beg/validations"
import { useI18n } from "vue-i18n"
import { useAuthStore } from "@/stores/auth"

const { isRole } = useAuthStore()

export type InvoiceSortBy = "date" | "reference" | "total" | "status" | "inChargeUser"
export type SortOrder = "asc" | "desc"

export interface InvoiceFilterModel {
    status: InvoiceStatus | ""
    visaByUserId: number | null
    inChargeUserId: number | null
    fromDate?: Date
    toDate?: Date
    sortBy: InvoiceSortBy
    sortOrder: SortOrder
}

interface InvoiceFilterProps {
    filter: InvoiceFilterModel
}

const { t } = useI18n()

const props = defineProps<InvoiceFilterProps>()

const emit = defineEmits<{
    (e: "update:filter", filter: InvoiceFilterModel): void
}>()

// Create reactive copy of the filter
const filterData = reactive<InvoiceFilterModel>({
    status: props.filter.status,
    visaByUserId: props.filter.visaByUserId,
    inChargeUserId: props.filter.inChargeUserId,
    fromDate: props.filter.fromDate,
    toDate: props.filter.toDate,
    sortBy: props.filter.sortBy,
    sortOrder: props.filter.sortOrder,
})

// Sort options
const sortByOptions = [
    { value: "date", label: t("invoice.issueDate") },
    { value: "reference", label: t("invoice.invoiceNumber") },
    { value: "total", label: t("invoice.totalTTC") },
    { value: "status", label: t("invoice.status.title") },
]

const sortOrderOptions = [
    { value: "asc", label: t("projects.filters.ascending") },
    { value: "desc", label: t("projects.filters.descending") },
]

// Watch for external filter changes
watch(
    () => props.filter,
    (newFilter) => {
        filterData.status = newFilter.status
        filterData.visaByUserId = newFilter.visaByUserId
        filterData.inChargeUserId = newFilter.inChargeUserId
        filterData.fromDate = newFilter.fromDate
        filterData.toDate = newFilter.toDate
        filterData.sortBy = newFilter.sortBy
        filterData.sortOrder = newFilter.sortOrder
    },
    { deep: true }
)

// Emit methods
const emitChange = () => {
    emit("update:filter", { ...filterData })
}

// Reset filters
const resetFilters = () => {
    filterData.status = ""
    filterData.visaByUserId = null
    filterData.inChargeUserId = null
    filterData.fromDate = undefined
    filterData.toDate = undefined
    filterData.sortBy = "date"
    filterData.sortOrder = "desc"
    emitChange()
}
</script>
