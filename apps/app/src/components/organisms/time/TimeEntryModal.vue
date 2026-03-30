<template>
    <Dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isNewEntry ? $t('time.new') : $t('common.edit')"
        mobile-full-screen
    >
        <form @submit.prevent="handleSubmit" ref="formRef" id="timeEntryForm">
            <div class="space-y-4">
                <!-- Locked activity warning -->
                <div
                    v-if="isBilledFullyLocked"
                    class="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded"
                >
                    {{ $t("time.alerts.billedLockedMessage") }}
                </div>
                <div
                    v-else-if="isLocked"
                    class="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded"
                >
                    {{ $t("time.alerts.activityLockedMessage") }}
                </div>

                <!-- Error message -->
                <div
                    v-if="errorMessage"
                    class="p-4 bg-red-100 border border-red-400 text-red-700 rounded"
                >
                    {{ errorMessage }}
                </div>

                <!-- Project and Date section -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>{{ $t("projects.title") }}</Label>
                        <ProjectSelect
                            v-model="activity.projectId"
                            :disabled="loading || isBilledFullyLocked"
                            required
                        />
                    </div>
                    <DateField
                        :min="minDate"
                        label="Date"
                        v-model="activity.date"
                        :disabled="loading || isLocked"
                    />
                </div>
                <!-- Project and Date section -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div v-if="currentUser">
                        <Label for="user">{{ $t("time.columns.user") }}</Label>
                        <UserSelect
                            id="user"
                            v-if="isRole('admin')"
                            v-model="activity.userId"
                            :disabled="loading || isLocked"
                            :required="true"
                            class="w-full"
                        />

                        <div
                            class="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                            v-else
                        >
                            {{ currentUser.firstName }} {{ currentUser.lastName }}
                        </div>
                    </div>
                    <div>
                        <Label
                        >{{ $t("time.columns.activityType") }}
                            <span class="text-red-500">*</span></Label
                        >
                        <ActivityTypeSelect
                            v-model="activity.activityTypeId"
                            :disabled="loading || isLocked"
                            :required="true"
                            class-name="w-full"
                        />
                    </div>
                </div>

                <!-- Activity details section -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                        <Label for="duration"
                        >{{ $t("time.columns.duration") }}
                            <span class="text-red-500">*</span></Label
                        >
                        <InputNumber
                            id="duration"
                            type="time"
                            v-model.number="activity.duration"
                            min="0"
                            :disabled="loading || isLocked"
                            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <Label for="kilometers">{{ $t("time.columns.kilometers") }}</Label>
                        <InputNumber
                            id="kilometers"
                            type="distance"
                            v-model.number="activity.kilometers"
                            min="0"
                            :disabled="loading || isLocked"
                            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <Label for="expenses">{{ $t("time.columns.expenses") }} (CHF)</Label>
                        <InputNumber
                            id="expenses"
                            type="amount"
                            v-model.number="activity.expenses"
                            min="0"
                            :disabled="loading || isLocked"
                            class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                <!-- Expenses and Description -->
                <div class="space-y-4">
                    <div>
                        <Label>{{ $t("time.columns.description") }} <span class="text-red-500">*</span></Label>
                        <Textarea
                            v-model="activity.description"
                            rows="3"
                            :disabled="loading || isLocked"
                            required
                        />
                    </div>
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex justify-between w-full">
                <div>
                    <Button
                        v-if="!isNewEntry"
                        @click="handleDelete"
                        :disabled="saving || isLocked || isBilledFullyLocked"
                        variant="danger"
                    >
                        {{ $t("common.delete") }}
                    </Button>
                </div>
                <div class="flex gap-2">
                    <Button @click="closeModal" :disabled="saving" variant="secondary">
                        {{ $t("common.close") }}
                    </Button>
                    <Button
                        type="button"
                        :loading="saving"
                        :disabled="isBilledFullyLocked"
                        variant="primary"
                        @click="submitFormAndContinue"
                    >
                        {{ $t("common.save") }}
                    </Button>
                </div>
            </div>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import Dialog from "@/components/molecules/Dialog.vue"
import Button from "@/components/atoms/Button.vue"
import Label from "@/components/atoms/Label.vue"
import ProjectSelect from "@/components/organisms/project/ProjectSelect.vue"
import ActivityTypeSelect from "@/components/organisms/activityType/ActivityTypeSelect.vue"
import {
    useFetchActivity,
    useCreateActivity,
    useUpdateActivity,
    useDeleteActivity,
} from "@/composables/api/useActivity"
import { useFetchActivityTypeFiltered } from "@/composables/api/useActivityType"
import { ApiError } from "@/utils/api-error"
import type { ActivityCreateInput, ActivityUpdateInput, ActivityResponse } from "@beg/validations"
import InputNumber from "@/components/atoms/InputNumber.vue"
import { useAlert } from "@/composables/utils/useAlert"
import { useActivityLock } from "@/composables/utils/useActivityLock"
import UserSelect from "../user/UserSelect.vue"
import { useAuthStore } from "@/stores/auth"
import Textarea from "@/components/atoms/Textarea.vue"
import DateField from "@/components/molecules/DateField.vue"
interface Props {
    modelValue: boolean
    activityId?: number | null
    projectId?: number | null
    defaultProjectId?: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
    "update:modelValue": [value: boolean]
    saved: [activity: ActivityResponse]
}>()

const { t } = useI18n()
const { isRole, user } = useAuthStore()
const { successAlert, errorAlert } = useAlert()
const { canEditActivity, isBilledLocked } = useActivityLock()

// Computed properties
const isNewEntry = computed(() => !props.activityId)
const currentUser = computed(() => user)

const saving = computed(
    () => creatingActivity.value || updatingActivity.value || deletingActivity.value
)

const loading = computed(() => loadingActivity.value || saving.value)

// Store loaded activity response for permission checks
const loadedActivity = ref<ActivityResponse | null>(null)

const isLocked = computed(() => {
    if (isNewEntry.value) return false
    return !canEditActivity(activity.value)
})

const isBilledFullyLocked = computed(() => {
    if (isNewEntry.value || !loadedActivity.value) return false
    return isBilledLocked(loadedActivity.value)
})

// State
const errorMessage = ref<string | null>(null)

const formRef = ref<HTMLFormElement | null>(null)

// Activity data
const activity = ref<ActivityCreateInput>({
    projectId: props.projectId || props.defaultProjectId || 0,
    activityTypeId: "" as any, // Start with empty string for validation
    date: new Date(),
    duration: 0,
    kilometers: 0,
    expenses: 0,
    description: "",
    billed: false,

    userId: currentUser.value?.id,
})

// API composables
const { get: fetchActivity, loading: loadingActivity } = useFetchActivity()
const { post: createActivity, loading: creatingActivity } = useCreateActivity()
const { put: updateActivity, loading: updatingActivity } = useUpdateActivity()
const { delete: deleteActivity, loading: deletingActivity } = useDeleteActivity()
const { get: fetchActivityTypes, data: activityTypesData } = useFetchActivityTypeFiltered()

// Date constraints for non-admin users (60 days in the past, max today)
const minDate = computed(() => {
    // Admin and super_admin users have no minimum date restriction
    if (isRole("admin")) {
        return undefined
    }

    // Non-admin users can only create/edit activities from the last 60 days
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    return sixtyDaysAgo
})

// Auto-fill duration when selecting an activity type with defaultDuration (new entries only)
watch(
    () => activity.value.activityTypeId,
    (newTypeId) => {
        if (!isNewEntry.value || !newTypeId || !activityTypesData.value) return
        const selectedType = activityTypesData.value.find((t) => t.id === Number(newTypeId))
        if (selectedType?.defaultDuration && activity.value.duration === 0) {
            activity.value.duration = selectedType.defaultDuration
        }
    }
)

// Load activity data if editing
const loadActivityData = async () => {
    if (!props.activityId) return

    try {
        const response = await fetchActivity({
            params: { id: props.activityId },
        })

        if (response) {
            loadedActivity.value = response
            activity.value = {
                projectId: response.project?.id || 0,
                activityTypeId: response.activityType?.id || 0,
                date: new Date(response.date),
                duration: response.duration,
                kilometers: response.kilometers,
                expenses: response.expenses,
                description: response.description || "",
                billed: response.billed,
                userId: response.user?.id,
            }
        }
    } catch (error) {
        console.error("Error loading activity:", error)
        errorMessage.value = t("errors.general")
    }
}

// Handle form submission
const handleSubmit = async (keepOpen: boolean = false) => {
    await saveActivity(keepOpen)
}

// Submit and keep modal open for another entry
const submitFormAndContinue = () => {
    if (formRef.value) {
        if (formRef.value.checkValidity()) {
            handleSubmit(true)
        } else {
            formRef.value.reportValidity()
        }
    }
}

// Save activity
const saveActivity = async (keepOpen: boolean = false) => {
    errorMessage.value = null

    try {
        let response: ActivityResponse | null = null

        // Convert empty string back to 0 for activityTypeId
        const activityData = {
            ...activity.value,
            activityTypeId:
                !activity.value.activityTypeId || activity.value.activityTypeId === ("" as any)
                    ? 0
                    : Number(activity.value.activityTypeId),
        }

        if (isNewEntry.value) {
            response = await createActivity({
                body: activityData,
            })
        } else if (props.activityId) {
            // When locked, only send projectId change
            const updateData: ActivityUpdateInput = isLocked.value
                ? { projectId: activityData.projectId }
                : {
                      projectId: activityData.projectId,
                      activityTypeId: activityData.activityTypeId,
                      date: activityData.date,
                      duration: activityData.duration,
                      kilometers: activityData.kilometers,
                      expenses: activityData.expenses,
                      description: activityData.description,
                      billed: activityData.billed,
                  }

            response = await updateActivity({
                params: { id: props.activityId },
                body: updateData,
            })
        }

        if (response) {
            emit("saved", response)
            successAlert(
                isNewEntry.value ? t("time.alerts.entryCreated") : t("time.alerts.entryUpdated")
            )
            if (keepOpen && isNewEntry.value) {
                // Reset form for another entry, keeping project and date
                const currentProjectId = activity.value.projectId
                const currentDate = activity.value.date
                resetForm()
                activity.value.projectId = currentProjectId
                activity.value.date = currentDate
            } else {
                closeModal()
            }
        }
    } catch (error) {
        if (error instanceof ApiError) {
            errorMessage.value = error.message
        } else {
            errorMessage.value = t("errors.general")
        }
        errorAlert(t("time.alerts.updateError"))
    }
}

// Delete activity
const handleDelete = async () => {
    if (!props.activityId) return

    if (isLocked.value) {
        errorAlert(t("time.alerts.activityLocked"))
        return
    }

    if (!confirm(t("time.alerts.confirmDelete"))) {
        return
    }

    try {
        await deleteActivity({
            params: { id: props.activityId },
        })

        emit("saved", {} as ActivityResponse) // Trigger reload
        successAlert(t("time.alerts.entryDeleted"))
        closeModal()
    } catch (error) {
        if (error instanceof ApiError) {
            errorMessage.value = error.message
        } else {
            errorMessage.value = t("errors.general")
        }
        errorAlert(t("time.alerts.deleteError"))
    }
}

// Close modal
const closeModal = () => {
    emit("update:modelValue", false)
}

// Reset form when modal opens
const resetForm = () => {
    errorMessage.value = null
    loadedActivity.value = null
    activity.value = {
        projectId: props.projectId || props.defaultProjectId || 0,
        activityTypeId: "" as any, // Start with empty string for validation
        date: new Date(),
        duration: 0,
        kilometers: 0,
        expenses: 0,
        description: "",
        billed: false,
        userId: currentUser.value?.id,
    }
}

// Watch modal visibility
watch(
    () => props.modelValue,
    async (isOpen) => {
        if (isOpen) {
            fetchActivityTypes()
            if (props.activityId) {
                await loadActivityData()
            } else {
                resetForm()
            }
        }
    }
)
</script>
