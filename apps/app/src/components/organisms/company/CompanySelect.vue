<template>
    <div class="w-full">
        <AutocompleteSelect
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
            @update:model-value="handleChange"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue"
import AutocompleteSelect from "@/components/atoms/AutocompleteSelect.vue"
import { useFetchCompanyList, useFetchCompany } from "@/composables/api/useCompany"
import type { Company } from "@beg/validations"

interface Props {
    modelValue?: number | undefined
    placeholder?: string
    required?: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    required: false,
    disabled: false,
})

const emit = defineEmits<{
    "update:modelValue": [value: number | undefined]
}>()

const { get: fetchCompanyListApi, loading } = useFetchCompanyList()
const { get: fetchSingleCompany } = useFetchCompany()
const selected = ref<number | undefined>(props.modelValue || undefined)
const companies = ref<Company[]>([])

// Fetch selected item when modelValue changes
const fetchSelectedItem = async () => {
    if (props.modelValue && !companies.value.find((c) => c.id === props.modelValue)) {
        const data = await fetchSingleCompany({ params: { id: props.modelValue } })
        if (data) {
            // Add the selected item to the companies array if not already there
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

// Load initial data
onMounted(() => {
    fetchCompanies("")
})
</script>
