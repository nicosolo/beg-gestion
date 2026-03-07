<template>
    <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
            <label for="class" class="block text-sm font-medium text-gray-700 mb-1"> Classe </label>
            <select
                id="class"
                v-model="formData.class"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="">Sélectionner une classe</option>
                <option v-for="cls in availableClasses" :key="cls" :value="cls">
                    {{ cls }}
                </option>
            </select>
        </div>

        <div>
            <label for="year" class="block text-sm font-medium text-gray-700 mb-1"> Année </label>
            <input
                id="year"
                v-model.number="formData.year"
                type="number"
                required
                min="1990"
                max="2100"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                :placeholder="`Ex: ${new Date().getFullYear()}`"
            />
        </div>

        <div>
            <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
                Montant (CHF)
            </label>
            <input
                id="amount"
                v-model.number="formData.amount"
                type="number"
                required
                min="0"
                step="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 150.00"
            />
        </div>

        <div class="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" @click="$emit('cancel')" :disabled="loading">
                Annuler
            </Button>
            <Button
                type="submit"
                variant="primary"
                :disabled="loading || !isFormValid"
                :loading="loading"
            >
                {{ $t("common.save") }}
            </Button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import Button from "@/components/atoms/Button.vue"
import type { RateClassSchema, ClassSchema } from "@beg/validations"

interface Props {
    tariff?: RateClassSchema | null
    loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
    submit: [data: { class: ClassSchema; year: number; amount: number }]
    cancel: []
}>()

// Available class options
const availableClasses: ClassSchema[] = ["A", "B", "C", "D", "E", "F", "G", "R", "Z"]

const formData = ref<{
    class: ClassSchema | ""
    year: number
    amount: number
}>({
    class: "",
    year: new Date().getFullYear(),
    amount: 0,
})

const isFormValid = computed(() => {
    return (
        formData.value.class !== "" &&
        availableClasses.includes(formData.value.class as ClassSchema) &&
        formData.value.year >= 1990 &&
        formData.value.year <= 2100 &&
        formData.value.amount >= 0
    )
})

const handleSubmit = () => {
    if (isFormValid.value && formData.value.class !== "") {
        emit("submit", {
            class: formData.value.class as ClassSchema,
            year: formData.value.year,
            amount: formData.value.amount,
        })
    }
}

// Initialize form data when tariff prop changes
watch(
    () => props.tariff,
    (newTariff) => {
        if (newTariff) {
            formData.value = {
                class: newTariff.class || "",
                year: newTariff.year || new Date().getFullYear(),
                amount: newTariff.amount || 0,
            }
        } else {
            // Reset form for new tariff
            formData.value = {
                class: "",
                year: new Date().getFullYear(),
                amount: 0,
            }
        }
    },
    { immediate: true }
)
</script>
