<template>
    <div class="mt-8">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium">Charges de travail</h2>
            <div class="flex items-center gap-2">
                <!-- Bulk actions -->
                <template v-if="selectedRows.size > 0">
                    <span class="text-sm text-gray-600">
                        {{ selectedRows.size }} sélectionné(s)
                    </span>
                    <Button variant="ghost" size="sm" @click="showBulkUpdateForm = true">
                        Modifier la charge
                    </Button>
                    <Button variant="ghost-danger" size="sm" @click="confirmBulkDelete">
                        Supprimer
                    </Button>
                    <Button variant="ghost" size="sm" @click="clearSelection"> Annuler </Button>
                </template>
                <!-- Create actions -->
                <template v-else>
                    <Button
                        v-if="!showCreateForm && !showBulkCreateForm"
                        variant="ghost"
                        size="sm"
                        @click="showBulkCreateForm = true"
                    >
                        + Année complète
                    </Button>
                    <Button
                        v-if="!showCreateForm && !showBulkCreateForm"
                        variant="ghost-primary"
                        size="sm"
                        @click="showCreateForm = true"
                    >
                        + Ajouter une charge
                    </Button>
                </template>
            </div>
        </div>

        <div class="space-y-4">
            <!-- Create form -->
            <UserWorkloadCreate
                v-if="showCreateForm"
                :user-id="userId"
                @created="handleWorkloadCreated"
                @cancel="showCreateForm = false"
            />

            <!-- Bulk create form -->
            <div v-if="showBulkCreateForm" class="bg-white border border-gray-200 rounded-lg p-4">
                <h3 class="text-sm font-medium mb-4">Créer des charges pour une année complète</h3>
                <div class="flex items-end gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Année</label>
                        <input
                            type="number"
                            v-model.number="bulkCreateData.year"
                            min="2000"
                            max="2100"
                            class="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="2025"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1"
                        >Charge (%)</label
                        >
                        <input
                            type="number"
                            v-model.number="bulkCreateData.workload"
                            min="0"
                            max="100"
                            class="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="80"
                        />
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            @click="createBulkWorkloads"
                            :disabled="
                                loadingBulkCreate ||
                                    !bulkCreateData.year ||
                                    !bulkCreateData.workload
                            "
                        >
                            <LoadingSpinner
                                v-if="loadingBulkCreate"
                                size="sm"
                                color="white"
                                class="mr-2"
                            />
                            Créer pour l'année
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            @click="cancelBulkCreate"
                            :disabled="loadingBulkCreate"
                        >
                            Annuler
                        </Button>
                    </div>
                </div>
                <p
                    v-if="bulkCreateData.year && bulkCreateData.workload"
                    class="text-xs text-gray-500 mt-2"
                >
                    Créera 12 entrées de {{ bulkCreateData.workload }}% pour chaque mois de
                    {{ bulkCreateData.year }}
                </p>
            </div>

            <!-- Bulk update form -->
            <div v-if="showBulkUpdateForm" class="bg-white border border-gray-200 rounded-lg p-4">
                <h3 class="text-sm font-medium mb-4">
                    Modifier la charge pour {{ selectedRows.size }} entrée(s)
                </h3>
                <div class="flex items-end gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1"
                        >Nouvelle charge (%)</label
                        >
                        <input
                            type="number"
                            v-model.number="bulkUpdateData.workload"
                            min="0"
                            max="100"
                            class="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="80"
                        />
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            @click="bulkUpdateWorkloads"
                            :disabled="loadingUpdate || !bulkUpdateData.workload"
                        >
                            <LoadingSpinner
                                v-if="loadingUpdate"
                                size="sm"
                                color="white"
                                class="mr-2"
                            />
                            Appliquer
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            @click="cancelBulkUpdate"
                            :disabled="loadingUpdate"
                        >
                            Annuler
                        </Button>
                    </div>
                </div>
            </div>

            <!-- DataTable for workloads -->
            <DataTable
                ref="dataTableRef"
                :items="paginatedWorkloads"
                :columns="columns"
                item-key="id"
                empty-message="Aucune charge de travail définie"
                v-model="selectedRows"
                @selection-change="handleSelectionChange"
                selectable
            >
                <!-- Month column -->
                <template #cell:monthYear="{ item }">
                    <template v-if="editingId !== item.id">
                        {{ monthNames[item.month - 1] }} {{ item.year }}
                    </template>
                    <template v-else>
                        <div class="flex items-center space-x-2">
                            <select
                                v-model.number="editData.month"
                                class="px-2 py-1 border border-gray-300 rounded-md text-sm"
                            >
                                <option
                                    v-for="(name, index) in monthNames"
                                    :key="index"
                                    :value="index + 1"
                                >
                                    {{ name }}
                                </option>
                            </select>
                            <input
                                type="number"
                                v-model.number="editData.year"
                                min="2000"
                                max="2100"
                                class="px-2 py-1 border border-gray-300 rounded-md text-sm w-20"
                                placeholder="Année"
                            />
                        </div>
                    </template>
                </template>

                <!-- Workload percentage column -->
                <template #cell:workload="{ item }">
                    <template v-if="editingId !== item.id"> {{ item.workload }}% </template>
                    <template v-else>
                        <input
                            type="number"
                            v-model.number="editData.workload"
                            min="0"
                            max="100"
                            class="px-2 py-1 border border-gray-300 rounded-md text-sm w-20"
                            placeholder="%"
                        />
                    </template>
                </template>

                <!-- Actions column -->
                <template #cell:actions="{ item }">
                    <div class="flex items-center justify-end space-x-2">
                        <template v-if="editingId !== item.id">
                            <Button
                                variant="ghost"
                                size="xs"
                                @click="startEditing(item)"
                                title="Modifier"
                                className="!p-1"
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
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                </svg>
                            </Button>
                            <Button
                                variant="ghost-danger"
                                size="xs"
                                @click="confirmDelete(item)"
                                title="Supprimer"
                                className="!p-1"
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
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </Button>
                        </template>
                        <template v-else>
                            <Button
                                variant="custom"
                                size="xs"
                                @click="saveChanges(item)"
                                :disabled="loadingUpdate"
                                :title="$t('common.save')"
                                className="!p-1 text-green-600 hover:text-green-800 hover:bg-green-50"
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
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </Button>
                            <Button
                                variant="ghost"
                                size="xs"
                                @click="cancelEditing"
                                :disabled="loadingUpdate"
                                title="Annuler"
                                className="!p-1"
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
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </Button>
                        </template>
                    </div>
                </template>
            </DataTable>

            <!-- Pagination controls -->
            <Pagination
                v-if="totalPages > 1"
                :current-page="currentPage"
                :total-pages="totalPages"
                :total-items="workloads.length"
                :page-size="itemsPerPage"
                @prev="currentPage--"
                @next="currentPage++"
                @go-to="currentPage = $event"
            />

            <!-- Confirm dialog for single delete -->
            <ConfirmDialog
                v-model="showDeleteConfirm"
                title="Confirmer la suppression"
                message="Êtes-vous sûr de vouloir supprimer cette charge de travail ?"
                type="danger"
                confirm-text="Supprimer"
                cancel-text="Annuler"
                @confirm="deleteWorkload"
            />

            <!-- Confirm dialog for bulk delete -->
            <ConfirmDialog
                v-model="showBulkDeleteConfirm"
                title="Confirmer la suppression"
                :message="`Êtes-vous sûr de vouloir supprimer ${selectedRows.size} charge(s) de travail ?`"
                type="danger"
                confirm-text="Supprimer"
                cancel-text="Annuler"
                @confirm="bulkDeleteWorkloads"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from "vue"
import Button from "@/components/atoms/Button.vue"
import LoadingSpinner from "@/components/atoms/LoadingSpinner.vue"
import DataTable from "@/components/molecules/DataTable.vue"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"
import UserWorkloadCreate from "@/components/organisms/workload/UserWorkloadCreate.vue"
import Pagination from "@/components/organisms/Pagination.vue"
import {
    useFetchWorkloadList,
    useUpdateWorkload,
    useDeleteWorkload,
    useBulkCreateWorkloads,
} from "@/composables/api/useWorkload"
import type { WorkloadResponse, WorkloadUpdate } from "@beg/validations"
import type { Column } from "@/components/molecules/DataTable.vue"

const props = defineProps<{
    userId: number
}>()

const { get: getWorkloads, data: workloadsData } = useFetchWorkloadList()
const { put: updateWorkload, loading: loadingUpdate } = useUpdateWorkload()
const { delete: removeWorkload } = useDeleteWorkload()
const { post: bulkCreateWorkloads, loading: loadingBulkCreate } = useBulkCreateWorkloads()

const workloads = ref<WorkloadResponse[]>([])
const showCreateForm = ref(false)
const showBulkCreateForm = ref(false)
const showDeleteConfirm = ref(false)
const showBulkDeleteConfirm = ref(false)
const showBulkUpdateForm = ref(false)
const workloadToDelete = ref<WorkloadResponse | null>(null)
const editingId = ref<number | null>(null)
const editData = reactive<WorkloadUpdate>({
    year: 0,
    month: 0,
    workload: 0,
})
const bulkCreateData = reactive({
    year: new Date().getFullYear(),
    workload: 80,
})
const bulkUpdateData = reactive({
    workload: 80,
})

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(24)
const selectedRows = ref<Set<string | number>>(new Set())
const dataTableRef = ref<any>(null)

const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
]

// Computed properties for pagination
const totalPages = computed(() => Math.ceil(workloads.value.length / itemsPerPage.value))

const paginatedWorkloads = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return workloads.value.slice(start, end)
})

const columns: Column[] = [
    {
        key: "monthYear",
        label: "Période",
        width: "60%",
    },
    {
        key: "workload",
        label: "Charge",
        width: "20%",
    },
    {
        key: "actions",
        label: "Actions",
        width: "20%",
        actions: true,
    },
]

const loadWorkloads = async () => {
    await getWorkloads({ query: { userId: props.userId } })
    if (workloadsData.value) {
        // Sort workloads by year and month (most recent first)
        workloads.value = [...workloadsData.value].sort((a, b) => {
            if (a.year !== b.year) {
                return b.year - a.year
            }
            return b.month - a.month
        })
    }
}

onMounted(() => {
    loadWorkloads()
})

watch(
    () => props.userId,
    () => {
        loadWorkloads()
    }
)

const startEditing = (workload: WorkloadResponse) => {
    editingId.value = workload.id
    editData.year = workload.year
    editData.month = workload.month
    editData.workload = workload.workload
}

const cancelEditing = () => {
    editingId.value = null
}

const saveChanges = async (workload: WorkloadResponse) => {
    try {
        const result = await updateWorkload({
            params: { id: workload.id },
            body: editData,
        })

        if (result) {
            const index = workloads.value.findIndex((w) => w.id === workload.id)
            if (index !== -1) {
                workloads.value[index] = result
                // Re-sort after update
                workloads.value = [...workloads.value].sort((a, b) => {
                    if (a.year !== b.year) {
                        return b.year - a.year
                    }
                    return b.month - a.month
                })
            }
            editingId.value = null
        }
    } catch (error) {
        console.error("Error updating workload:", error)
    }
}

const confirmDelete = (workload: WorkloadResponse) => {
    workloadToDelete.value = workload
    showDeleteConfirm.value = true
}

const deleteWorkload = async () => {
    if (!workloadToDelete.value) return

    try {
        await removeWorkload({
            params: { id: workloadToDelete.value.id },
        })

        workloads.value = workloads.value.filter((w) => w.id !== workloadToDelete.value?.id)
        showDeleteConfirm.value = false
        workloadToDelete.value = null
    } catch (error) {
        console.error("Error deleting workload:", error)
        showDeleteConfirm.value = false
    }
}

const handleWorkloadCreated = (newWorkload: WorkloadResponse) => {
    workloads.value.push(newWorkload)
    // Re-sort after adding
    workloads.value = [...workloads.value].sort((a, b) => {
        if (a.year !== b.year) {
            return b.year - a.year
        }
        return b.month - a.month
    })
    showCreateForm.value = false
}

const cancelBulkCreate = () => {
    showBulkCreateForm.value = false
    bulkCreateData.year = new Date().getFullYear()
    bulkCreateData.workload = 80
}

// Selection functions
const handleSelectionChange = (newSelection: Set<string | number>) => {
    selectedRows.value = newSelection
}

const clearSelection = () => {
    dataTableRef.value?.clearSelection()
}

// Bulk operations
const confirmBulkDelete = () => {
    showBulkDeleteConfirm.value = true
}

const bulkDeleteWorkloads = async () => {
    try {
        // Delete each selected workload
        for (const id of selectedRows.value) {
            await removeWorkload({ params: { id: Number(id) } })
        }

        // Remove deleted workloads from the list
        workloads.value = workloads.value.filter((w) => !selectedRows.value.has(w.id))

        // Clear selection and close dialog
        clearSelection()
        showBulkDeleteConfirm.value = false

        // Reset page if current page is empty
        if (paginatedWorkloads.value.length === 0 && currentPage.value > 1) {
            currentPage.value--
        }
    } catch (error) {
        console.error("Error during bulk delete:", error)
        showBulkDeleteConfirm.value = false
    }
}

const cancelBulkUpdate = () => {
    showBulkUpdateForm.value = false
    bulkUpdateData.workload = 80
}

const bulkUpdateWorkloads = async () => {
    try {
        // Update each selected workload
        for (const id of selectedRows.value) {
            const result = await updateWorkload({
                params: { id: Number(id) },
                body: { workload: bulkUpdateData.workload },
            })

            if (result) {
                const index = workloads.value.findIndex((w) => w.id === Number(id))
                if (index !== -1) {
                    workloads.value[index] = {
                        ...workloads.value[index],
                        workload: bulkUpdateData.workload,
                    }
                }
            }
        }

        // Clear selection and close form
        clearSelection()
        cancelBulkUpdate()
    } catch (error) {
        console.error("Error during bulk update:", error)
    }
}

const createBulkWorkloads = async () => {
    if (!bulkCreateData.year || !bulkCreateData.workload) return

    try {
        // Check for existing workloads for this year
        const existingMonths = workloads.value
            .filter((w) => w.year === bulkCreateData.year)
            .map((w) => w.month)

        // Create array of workloads for months that don't exist yet
        const workloadsToCreate = []
        for (let month = 1; month <= 12; month++) {
            if (!existingMonths.includes(month)) {
                workloadsToCreate.push({
                    userId: props.userId,
                    year: bulkCreateData.year,
                    month,
                    workload: bulkCreateData.workload,
                })
            }
        }

        if (workloadsToCreate.length === 0) {
            console.log("All months already have workloads for this year")
            return
        }

        // Use bulk create endpoint
        const result = await bulkCreateWorkloads({
            body: workloadsToCreate,
        })

        if (result) {
            // Add all created workloads to the list
            workloads.value.push(...result)
            // Re-sort after adding
            workloads.value = [...workloads.value].sort((a, b) => {
                if (a.year !== b.year) {
                    return b.year - a.year
                }
                return b.month - a.month
            })
            cancelBulkCreate()
        }
    } catch (error) {
        console.error("Error during bulk creation:", error)
    }
}
</script>
