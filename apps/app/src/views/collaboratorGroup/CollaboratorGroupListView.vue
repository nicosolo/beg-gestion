<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6"
            >
                <h1 class="text-2xl font-bold">{{ $t("collaboratorGroup.title") }}</h1>
                <Button
                    v-if="isAdmin"
                    variant="primary"
                    @click="openCreateModal"
                    class="w-full sm:w-auto"
                >
                    {{ $t("collaboratorGroup.new") }}
                </Button>
            </div>

            <Card class="mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        v-model="filters.name"
                        :placeholder="$t('collaboratorGroup.searchByName')"
                        @update:model-value="debouncedFetch"
                    />
                </div>
            </Card>

            <DataTable
                :items="groups"
                :columns="columns"
                item-key="id"
                :empty-message="$t('collaboratorGroup.empty')"
            >
                <template #cell:createdAt="{ item }">
                    {{ formatDate(item.createdAt) }}
                </template>

                <template #cell:actions="{ item }">
                    <div v-if="isAdmin" class="flex justify-end gap-2">
                        <Button
                            variant="ghost-primary"
                            size="sm"
                            @click="openEditModal(item)"
                        >
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

            <div v-if="groupData && groupData.totalPages > 1" class="mt-6">
                <Pagination
                    :current-page="currentPage"
                    :total-pages="groupData.totalPages"
                    :total-items="groupData.total"
                    :page-size="groupData.limit"
                    @prev="groupData.page > 1 && currentPage--"
                    @next="groupData.page < groupData.totalPages && currentPage++"
                    @go-to="(page) => (currentPage = page)"
                />
            </div>
        </div>

        <ConfirmDialog
            v-model="showDeleteDialog"
            :title="$t('common.confirmDelete')"
            :message="$t('collaboratorGroup.deleteConfirm', { name: currentGroupToDelete?.name })"
            type="danger"
            :confirm-text="$t('common.delete')"
            :cancel-text="$t('common.cancel')"
            @confirm="deleteGroup"
        />

        <CollaboratorGroupEditModal
            v-model="showEditModal"
            :group-id="editingGroupId"
            @saved="onGroupSaved"
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
import CollaboratorGroupEditModal from "@/components/organisms/collaboratorGroup/CollaboratorGroupEditModal.vue"
import Card from "@/components/atoms/Card.vue"
import {
    useFetchCollaboratorGroupList,
    useDeleteCollaboratorGroup,
} from "@/composables/api/useCollaboratorGroup"
import { useAuthStore } from "@/stores/auth"
import { useAlert } from "@/composables/utils/useAlert"
import { formatDate } from "@/utils/date"
import type { CollaboratorGroup, CollaboratorGroupFilter } from "@beg/validations"
import { useRouter } from "vue-router"

const { t } = useI18n()
const authStore = useAuthStore()
const { successAlert } = useAlert()

const isAdmin = computed(() => authStore.isRole("admin"))
const router = useRouter()
if (!isAdmin.value) {
    router.push({ name: "home" })
}

const columns = computed(() => {
    const base = [{ key: "name", label: t("collaboratorGroup.name") }]
    base.push({ key: "actions", label: t("common.actions") })
    return base
})

const { get: fetchGroupListApi, loading, data: groupData } = useFetchCollaboratorGroupList()
const { delete: deleteGroupApi, loading: deleting } = useDeleteCollaboratorGroup()

const currentPage = ref(1)
const groups = computed(() => groupData?.value?.data || [])

const filters = ref<CollaboratorGroupFilter>({
    name: "",
    page: 1,
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
})

const showDeleteDialog = ref(false)
const currentGroupToDelete = ref<CollaboratorGroup | null>(null)
const showEditModal = ref(false)
const editingGroupId = ref<number | null>(null)

const fetchGroups = async (resetPage = false) => {
    if (resetPage) currentPage.value = 1
    await fetchGroupListApi({
        query: { ...filters.value, page: currentPage.value },
    })
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const debouncedFetch = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        fetchGroups(true)
    }, 300)
}

watch(currentPage, () => {
    fetchGroups()
})

onMounted(() => {
    document.title = "BEG - Groupes"
    fetchGroups()
})

const confirmDelete = (group: CollaboratorGroup) => {
    currentGroupToDelete.value = group
    showDeleteDialog.value = true
}

const deleteGroup = async () => {
    if (!currentGroupToDelete.value) return
    await deleteGroupApi({ params: { id: currentGroupToDelete.value.id } })
    successAlert(t("common.deleteSuccess", { name: currentGroupToDelete.value.name }))
    showDeleteDialog.value = false
    await fetchGroups()
}

const openCreateModal = () => {
    editingGroupId.value = null
    showEditModal.value = true
}

const openEditModal = (group: CollaboratorGroup) => {
    editingGroupId.value = group.id
    showEditModal.value = true
}

const onGroupSaved = async () => {
    await fetchGroups()
}
</script>
