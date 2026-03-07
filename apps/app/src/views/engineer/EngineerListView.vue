<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 class="text-2xl font-bold">{{ $t("engineer.title") }}</h1>
                <Button
                    v-if="isAdmin"
                    variant="primary"
                    @click="openCreateModal"
                    class="w-full sm:w-auto"
                >
                    {{ $t("engineer.new") }}
                </Button>
            </div>

            <!-- Filters -->
            <Card class="mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        v-model="filters.name"
                        :placeholder="$t('engineer.searchByName')"
                        @update:model-value="debouncedFetch"
                    />
                </div>
            </Card>

            <DataTable
                :items="engineers"
                :columns="columns"
                item-key="id"
                :empty-message="$t('engineer.empty')"
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
            <div v-if="engineerData && engineerData.totalPages > 1" class="mt-6">
                <Pagination
                    :current-page="currentPage"
                    :total-pages="engineerData.totalPages"
                    :total-items="engineerData.total"
                    :page-size="engineerData.limit"
                    @prev="engineerData.page > 1 && currentPage--"
                    @next="engineerData.page < engineerData.totalPages && currentPage++"
                    @go-to="(page) => (currentPage = page)"
                />
            </div>
        </div>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog
            v-model="showDeleteDialog"
            :title="$t('common.confirmDelete')"
            :message="$t('engineer.deleteConfirm', { name: currentEngineerToDelete?.name })"
            type="danger"
            :confirm-text="$t('common.delete')"
            :cancel-text="$t('common.cancel')"
            @confirm="deleteEngineer"
        />

        <!-- Engineer Edit Modal -->
        <EngineerEditModal
            v-model="showEditModal"
            :engineer-id="editingEngineerId"
            @saved="onEngineerSaved"
        />
    </LoadingOverlay>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useI18n } from "vue-i18n"
import Button from "@/components/atoms/Button.vue"
import Input from "@/components/atoms/Input.vue"
import DataTable from "@/components/molecules/DataTable.vue"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"
import Pagination from "@/components/organisms/Pagination.vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import EngineerEditModal from "@/components/organisms/engineer/EngineerEditModal.vue"
import Card from "@/components/atoms/Card.vue"
import { useFetchEngineerList, useDeleteEngineer } from "@/composables/api/useEngineer"
import { useAuthStore } from "@/stores/auth"
import { useAlert } from "@/composables/utils/useAlert"
import { formatDate } from "@/utils/date"
import type { Engineer, EngineerFilter } from "@beg/validations"
import { useRouter } from "vue-router"

const { t } = useI18n()
const authStore = useAuthStore()
const { successAlert } = useAlert()

// Check if user is admin
const isAdmin = computed(() => authStore.isRole("admin"))
const router = useRouter()
if (!isAdmin.value) {
    router.push({ name: "home" })
}
// Table columns
const columns = computed(() => {
    const baseColumns = [{ key: "name", label: t("engineer.name") }]
    baseColumns.push({ key: "actions", label: t("common.actions") })
    return baseColumns
})

// API composables
const { get: fetchEngineerListApi, loading, data: engineerData } = useFetchEngineerList()
const { delete: deleteEngineerApi, loading: deleting } = useDeleteEngineer()

// Data
const currentPage = ref(1)
const engineers = computed(() => engineerData?.value?.data || [])

// Filters
const filters = ref<EngineerFilter>({
    name: "",
    page: 1,
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
})

// Dialog state
const showDeleteDialog = ref(false)
const currentEngineerToDelete = ref<Engineer | null>(null)
const showEditModal = ref(false)
const editingEngineerId = ref<number | null>(null)

// Fetch engineers
const fetchEngineers = async (resetPage = false) => {
    if (resetPage) {
        currentPage.value = 1
    }
    await fetchEngineerListApi({
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
        fetchEngineers(true) // Reset to page 1 when filters change
    }, 300)
}

watch(currentPage, () => {
    fetchEngineers()
})

// Load engineers on mount
onMounted(() => {
    document.title = "BEG - Ingénieurs"
    fetchEngineers()
})

// Open delete confirmation dialog
const confirmDelete = (engineer: Engineer) => {
    currentEngineerToDelete.value = engineer
    showDeleteDialog.value = true
}

// Delete engineer
const deleteEngineer = async () => {
    if (!currentEngineerToDelete.value) return

    await deleteEngineerApi({ params: { id: currentEngineerToDelete.value.id } })
    successAlert(t("common.deleteSuccess", { name: currentEngineerToDelete.value.name }))
    showDeleteDialog.value = false
    await fetchEngineers() // Reload data
}

// Open create modal
const openCreateModal = () => {
    editingEngineerId.value = null
    showEditModal.value = true
}

// Open edit modal
const openEditModal = (engineer: Engineer) => {
    editingEngineerId.value = engineer.id
    showEditModal.value = true
}

// Handle engineer saved
const onEngineerSaved = async () => {
    await fetchEngineers()
}
</script>
