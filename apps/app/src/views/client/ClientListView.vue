<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 class="text-2xl font-bold">{{ $t("client.title") }}</h1>
                <Button
                    v-if="isAdmin"
                    variant="primary"
                    @click="openCreateModal"
                    class="w-full sm:w-auto"
                >
                    {{ $t("client.new") }}
                </Button>
            </div>

            <!-- Filters -->
            <Card class="mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        v-model="filters.name"
                        :placeholder="$t('client.searchByName')"
                        @update:model-value="debouncedFetch"
                    />
                </div>
            </Card>

            <DataTable
                :items="clients"
                :columns="columns"
                item-key="id"
                :empty-message="$t('client.empty')"
            >
                <template #cell:createdAt="{ item }">
                    {{ formatDate(item.createdAt) }}
                </template>

                <template #cell:actions="{ item }">
                    <div v-if="isAdmin" class="flex justify-end gap-2">
                        <Button variant="ghost-primary" size="sm" @click="openEditModal(item)">
                            {{ $t("common.edit") }}
                        </Button>
                        <Button
                            size="sm"
                            @click="confirmDelete(item)"
                            :disabled="deleting"
                            variant="ghost-danger"
                        >
                            {{ $t("common.delete") }}
                        </Button>
                    </div>
                </template>
            </DataTable>

            <!-- Pagination -->
            <div v-if="clientData && clientData.totalPages > 1" class="mt-6">
                <Pagination
                    :current-page="currentPage"
                    :total-pages="clientData.totalPages"
                    :total-items="clientData.total"
                    :page-size="clientData.limit"
                    @prev="clientData.page > 1 && currentPage--"
                    @next="clientData.page < clientData.totalPages && currentPage++"
                    @go-to="(page) => (currentPage = page)"
                />
            </div>
        </div>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog
            v-model="showDeleteDialog"
            :title="$t('common.confirmDelete')"
            :message="$t('client.deleteConfirm', { name: currentClientToDelete?.name })"
            type="danger"
            :confirm-text="$t('common.delete')"
            :cancel-text="$t('common.cancel')"
            @confirm="deleteClient"
        />

        <!-- Client Edit Modal -->
        <ClientEditModal
            v-model="showEditModal"
            :client-id="editingClientId"
            @saved="onClientSaved"
        />
    </LoadingOverlay>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useI18n } from "vue-i18n"
import Button from "@/components/atoms/Button.vue"
import Input from "@/components/atoms/Input.vue"
import DataTable, { type Column } from "@/components/molecules/DataTable.vue"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"
import Pagination from "@/components/organisms/Pagination.vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import ClientEditModal from "@/components/organisms/client/ClientEditModal.vue"
import Card from "@/components/atoms/Card.vue"
import { useFetchClientList, useDeleteClient } from "@/composables/api/useClient"
import { useAuthStore } from "@/stores/auth"
import { useAlert } from "@/composables/utils/useAlert"
import { formatDate } from "@/utils/date"
import type { Client, ClientFilter } from "@beg/validations"

const { t } = useI18n()
const authStore = useAuthStore()
const { successAlert } = useAlert()

// Check if user is admin
const isAdmin = computed(() => authStore.isRole("admin"))

// Table columns
const columns: Column[] = [
    { key: "name", label: t("client.name"), width: "w-1/2" as const },
    { key: "actions", label: t("common.actions") },
]

// API composables
const { get: fetchClientListApi, loading, data: clientData } = useFetchClientList()
const { delete: deleteClientApi, loading: deleting } = useDeleteClient()

// Data
const currentPage = ref(1)
const clients = computed(() => clientData?.value?.data || [])

// Filters
const filters = ref<ClientFilter>({
    name: "",
    page: 1,
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
})

// Dialog state
const showDeleteDialog = ref(false)
const currentClientToDelete = ref<Client | null>(null)
const showEditModal = ref(false)
const editingClientId = ref<number | null>(null)

// Fetch clients
const fetchClients = async (resetPage = false) => {
    if (resetPage) {
        currentPage.value = 1
    }
    await fetchClientListApi({
        query: {
            ...filters.value,
            page: currentPage.value,
        },
    })
}

// Simple debounce implementation
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const debouncedFetch = () => {
    if (debounceTimer) {
        clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
        fetchClients(true) // Reset to page 1 when filters change
    }, 300)
}

watch(currentPage, () => {
    fetchClients()
})

// Load clients on mount
onMounted(() => {
    document.title = "BEG - Clients"
    fetchClients()
})

// Open delete confirmation dialog
const confirmDelete = (client: Client) => {
    currentClientToDelete.value = client
    showDeleteDialog.value = true
}

// Delete client
const deleteClient = async () => {
    if (!currentClientToDelete.value) return

    await deleteClientApi({ params: { id: currentClientToDelete.value.id } })
    successAlert(t("common.deleteSuccess", { name: currentClientToDelete.value.name }))
    showDeleteDialog.value = false
    await fetchClients() // Reload data
}

// Open create modal
const openCreateModal = () => {
    editingClientId.value = null
    showEditModal.value = true
}

// Open edit modal
const openEditModal = (client: Client) => {
    editingClientId.value = client.id
    showEditModal.value = true
}

// Handle client saved
const onClientSaved = async () => {
    await fetchClients()
}
</script>
