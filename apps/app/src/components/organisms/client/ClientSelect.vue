<template>
    <div class="flex gap-1 w-full">
        <AutocompleteSelect
            ref="autocompleteRef"
            v-model="selected"
            mode="async"
            :items="clients"
            :fetch-function="fetchClients"
            :loading="loading"
            :placeholder="placeholder || $t('client.selectClient')"
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
            :tooltip="$t('client.new')"
            @click="showCreateModal = true"
        >
            +
        </Button>

        <ClientEditModal
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
import ClientEditModal from "@/components/organisms/client/ClientEditModal.vue"
import { useFetchClientList, useFetchClient } from "@/composables/api/useClient"
import type { Client } from "@beg/validations"

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

const { get: fetchClientListApi, loading } = useFetchClientList()
const { get: fetchSingleClient } = useFetchClient()
const autocompleteRef = ref<InstanceType<typeof AutocompleteSelect>>()
const selected = ref<number | null | undefined | string>(props.modelValue || undefined)
const clients = ref<Client[]>([])
const showCreateModal = ref(false)

// Fetch selected item when modelValue changes
const fetchSelectedItem = async () => {
    if (props.modelValue && !clients.value.find((c) => c.id === props.modelValue)) {
        const data = await fetchSingleClient({
            params: {
                id:
                    typeof props.modelValue === "string"
                        ? parseInt(props.modelValue)
                        : props.modelValue,
            },
        })
        if (data) {
            // Add the selected item to the clients array if not already there
            clients.value = [data, ...clients.value.filter((c) => c.id !== data!.id)]
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

// Fetch clients for autocomplete
const fetchClients = async (search: string) => {
    const response = await fetchClientListApi({
        query: {
            name: search || undefined,
            limit: 20,
            page: 1,
        },
    })

    if (response?.data) {
        clients.value = response.data
    }
}

// After creating a new client, refresh list and select it
const onCreated = async (id?: number) => {
    if (!id) return
    // Fetch the newly created item by ID and add to list
    const data = await fetchSingleClient({ params: { id } })
    if (data) {
        clients.value = [data, ...clients.value.filter((c) => c.id !== data!.id)]
    }
    selected.value = id
    handleChange(id)
    await nextTick()
    autocompleteRef.value?.loadInitialItem()
}

// Load initial data
onMounted(() => {
    fetchClients("")
})
</script>
