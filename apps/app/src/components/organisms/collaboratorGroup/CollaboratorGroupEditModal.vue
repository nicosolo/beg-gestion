<template>
    <Dialog
        v-model="isOpen"
        :title="isNewGroup ? $t('collaboratorGroup.new') : $t('collaboratorGroup.edit')"
    >
        <form @submit.prevent="saveGroup" class="space-y-6">
            <div>
                <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ $t("collaboratorGroup.name") }} *
                </label>
                <Input
                    id="name"
                    v-model="group.name"
                    type="text"
                    required
                    :placeholder="$t('collaboratorGroup.namePlaceholder')"
                />
            </div>
        </form>

        <template #footer>
            <Button variant="secondary" @click="closeModal" :disabled="saving">
                {{ $t("common.cancel") }}
            </Button>
            <Button
                variant="primary"
                @click="saveGroup"
                :disabled="!group.name"
                :loading="saving"
            >
                {{ $t("common.save") }}
            </Button>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import Dialog from "@/components/molecules/Dialog.vue"
import Button from "@/components/atoms/Button.vue"
import Input from "@/components/atoms/Input.vue"
import {
    useFetchCollaboratorGroup,
    useCreateCollaboratorGroup,
    useUpdateCollaboratorGroup,
} from "@/composables/api/useCollaboratorGroup"
import { useAlert } from "@/composables/utils/useAlert"
import type {
    CollaboratorGroupCreateInput,
    CollaboratorGroupUpdateInput,
} from "@beg/validations"

interface Props {
    modelValue: boolean
    groupId?: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
    "update:modelValue": [value: boolean]
    saved: [id?: number]
}>()

const { t } = useI18n()
const { successAlert, errorAlert } = useAlert()

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
})
const isNewGroup = computed(() => !props.groupId)

const { get: fetchGroup, loading: fetching } = useFetchCollaboratorGroup()
const { post: createGroup, loading: creating } = useCreateCollaboratorGroup()
const { put: updateGroup, loading: updating } = useUpdateCollaboratorGroup()

const saving = computed(() => creating.value || updating.value || fetching.value)
const group = ref<CollaboratorGroupCreateInput>({
    name: "",
})

const loadGroupData = async () => {
    if (!props.groupId) {
        group.value = { name: "" }
        return
    }

    try {
        const data = await fetchGroup({ params: { id: props.groupId } })
        if (data) {
            group.value = { name: data.name }
        }
    } catch (error) {
        console.error("Error loading group:", error)
        closeModal()
    }
}

const saveGroup = async () => {
    if (!group.value.name) {
        errorAlert(t("validation.required", { field: t("collaboratorGroup.name") }))
        return
    }

    let savedId: number | undefined
    if (isNewGroup.value) {
        const result = await createGroup({ body: group.value })
        savedId = result?.id
        successAlert(t("collaboratorGroup.createSuccess"))
    } else if (props.groupId) {
        await updateGroup({
            params: { id: props.groupId },
            body: group.value as CollaboratorGroupUpdateInput,
        })
        savedId = props.groupId
        successAlert(t("collaboratorGroup.updateSuccess"))
    }

    emit("saved", savedId)
    closeModal()
}

const closeModal = () => {
    isOpen.value = false
}

watch(isOpen, (newValue) => {
    if (newValue) {
        loadGroupData()
    }
})
</script>
