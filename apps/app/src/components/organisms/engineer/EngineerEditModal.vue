<template>
    <Dialog v-model="isOpen" :title="isNewEngineer ? $t('engineer.new') : $t('engineer.edit')">
        <form @submit.prevent="saveEngineer" class="space-y-6">
            <div>
                <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ $t("engineer.name") }} *
                </label>
                <Input
                    id="name"
                    v-model="engineer.name"
                    type="text"
                    required
                    :placeholder="$t('engineer.namePlaceholder')"
                />
            </div>
        </form>

        <template #footer>
            <Button variant="secondary" @click="closeModal" :disabled="saving">
                {{ $t("common.cancel") }}
            </Button>
            <Button
                variant="primary"
                @click="saveEngineer"
                :disabled="!engineer.name"
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
    useFetchEngineer,
    useCreateEngineer,
    useUpdateEngineer,
} from "@/composables/api/useEngineer"
import { useAlert } from "@/composables/utils/useAlert"
import type { EngineerCreateInput, EngineerUpdateInput } from "@beg/validations"

interface Props {
    modelValue: boolean
    engineerId?: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
    "update:modelValue": [value: boolean]
    saved: [id?: number]
}>()

const { t } = useI18n()
const { successAlert, errorAlert } = useAlert()

// Computed
const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
})
const isNewEngineer = computed(() => !props.engineerId)

// API composables
const { get: fetchEngineer, loading: fetching } = useFetchEngineer()
const { post: createEngineer, loading: creating } = useCreateEngineer()
const { put: updateEngineer, loading: updating } = useUpdateEngineer()

// State
const saving = computed(() => creating.value || updating.value || fetching.value)
const engineer = ref<EngineerCreateInput>({
    name: "",
})

// Load engineer data if editing
const loadEngineerData = async () => {
    if (!props.engineerId) {
        // Reset form for new engineer
        engineer.value = {
            name: "",
        }
        return
    }

    try {
        const data = await fetchEngineer({ params: { id: props.engineerId } })
        if (data) {
            engineer.value = {
                name: data.name,
            }
        }
    } catch (error) {
        console.error("Error loading engineer:", error)
        closeModal()
    }
}

// Save engineer
const saveEngineer = async () => {
    if (!engineer.value.name) {
        errorAlert(t("validation.required", { field: t("engineer.name") }))
        return
    }

    let savedId: number | undefined
    if (isNewEngineer.value) {
        const result = await createEngineer({ body: engineer.value })
        savedId = result?.id
        successAlert(t("engineer.createSuccess"))
    } else if (props.engineerId) {
        await updateEngineer({
            params: { id: props.engineerId },
            body: engineer.value as EngineerUpdateInput,
        })
        savedId = props.engineerId
        successAlert(t("engineer.updateSuccess"))
    }

    emit("saved", savedId)
    closeModal()
}

// Close modal
const closeModal = () => {
    isOpen.value = false
}

// Watch for modal open/close
watch(isOpen, (newValue) => {
    if (newValue) {
        loadEngineerData()
    }
})
</script>
