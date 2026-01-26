<template>
    <div
        v-if="orphanedActivities && orphanedActivities.length > 0"
        class="bg-amber-50 border border-amber-200 rounded-lg p-4"
    >
        <div class="flex items-start gap-3">
            <ExclamationTriangleIcon class="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
                <h3 class="text-sm font-medium text-amber-800">
                    {{ $t("home.orphanedActivities.title") }}
                </h3>
                <p class="text-sm text-amber-700 mt-1">
                    {{ $t("home.orphanedActivities.description") }}
                </p>

                <div class="mt-3 space-y-2">
                    <div
                        v-for="item in orphanedActivities"
                        :key="`${item.project.id}-${item.user.id}`"
                        class="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-amber-200"
                    >
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">
                                {{ item.project.projectNumber }} - {{ item.project.name }}
                            </p>
                            <p class="text-xs text-gray-500">
                                {{ item.user.firstName }} {{ item.user.lastName }} ({{
                                    item.user.initials
                                }})
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            :loading="addingMember === `${item.project.id}-${item.user.id}`"
                            @click="handleAddMember(item)"
                        >
                            {{ $t("home.orphanedActivities.addToProject") }}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline"
import Button from "@/components/atoms/Button.vue"
import { useFetchOrphanedActivities } from "@/composables/api/useActivity"
import type { OrphanedActivityGroup } from "@beg/validations"
import { useAddProjectMember } from "@/composables/api/useProject"
import { useAlert } from "@/composables/utils/useAlert"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const { successAlert, errorAlert } = useAlert()
const { get: fetchOrphaned, data: orphanedActivities } = useFetchOrphanedActivities()
const { post: addMember } = useAddProjectMember()

const addingMember = ref<string | null>(null)

const handleAddMember = async (item: OrphanedActivityGroup) => {
    const key = `${item.project.id}-${item.user.id}`
    addingMember.value = key

    try {
        await addMember({
            params: { id: item.project.id, userId: item.user.id },
        })
        successAlert(
            t("home.orphanedActivities.addedSuccess", {
                user: `${item.user.firstName} ${item.user.lastName}`,
                project: item.project.projectNumber,
            })
        )
        // Refresh the list
        await fetchOrphaned()
    } catch (error) {
        errorAlert(t("home.orphanedActivities.addedError"))
    } finally {
        addingMember.value = null
    }
}

onMounted(() => {
    fetchOrphaned()
})
</script>
