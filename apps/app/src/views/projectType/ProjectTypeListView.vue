<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 class="text-2xl font-bold">Types de mandat</h1>
                <Button variant="primary" @click="openCreateDialog" class="w-full sm:w-auto">
                    Nouveau type
                </Button>
            </div>

            <DataTable
                :items="projectTypes || []"
                :columns="columns"
                item-key="id"
                empty-message="Aucun type de mandat trouvé"
            >
                <template #cell:actions="{ item }">
                    <div class="flex justify-end gap-2">
                        <Button variant="ghost-primary" size="sm" @click="openEditDialog(item)">
                            Modifier
                        </Button>
                        <Button
                            variant="ghost-danger"
                            size="sm"
                            @click="confirmDelete(item)"
                            :disabled="deletingProjectType"
                        >
                            Supprimer
                        </Button>
                    </div>
                </template>
            </DataTable>
        </div>

        <!-- Create/Edit Dialog -->
        <Dialog v-model="showDialog" :title="dialogTitle" size="md">
            <ProjectTypeForm
                :project-type="selectedProjectType"
                :loading="savingProjectType"
                @submit="handleSave"
                @cancel="closeDialog"
            />
        </Dialog>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog
            v-model="showDeleteDialog"
            title="Confirmer la suppression"
            :message="`Êtes-vous sûr de vouloir supprimer le type de mandat '${projectTypeToDelete?.name}' ?`"
            type="danger"
            confirm-text="Supprimer"
            cancel-text="Annuler"
            @confirm="deleteProjectType"
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
import ProjectTypeForm from "@/components/organisms/ProjectTypeForm.vue"
import {
    useFetchProjectTypes,
    useCreateProjectType,
    useUpdateProjectType,
    useDeleteProjectType,
} from "@/composables/api/useProjectType"
import { useAlert } from "@/composables/utils/useAlert"
import type { ProjectTypeSchema } from "@beg/validations"

// API composables
const { get: fetchProjectTypes, loading, data: projectTypes } = useFetchProjectTypes()
const { post: createProjectType, loading: creatingProjectType } = useCreateProjectType()
const { put: updateProjectType, loading: updatingProjectType } = useUpdateProjectType()
const { delete: deleteProjectTypeApi, loading: deletingProjectType } = useDeleteProjectType()

// Alert composable
const { successAlert } = useAlert()

// State
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedProjectType = ref<ProjectTypeSchema | null>(null)
const projectTypeToDelete = ref<ProjectTypeSchema | null>(null)

// Computed
const savingProjectType = computed(() => creatingProjectType.value || updatingProjectType.value)
const dialogTitle = computed(() =>
    selectedProjectType.value ? "Modifier le type de mandat" : "Nouveau type de mandat"
)

const columns = [
    { key: "id", label: "ID", size: "id" as const },
    { key: "name", label: "Type de mandat", size: "flex" as const },
    { key: "actions", label: "Actions", size: "action" as const, actions: true },
]

// Load project types on mount
onMounted(async () => {
    document.title = "BEG - Types de mandat"
    await fetchProjectTypes({})
})

// Dialog handlers
const openCreateDialog = () => {
    selectedProjectType.value = null
    showDialog.value = true
}

const openEditDialog = (projectType: ProjectTypeSchema) => {
    selectedProjectType.value = projectType
    showDialog.value = true
}

const closeDialog = () => {
    showDialog.value = false
    selectedProjectType.value = null
}

// Save handler
const handleSave = async (data: { name: string }) => {
    if (selectedProjectType.value) {
        // Update existing project type
        await updateProjectType({
            params: { id: selectedProjectType.value.id },
            body: data,
        })
        successAlert(`Type de mandat '${data.name}' modifié avec succès`)
    } else {
        // Create new project type
        await createProjectType({
            body: data,
        })
        successAlert(`Type de mandat '${data.name}' créé avec succès`)
    }

    // Reload data and close dialog
    await fetchProjectTypes({})
    closeDialog()
}

// Delete handlers
const confirmDelete = (projectType: ProjectTypeSchema) => {
    projectTypeToDelete.value = projectType
    showDeleteDialog.value = true
}

const deleteProjectType = async () => {
    if (!projectTypeToDelete.value) return

    try {
        await deleteProjectTypeApi({ params: { id: projectTypeToDelete.value.id } })
        successAlert(`Type de mandat '${projectTypeToDelete.value.name}' supprimé avec succès`)
        await fetchProjectTypes({}) // Reload data
        showDeleteDialog.value = false
        projectTypeToDelete.value = null
    } catch {
        showDeleteDialog.value = false
    }
}
</script>
