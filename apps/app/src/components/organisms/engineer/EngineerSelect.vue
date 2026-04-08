<template>
    <div class="flex gap-1 w-full">
        <AutocompleteSelect
            ref="autocompleteRef"
            v-model="selected"
            mode="async"
            :items="engineers"
            :fetch-function="fetchEngineers"
            :loading="loading"
            :placeholder="placeholder || $t('engineer.selectEngineer')"
            :required="required"
            :disabled="disabled"
            :display-field="(item) => item.name"
            value-field="id"
            class="flex-1"
            @update:model-value="handleChange"
        />
        <Button
            v-if="allowCreate && !disabled"
            variant="ghost"
            size="xs"
            class-name="shrink-0 h-9 w-9 border border-gray-300"
            :tooltip="$t('engineer.new')"
            @click="showCreateModal = true"
        >
            +
        </Button>

        <EngineerEditModal
            v-if="allowCreate"
            v-model="showCreateModal"
            @saved="onCreated($event)"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue"
import AutocompleteSelect from "@/components/atoms/AutocompleteSelect.vue"
import Button from "@/components/atoms/Button.vue"
import EngineerEditModal from "@/components/organisms/engineer/EngineerEditModal.vue"
import { useFetchEngineerList, useFetchEngineer } from "@/composables/api/useEngineer"
import type { Engineer } from "@beg/validations"

interface Props {
    modelValue?: number | null | undefined | string
    placeholder?: string
    required?: boolean
    disabled?: boolean
    allowCreate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    required: false,
    disabled: false,
    allowCreate: false,
})

const emit = defineEmits<{
    "update:modelValue": [value: number | null | undefined | string]
}>()

const { get: fetchEngineerListApi, loading } = useFetchEngineerList()
const { get: fetchSingleEngineer } = useFetchEngineer()
const autocompleteRef = ref<InstanceType<typeof AutocompleteSelect>>()
const selected = ref<number | null | undefined | string>(props.modelValue || undefined)
const engineers = ref<Engineer[]>([])
const showCreateModal = ref(false)

// Fetch selected item when modelValue changes
const fetchSelectedItem = async () => {
    if (props.modelValue && !engineers.value.find((e) => e.id === props.modelValue)) {
        const data = await fetchSingleEngineer({
            params: {
                id:
                    typeof props.modelValue === "string"
                        ? parseInt(props.modelValue)
                        : props.modelValue,
            },
        })
        if (data) {
            engineers.value = [data, ...engineers.value.filter((e) => e.id !== data!.id)]
        }
    }
}

// Watch for external changes
watch(
    () => props.modelValue,
    async (newValue) => {
        if (newValue !== selected.value) {
            selected.value = newValue || undefined
            await fetchSelectedItem()
        }
    },
    { immediate: true }
)

// Emit changes
const handleChange = (value: string | number | null | undefined) => {
    emit(
        "update:modelValue",
        typeof value === "string" ? parseInt(value) : (value as number | undefined)
    )
}

// Fetch engineers for autocomplete
const fetchEngineers = async (search: string) => {
    const response = await fetchEngineerListApi({
        query: {
            name: search || undefined,
            limit: 20,
            page: 1,
        },
    })

    if (response?.data) {
        engineers.value = response.data
    }
}

// After creating, refresh list and select it
const onCreated = async (id?: number) => {
    if (!id) return
    const data = await fetchSingleEngineer({
        params: { id },
    })
    if (data) {
        engineers.value = [data, ...engineers.value.filter((e) => e.id !== data!.id)]
    }
    selected.value = id
    handleChange(id)
    await nextTick()
    autocompleteRef.value?.loadInitialItem()
}

// Load initial data
onMounted(() => {
    fetchEngineers("")
})
</script>
