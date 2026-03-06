<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 class="text-2xl font-bold">Collaborateurs</h1>
                <Button
                    variant="primary"
                    :to="{ name: 'collaborator-new' }"
                    class="w-full sm:w-auto"
                >
                    Nouveau collaborateur
                </Button>
            </div>

            <label class="flex items-center gap-2 mb-4">
                <input v-model="showArchived" type="checkbox" class="rounded" />
                Afficher les collaborateurs archivés
            </label>

            <DataTable
                :items="filteredCollaborators"
                :columns="columns"
                item-key="IDcollaborateur"
                empty-message="Aucun collaborateur trouvé"
                :row-class="(item) => (item.archived ? 'bg-gray-300' : '')"
            >
                <template #cell:fullName="{ item }">
                    {{ item.firstName }} {{ item.lastName }}
                </template>

                <template #cell:archived="{ item }">
                    <Badge :variant="item.archived ? 'danger' : 'success'">
                        {{ item.archived ? "Oui" : "Non" }}
                    </Badge>
                </template>

                <template #cell:actions="{ item }">
                    <div class="flex justify-end gap-2">
                        <Button
                            variant="ghost-primary"
                            size="sm"
                            :to="{
                                name: 'collaborator-edit',
                                params: { id: item.id },
                            }"
                        >
                            Modifier
                        </Button>
                    </div>
                </template>
            </DataTable>
        </div>
    </LoadingOverlay>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import Button from "@/components/atoms/Button.vue"
import DataTable, { type Column } from "@/components/molecules/DataTable.vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import { useFetchUsers } from "@/composables/api/useUser"

// API client
const { get: fetchUsers, loading, data: collaborators } = useFetchUsers()
const showArchived = ref(false)
const filteredCollaborators = computed(() => {
    if (!collaborators.value) return []
    return showArchived.value ? collaborators.value : collaborators.value.filter((c) => !c.archived)
})

const columns: Column[] = [
    { key: "id", label: "ID" },
    { key: "fullName", label: "Nom" },
    { key: "email", label: "Email" },
    { key: "role", label: "Rôle" },
    { key: "initials", label: "Initiales" },
    { key: "archived", label: "Archivé" },
    { key: "actions", label: "Actions" },
]

// Load users on mount
onMounted(async () => {
    document.title = "BEG - Liste des collaborateurs"
    await fetchUsers({})
})
</script>
