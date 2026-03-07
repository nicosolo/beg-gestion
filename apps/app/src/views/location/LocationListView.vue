<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 class="text-2xl font-bold">{{ $t("location.title") }}</h1>
                <Button
                    v-if="isAdmin"
                    variant="primary"
                    @click="openCreateModal"
                    class="w-full sm:w-auto"
                >
                    {{ $t("location.new") }}
                </Button>
            </div>

            <!-- Filters -->
            <Card class="mb-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        v-model="filters.name"
                        :placeholder="$t('common.searchByName')"
                        @update:model-value="debouncedFetch"
                    />

                    <CountrySelect
                        v-model="filters.country"
                        :placeholder="$t('location.selectCountry')"
                        @update:model-value="() => fetchLocations(true)"
                    />

                    <CantonSelect
                        v-if="filters.country === 'CH' || !filters.country"
                        v-model="filters.canton"
                        :placeholder="$t('location.selectCanton')"
                        @update:model-value="() => fetchLocations(true)"
                    />
                </div>
            </Card>

            <DataTable
                :items="locations"
                :columns="columns"
                item-key="id"
                :empty-message="$t('location.empty')"
            >
                <template #cell:country="{ item }">
                    {{ item.country }}
                </template>

                <template #cell:canton="{ item }">
                    {{
                        item.canton ? SWISS_CANTONS[item.canton as keyof typeof SWISS_CANTONS] : "-"
                    }}
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
            <div v-if="locationData && locationData.totalPages > 1" class="mt-6">
                <Pagination
                    :current-page="currentPage"
                    :total-pages="locationData.totalPages"
                    :total-items="locationData.total"
                    :page-size="locationData.limit"
                    @prev="locationData.page > 1 && currentPage--"
                    @next="locationData.page < locationData.totalPages && currentPage++"
                    @go-to="(page) => (currentPage = page)"
                />
            </div>
        </div>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog
            v-model="showDeleteDialog"
            :title="$t('common.confirmDelete')"
            :message="$t('location.deleteConfirm', { name: currentLocationToDelete?.name })"
            type="danger"
            :confirm-text="$t('common.delete')"
            :cancel-text="$t('common.cancel')"
            @confirm="deleteLocation"
        />

        <!-- Location Edit Modal -->
        <LocationEditModal
            v-model="showEditModal"
            :location-id="editingLocationId"
            @saved="onLocationSaved"
        />
    </LoadingOverlay>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useI18n } from "vue-i18n"
import Button from "@/components/atoms/Button.vue"
import Input from "@/components/atoms/Input.vue"
import CountrySelect from "@/components/atoms/CountrySelect.vue"
import CantonSelect from "@/components/atoms/CantonSelect.vue"
import DataTable from "@/components/molecules/DataTable.vue"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"
import Pagination from "@/components/organisms/Pagination.vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import LocationEditModal from "@/components/organisms/location/LocationEditModal.vue"
import { useFetchLocationList, useDeleteLocation } from "@/composables/api/useLocation"
import { useAuthStore } from "@/stores/auth"
import { SWISS_CANTONS, type Location, type LocationFilter } from "@beg/validations"
import Card from "@/components/atoms/Card.vue"
import { useAlert } from "@/composables/utils/useAlert"

const { t } = useI18n()
const authStore = useAuthStore()
const { successAlert } = useAlert()
// Check if user is admin
const isAdmin = computed(() => authStore.isRole("admin"))

// Table columns
const columns = [
    { key: "name", label: t("location.name"), width: "w-1/4" as const },
    { key: "country", label: t("location.country"), width: "w-1/6" as const },
    { key: "canton", label: t("location.canton"), width: "w-1/6" as const },
    { key: "region", label: t("location.region"), width: "w-1/6" as const },
    { key: "actions", label: t("common.actions") },
]

// API composables
const { get: fetchLocationListApi, loading, data: locationData } = useFetchLocationList()
const { delete: deleteLocationApi, loading: deleting } = useDeleteLocation()
const currentPage = ref(1)
// Data

const locations = computed(() => locationData?.value?.data || [])

// Filters
const filters = ref<LocationFilter>({
    name: "",
    country: undefined,
    canton: undefined,
    page: 1,
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
})

// Dialog state
const showDeleteDialog = ref(false)
const currentLocationToDelete = ref<Location | null>(null)
const showEditModal = ref(false)
const editingLocationId = ref<number | null>(null)

// Fetch locations
const fetchLocations = async (resetPage = false) => {
    if (resetPage) {
        currentPage.value = 1
    }
    await fetchLocationListApi({
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
        fetchLocations(true) // Reset to page 1 when filters change
    }, 300)
}

watch(currentPage, () => {
    fetchLocations()
})

// Clear canton when country changes from CH
watch(
    () => filters.value.country,
    (newCountry, oldCountry) => {
        if (oldCountry === "CH" && newCountry !== "CH") {
            filters.value.canton = undefined
        }
    }
)

// Load locations on mount
onMounted(() => {
    document.title = "BEG - Lieux"
    fetchLocations()
})

// Open delete confirmation dialog
const confirmDelete = (location: Location) => {
    currentLocationToDelete.value = location
    showDeleteDialog.value = true
}

// Delete location
const deleteLocation = async () => {
    if (!currentLocationToDelete.value) return

    await deleteLocationApi({ params: { id: currentLocationToDelete.value.id } })
    successAlert(t("common.deleteSuccess", { name: currentLocationToDelete.value.name }))
    showDeleteDialog.value = false
    await fetchLocations() // Reload data
}

// Open create modal
const openCreateModal = () => {
    editingLocationId.value = null
    showEditModal.value = true
}

// Open edit modal
const openEditModal = (location: Location) => {
    editingLocationId.value = location.id
    showEditModal.value = true
}

// Handle location saved
const onLocationSaved = async () => {
    await fetchLocations()
}
</script>
