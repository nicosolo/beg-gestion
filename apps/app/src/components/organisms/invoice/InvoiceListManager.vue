<template>
    <div>
        <div class="mb-4" v-if="!hideHeader">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 class="text-lg font-semibold">{{ $t("invoice.title") }}</h2>
                <div class="flex flex-wrap gap-2 justify-start sm:justify-end">
                    <DropdownMenu>
                        <template #trigger="{ toggle }">
                            <Button
                                variant="secondary"
                                size="md"
                                class="w-full sm:w-auto"
                                :disabled="exportLoading"
                                @click="toggle"
                            >
                                {{
                                    exportLoading
                                        ? $t("invoice.export.exporting")
                                        : $t("invoice.export.button")
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
                                {{ $t("invoice.export.all") }}
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
                                {{ $t("invoice.export.perUser") }}
                            </button>
                        </template>
                    </DropdownMenu>
                    <Button
                        variant="primary"
                        size="md"
                        class="w-full sm:w-auto"
                        :to="{
                            name: 'invoice-new',
                            query: { projectId: initialFilter?.projectId },
                        }"
                    >
                        {{ $t("invoice.new") }}
                    </Button>
                </div>
            </div>
        </div>

        <!-- Filters -->
        <InvoiceFilterPanel :filter="filters" @update:filter="onFilterChange" />

        <LoadingOverlay :loading="loading">
            <div v-if="error" class="mb-4 p-4 bg-red-100 text-red-700 rounded">
                {{ $t("errors.loadingData") }}: {{ error }}
            </div>

            <DataTable
                :items="invoices"
                :columns="visibleColumns"
                item-key="id"
                :empty-message="emptyMessage"
                :loading="loading"
                :sort="currentSort"
                @sort-change="onSortChange"
                mobile-breakpoint="lg"
            >
                <template #cell:invoiceNumber="{ item }">
                    {{ item.invoiceNumber || item.reference || "-" }}
                </template>
                <template #cell:client="{ item }">
                    {{ item.project?.client?.name }}
                </template>
                <template #cell:project="{ item }">
                    {{ item.project?.projectNumber || "-" }}
                </template>

                <template #cell:description="{ item }">
                    {{ item.description || "-" }}
                </template>

                <template #cell:issueDate="{ item }">
                    {{ formatDate(item.issueDate) }}
                </template>

                <template #cell:totalTTC="{ item }">
                    {{ formatCurrency(item.totalTTC) }}
                </template>

                <template #cell:status="{ item }">
                    <div class="flex items-center gap-2">
                        <Badge :variant="getStatusVariant(item.status)">
                            {{ $t(`invoice.status.${item.status}`) }}
                        </Badge>
                        <span
                            v-if="item.status === 'vise' && isAdmin"
                            class="inline-flex relative group"
                        >
                            <button
                                class="p-1 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50 cursor-pointer"
                                :disabled="markingSentId === item.id"
                                @click.stop="pendingSentId = item.id"
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                            </button>
                            <span
                                class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-gray-700 px-2 py-1 text-xs text-white shadow"
                            >
                                {{ $t("invoice.sendAction") }}
                            </span>
                        </span>
                    </div>
                </template>

                <template #cell:inChargeUser="{ item }">
                    {{ item.inChargeUser?.initials || "-" }}
                </template>

                <template #cell:actions="{ item }">
                    <div class="flex justify-end gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            :to="{ name: 'invoice-preview', params: { id: item.id } }"
                        >
                            {{ $t("common.view") }}
                        </Button>
                        <Button
                            variant="ghost-primary"
                            size="sm"
                            :to="{ name: 'invoice-edit', params: { id: item.id } }"
                        >
                            {{ $t("common.edit") }}
                        </Button>
                    </div>
                </template>
            </DataTable>

            <ConfirmDialog
                v-model="showSentConfirm"
                :title="$t('invoice.markAsSent')"
                :message="$t('invoice.confirmMarkAsSent')"
                :confirm-text="$t('common.confirm')"
                :cancel-text="$t('common.cancel')"
                @confirm="markAsSent"
                @cancel="pendingSentId = null"
            />

            <Pagination
                v-if="totalCount > 0"
                :current-page="currentPage"
                :total-pages="totalPages"
                :total-items="totalCount"
                :page-size="itemsPerPage"
                @prev="currentPage > 1 && loadInvoices(currentPage - 1)"
                @next="currentPage < totalPages && loadInvoices(currentPage + 1)"
                @go-to="loadInvoices"
            />
        </LoadingOverlay>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onActivated } from "vue"
import { useI18n } from "vue-i18n"
import Button from "@/components/atoms/Button.vue"
import Badge from "@/components/atoms/Badge.vue"
import DropdownMenu from "@/components/atoms/DropdownMenu.vue"
import DataTable, { type Column } from "@/components/molecules/DataTable.vue"
import Pagination from "@/components/organisms/Pagination.vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import InvoiceFilterPanel, {
    type InvoiceFilterModel,
    type InvoiceSortBy,
    type SortOrder,
} from "@/components/organisms/invoice/InvoiceFilterPanel.vue"
import {
    useFetchInvoiceList,
    useUpdateInvoice,
    useExportInvoices,
} from "@/composables/api/useInvoice"
import { useAlert } from "@/composables/utils/useAlert"
import type { InvoiceFilter } from "@beg/validations"
import { useFormat } from "@/composables/utils/useFormat"
import { useExcelExport } from "@/composables/utils/useExcelExport"
import { useAuthStore } from "@/stores/auth"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"

interface Props {
    emptyMessage?: string
    showProjectFilter?: boolean
    initialFilter?: Partial<InvoiceFilter>
    hideColumns?: string[]
    hideHeader?: boolean
    showDelete?: boolean
}
const { formatDate, formatCurrency } = useFormat()
const props = withDefaults(defineProps<Props>(), {
    emptyMessage: "Aucune facture trouvée",
    showProjectFilter: true,
    hideHeader: false,
    showDelete: true,
})

const { t } = useI18n()
const { errorAlert, successAlert } = useAlert()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isRole("admin"))
const { put: updateInvoice } = useUpdateInvoice()
const pendingSentId = ref<number | null>(null)
const markingSentId = ref<number | null>(null)
const showSentConfirm = computed({
    get: () => pendingSentId.value !== null,
    set: (v) => {
        if (!v) pendingSentId.value = null
    },
})

// Filter state
const filters = reactive<InvoiceFilterModel>({
    status: "",
    visaByUserId: null,
    inChargeUserId: null,
    fromDate: undefined,
    toDate: undefined,
    sortBy: "date",
    sortOrder: "desc",
})

// Computed sort for DataTable
const currentSort = computed(() => ({
    key: sortByToKey(filters.sortBy),
    direction: filters.sortOrder,
}))

// Map sortBy values to column keys
const sortByToKey = (sortBy: InvoiceSortBy): string => {
    const map: Record<InvoiceSortBy, string> = {
        date: "issueDate",
        reference: "invoiceNumber",
        total: "totalTTC",
        status: "status",
        inChargeUser: "inChargeUser",
    }
    return map[sortBy]
}

// Map column keys back to sortBy values
const keyToSortBy = (key: string): InvoiceSortBy => {
    const map: Record<string, InvoiceSortBy> = {
        issueDate: "date",
        invoiceNumber: "reference",
        totalTTC: "total",
        status: "status",
        inChargeUser: "inChargeUser",
    }
    return map[key] || "date"
}

// Handle sort change from table header click
const onSortChange = (sort: { key: string; direction: "asc" | "desc" }) => {
    filters.sortBy = keyToSortBy(sort.key)
    filters.sortOrder = sort.direction as SortOrder
    currentPage.value = 1
    loadInvoices()
}

// Handle filter changes from InvoiceFilterPanel
const onFilterChange = (newFilters: InvoiceFilterModel) => {
    filters.status = newFilters.status
    filters.visaByUserId = newFilters.visaByUserId
    filters.inChargeUserId = newFilters.inChargeUserId
    filters.fromDate = newFilters.fromDate
    filters.toDate = newFilters.toDate
    filters.sortBy = newFilters.sortBy
    filters.sortOrder = newFilters.sortOrder
    currentPage.value = 1
    loadInvoices()
}

// Define all possible columns with sortKey for sortable columns
const allColumns: Column[] = [
    {
        key: "invoiceNumber",
        label: t("invoice.invoiceNumber"),
        size: "lg" as const,
        sortKey: "invoiceNumber",
    },
    { key: "client", label: t("projects.client"), size: "name" as const },
    { key: "project", label: "N° Mandat", size: "2xs" as const },
    { key: "reference", label: "Objet", size: "flex" as const, tooltip: true },
    {
        key: "issueDate",
        label: t("invoice.issueDate"),
        size: "date" as const,
        sortKey: "issueDate",
    },
    { key: "totalTTC", label: t("invoice.totalTTC"), size: "amount" as const, sortKey: "totalTTC" },
    { key: "status", label: t("invoice.status.title"), size: "status" as const, sortKey: "status" },
    {
        key: "inChargeUser",
        label: t("invoice.inChargeUser"),
        size: "2xs" as const,
        sortKey: "inChargeUser",
    },
    { key: "actions", label: t("common.actions"), size: "action" as const },
]

// Compute visible columns based on hideColumns prop
const visibleColumns = computed(() => {
    return allColumns.filter((col) => !props.hideColumns?.includes(col.key))
})

const { get: fetchInvoices, loading, error, data: invoicesData } = useFetchInvoiceList()
const { get: exportInvoices, loading: exportLoading } = useExportInvoices()
const { exportToExcel } = useExcelExport()

const invoices = computed(() => invoicesData.value?.data || [])
const totalCount = computed(() => invoicesData.value?.total || 0)
const totalPages = computed(
    () => invoicesData.value?.totalPages || Math.ceil(totalCount.value / itemsPerPage.value)
)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(50)

// Load invoices
const loadInvoices = async (page?: number) => {
    if (page) currentPage.value = page

    try {
        const query: Record<string, unknown> = {
            page: currentPage.value,
            limit: itemsPerPage.value,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            ...props.initialFilter,
        }

        // Add filters if set
        if (filters.status) {
            query.status = filters.status
        }
        if (filters.visaByUserId) {
            query.visaByUserId = filters.visaByUserId
        }
        if (filters.inChargeUserId) {
            query.inChargeUserId = filters.inChargeUserId
        }
        if (filters.fromDate) {
            query.fromDate = filters.fromDate
        }
        if (filters.toDate) {
            query.toDate = filters.toDate
        }

        await fetchInvoices({ query })
    } catch (err) {
        console.error("Failed to load invoices:", err)
        errorAlert(t("errors.loadingData"))
    }
}

const handleExport = async (perUser: boolean = false) => {
    const query: Record<string, unknown> = {
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        perUser,
        ...props.initialFilter,
    }
    if (filters.status) query.status = filters.status
    if (filters.visaByUserId) query.visaByUserId = filters.visaByUserId
    if (filters.inChargeUserId) query.inChargeUserId = filters.inChargeUserId
    if (filters.fromDate) query.fromDate = filters.fromDate
    if (filters.toDate) query.toDate = filters.toDate

    const arrayBuffer = await exportInvoices({ query })

    const today = new Date().toISOString().split("T")[0]
    const filename = `factures-${today}.xlsx`

    await exportToExcel(arrayBuffer, filename)
}

const markAsSent = async () => {
    if (!pendingSentId.value) return
    markingSentId.value = pendingSentId.value
    try {
        await updateInvoice({
            params: { id: pendingSentId.value },
            body: { status: "sent", visaByUserId: authStore.user?.id },
        })
        successAlert(t("invoice.markedAsSent"))
        loadInvoices()
    } catch {
        // error shown by useAPI
    } finally {
        markingSentId.value = null
        pendingSentId.value = null
    }
}

// Load initial data
onActivated(() => {
    loadInvoices()
})

onMounted(() => {
    loadInvoices()
})
const getStatusVariant = (status: string): "success" | "error" | "warning" | "info" | undefined => {
    const variants = {
        sent: "info",
        draft: undefined,
        controle: "warning",
        vise: "success",
    } as Record<string, "success" | "error" | "warning" | "info" | undefined>

    return variants[status] || undefined
}

// Expose methods that parent components might need
defineExpose({
    loadInvoices,
    handleExport,
    exportLoading,
})
</script>
