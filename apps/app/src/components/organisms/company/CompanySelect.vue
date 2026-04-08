<template>
    <div class="flex gap-1 w-full">
        <AutocompleteSelect
            ref="autocompleteRef"
            v-model="selected"
            mode="async"
            :items="companies"
            :fetch-function="fetchCompanies"
            :loading="loading"
            :placeholder="placeholder || $t('company.selectCompany')"
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
            :tooltip="$t('company.new')"
            @click="showCreateModal = true"
        >
            +
        </Button>

        <CompanyEditModal v-if="allowCreate" v-model="showCreateModal" @saved="onCreated($event)" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue"
import AutocompleteSelect from "@/components/atoms/AutocompleteSelect.vue"
import Button from "@/components/atoms/Button.vue"
import CompanyEditModal from "@/components/organisms/company/CompanyEditModal.vue"
import { useFetchCompanyList, useFetchCompany } from "@/composables/api/useCompany"
import type { Company } from "@beg/validations"

interface Props {
    modelValue?: number | null | undefined
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
    "update:modelValue": [value: number | null | undefined]
}>()

const { get: fetchCompanyListApi, loading } = useFetchCompanyList()
const { get: fetchSingleCompany } = useFetchCompany()
const autocompleteRef = ref<InstanceType<typeof AutocompleteSelect>>()
const selected = ref<number | undefined>(props.modelValue || undefined)
const companies = ref<Company[]>([])
const showCreateModal = ref(false)

// Fetch selected item when modelValue changes
const fetchSelectedItem = async () => {
    if (props.modelValue && !companies.value.find((c) => c.id === props.modelValue)) {
        const data = await fetchSingleCompany({ params: { id: props.modelValue } })
        if (data) {
            companies.value = [data, ...companies.value.filter((c) => c.id !== data!.id)]
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
const handleChange = (value: string | number | undefined) => {
    emit(
        "update:modelValue",
        typeof value === "string" ? parseInt(value) : (value as number | undefined)
    )
}

// Fetch companies for autocomplete
const fetchCompanies = async (search: string) => {
    const response = await fetchCompanyListApi({
        query: {
            name: search || undefined,
            limit: 20,
            page: 1,
        },
    })

    if (response?.data) {
        companies.value = response.data
    }
}

// After creating, refresh list and select it
const onCreated = async (id?: number) => {
    if (!id) return
    const data = await fetchSingleCompany({ params: { id } })
    if (data) {
        companies.value = [data, ...companies.value.filter((c) => c.id !== data!.id)]
    }
    selected.value = id
    handleChange(id)
    await nextTick()
    autocompleteRef.value?.loadInitialItem()
}

// Load initial data
onMounted(() => {
    fetchCompanies("")
})
</script>
