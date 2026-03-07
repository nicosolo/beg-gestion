<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 class="text-2xl font-bold">{{ $t("navigation.activities") }}</h1>
                <Button variant="primary" @click="openCreateDialog" class="w-full sm:w-auto">
                    Nouvelle activité
                </Button>
            </div>

            <DataTable
                :items="activityTypes || []"
                :columns="columns"
                item-key="id"
                empty-message="Aucun type d'activité trouvé"
                mobile-breakpoint="lg"
            >
                <template #cell:billable="{ item }">
                    <span :class="item.billable ? 'text-green-600' : 'text-red-600'">
                        {{ item.billable ? "Facturable" : "Non facturable" }}
                    </span>
                </template>

                <template #cell:adminOnly="{ item }">
                    <span :class="item.adminOnly ? 'text-orange-600' : 'text-gray-400'">
                        {{ item.adminOnly ? "Oui" : "Non" }}
                    </span>
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
                            :disabled="deletingActivityType"
                        >
                            Supprimer
                        </Button>
                    </div>
                </template>
            </DataTable>
        </div>

        <!-- Create/Edit Dialog -->
        <Dialog v-model="showDialog" :title="dialogTitle" size="md">
            <ActivityTypeForm
                :activity-type="selectedActivityType"
                :loading="savingActivityType"
                @submit="handleSave"
                @cancel="closeDialog"
            />
        </Dialog>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog
            v-model="showDeleteDialog"
            title="Confirmer la suppression"
            :message="`Êtes-vous sûr de vouloir supprimer le type d'activité '${activityTypeToDelete?.name}' ?`"
            type="danger"
            confirm-text="Supprimer"
            cancel-text="Annuler"
            @confirm="deleteActivityType"
        />
    </LoadingOverlay>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import Button from "@/components/atoms/Button.vue"
import DataTable from "@/components/molecules/DataTable.vue"
import Dialog from "@/components/molecules/Dialog.vue"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import ActivityTypeForm from "@/components/organisms/ActivityTypeForm.vue"
import {
    useFetchActivityTypes,
    useCreateActivityType,
    useUpdateActivityType,
    useDeleteActivityType,
} from "@/composables/api/useActivityType"
import { useAlert } from "@/composables/utils/useAlert"
import type { ActivityTypeResponse } from "@beg/validations"

// API composables
const { get: fetchActivityTypes, loading, data: activityTypes } = useFetchActivityTypes()
const { post: createActivityType, loading: creatingActivityType } = useCreateActivityType()
const { put: updateActivityType, loading: updatingActivityType } = useUpdateActivityType()
const { delete: deleteActivityTypeApi, loading: deletingActivityType } = useDeleteActivityType()

// Alert composable
const { successAlert } = useAlert()

// State
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedActivityType = ref<ActivityTypeResponse | null>(null)
const activityTypeToDelete = ref<ActivityTypeResponse | null>(null)

// Computed
const savingActivityType = computed(() => creatingActivityType.value || updatingActivityType.value)
const dialogTitle = computed(() =>
    selectedActivityType.value ? "Modifier l'activité" : "Nouvelle activité"
)

const columns = [
    { key: "id", label: "ID", size: "id" as const },
    { key: "name", label: "Nom", size: "flex" as const },
    { key: "code", label: "Code", size: "sm" as const },
    { key: "billable", label: "Facturable", size: "sm" as const },
    { key: "adminOnly", label: "Admin", size: "sm" as const },
    { key: "actions", label: "Actions", size: "action" as const, actions: true },
]

// Load activity types on mount
onMounted(async () => {
    document.title = "BEG - Activités"
    await fetchActivityTypes()
})

// Dialog handlers
const openCreateDialog = () => {
    selectedActivityType.value = null
    showDialog.value = true
}

const openEditDialog = (activityType: ActivityTypeResponse) => {
    selectedActivityType.value = activityType
    showDialog.value = true
}

const closeDialog = () => {
    showDialog.value = false
    selectedActivityType.value = null
}

// Save handler
const handleSave = async (data: {
    name: string
    code: string
    billable: boolean
    adminOnly: boolean
    applyClasses: boolean
}) => {
    if (selectedActivityType.value) {
        // Update existing activity type
        await updateActivityType({
            params: { id: selectedActivityType.value.id },
            body: data,
        })
        successAlert(`Type d'activité '${data.name}' modifié avec succès`)
    } else {
        // Create new activity type
        await createActivityType({
            body: data,
        })
        successAlert(`Type d'activité '${data.name}' créé avec succès`)
    }

    // Reload data and close dialog
    await fetchActivityTypes()
    closeDialog()
}

// Delete handlers
const confirmDelete = (activityType: ActivityTypeResponse) => {
    activityTypeToDelete.value = activityType
    showDeleteDialog.value = true
}

const deleteActivityType = async () => {
    if (!activityTypeToDelete.value) return

    await deleteActivityTypeApi({ params: { id: activityTypeToDelete.value.id } })
    successAlert(`Type d'activité '${activityTypeToDelete.value.name}' supprimé avec succès`)
    await fetchActivityTypes() // Reload data
    showDeleteDialog.value = false
    activityTypeToDelete.value = null
}
</script>
