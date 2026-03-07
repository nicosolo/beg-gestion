<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 class="text-2xl font-bold">Liste des tarifs</h1>
                <Button variant="primary" @click="openCreateDialog" class="w-full sm:w-auto">
                    Nouveau tarif
                </Button>
            </div>

            <DataTable
                :items="ratesData || []"
                :columns="columns"
                item-key="id"
                empty-message="Aucun tarif trouvé"
            >
                <template #cell:amount="{ item }">
                    {{ formatCurrency(item.amount) }}
                </template>

                <template #cell:actions="{ item }">
                    <div class="flex justify-end gap-2">
                        <Button variant="ghost-primary" size="sm" @click="openEditDialog(item)">
                            Modifier
                        </Button>
                        <Button
                            variant="ghost-danger"
                            size="sm"
                            @click="confirmDelete(item)"
                            :disabled="deletingRate"
                        >
                            Supprimer
                        </Button>
                    </div>
                </template>
            </DataTable>
        </div>

        <!-- Create/Edit Dialog -->
        <Dialog v-model="showDialog" :title="dialogTitle" size="md">
            <TariffForm
                :tariff="selectedTariff"
                :loading="savingRate"
                @submit="handleSave"
                @cancel="closeDialog"
            />
        </Dialog>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog
            v-model="showDeleteDialog"
            title="Confirmer la suppression"
            :message="`Êtes-vous sûr de vouloir supprimer le tarif ${tariffToDelete?.class} (${tariffToDelete?.year}) ?`"
            type="danger"
            confirm-text="Supprimer"
            cancel-text="Annuler"
            @confirm="deleteTariff"
        />
    </LoadingOverlay>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import Button from "@/components/atoms/Button.vue"
import DataTable, { type Column } from "@/components/molecules/DataTable.vue"
import Dialog from "@/components/molecules/Dialog.vue"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import TariffForm from "@/components/organisms/TariffForm.vue"
import {
    useFetchRates,
    useCreateRate,
    useUpdateRate,
    useDeleteRate,
} from "@/composables/api/useRate"
import { useAlert } from "@/composables/utils/useAlert"
import type { RateClassSchema, ClassSchema } from "@beg/validations"

// API composables
const { get: fetchRates, loading, data: ratesData } = useFetchRates()
const { post: createRate, loading: creatingRate } = useCreateRate()
const { put: updateRate, loading: updatingRate } = useUpdateRate()
const { delete: deleteRate, loading: deletingRate } = useDeleteRate()

// Alert composable
const { successAlert, errorAlert } = useAlert()

// State
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedTariff = ref<RateClassSchema | null>(null)
const tariffToDelete = ref<RateClassSchema | null>(null)

// Computed
const savingRate = computed(() => creatingRate.value || updatingRate.value)
const dialogTitle = computed(() => (selectedTariff.value ? "Modifier le tarif" : "Nouveau tarif"))

const columns: Column[] = [
    { key: "id", label: "ID", size: "id" as const },
    { key: "class", label: "Classe", size: "flex" as const },
    { key: "year", label: "Année", size: "sm" as const },
    { key: "amount", label: "Tarif", size: "amount" as const },
    { key: "actions", label: "Actions", size: "action" as const, actions: true },
]

// Load rates on mount
onMounted(async () => {
    document.title = "BEG - Tarifs"
    await fetchRates({})
})

// Dialog handlers
const openCreateDialog = () => {
    selectedTariff.value = null
    showDialog.value = true
}

const openEditDialog = (tariff: RateClassSchema) => {
    selectedTariff.value = tariff
    showDialog.value = true
}

const closeDialog = () => {
    showDialog.value = false
    selectedTariff.value = null
}

// Save handler
const handleSave = async (data: { class: ClassSchema; year: number; amount: number }) => {
    if (selectedTariff.value) {
        // Update existing tariff
        await updateRate({
            params: { id: selectedTariff.value.id },
            body: data,
        })
        successAlert(`Tarif ${data.class} (${data.year}) modifié avec succès`)
    } else {
        // Create new tariff
        await createRate({
            body: data,
        })
        successAlert(`Tarif ${data.class} (${data.year}) créé avec succès`)
    }

    // Reload data and close dialog
    await fetchRates({})
    closeDialog()
}

// Delete handlers
const confirmDelete = (tariff: RateClassSchema) => {
    tariffToDelete.value = tariff
    showDeleteDialog.value = true
}

const deleteTariff = async () => {
    if (!tariffToDelete.value) return

    try {
        await deleteRate({ params: { id: tariffToDelete.value.id } })
        successAlert(
            `Tarif ${tariffToDelete.value.class} (${tariffToDelete.value.year}) supprimé avec succès`
        )
        await fetchRates({}) // Reload data
        showDeleteDialog.value = false
        tariffToDelete.value = null
    } catch (error) {
        showDeleteDialog.value = false
    }
}

// Format currency
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("fr-CH", {
        style: "currency",
        currency: "CHF",
        minimumFractionDigits: 0,
    }).format(value)
}
</script>
