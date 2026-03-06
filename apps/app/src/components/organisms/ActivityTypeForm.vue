<template>
    <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1"> Nom </label>
            <input
                id="name"
                v-model="formData.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Développement, Support, Formation..."
            />
        </div>

        <div>
            <label for="code" class="block text-sm font-medium text-gray-700 mb-1"> Code </label>
            <input
                id="code"
                v-model="formData.code"
                type="text"
                required
                maxlength="10"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: DEV, SUP, FORM..."
            />
        </div>

        <div>
            <label class="flex items-center">
                <input
                    v-model="formData.billable"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="ml-2 text-sm font-medium text-gray-700"> Facturable </span>
            </label>
            <p class="text-xs text-gray-500 mt-1">
                Cochez si ce type d'activité peut être facturé aux clients
            </p>
        </div>

        <div>
            <label class="flex items-center">
                <input
                    v-model="formData.adminOnly"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="ml-2 text-sm font-medium text-gray-700"> Admin uniquement </span>
            </label>
            <p class="text-xs text-gray-500 mt-1">
                Réservé aux administrateurs (vacances, maladie, etc.)
            </p>
        </div>

        <div>
            <label for="defaultDuration" class="block text-sm font-medium text-gray-700 mb-1">
                Durée par défaut (heures)
            </label>
            <input
                id="defaultDuration"
                v-model.number="formData.defaultDuration"
                type="number"
                step="0.1"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 8.3"
            />
            <p class="text-xs text-gray-500 mt-1">
                Pré-rempli automatiquement lors de la saisie des heures (laissez vide pour aucun)
            </p>
        </div>

        <!-- Class Presets -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Préréglages de classe par type de collaborateur
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div v-for="ct in collaboratorTypes" :key="ct.value">
                    <label
                        :for="`preset-${ct.value}`"
                        class="block text-xs font-medium text-gray-600 mb-1"
                    >
                        {{ ct.label }}
                    </label>
                    <select
                        :id="`preset-${ct.value}`"
                        v-model="formData.classPresets[ct.value]"
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option v-for="cls in rateClasses" :key="cls" :value="cls">
                            {{ cls }}
                        </option>
                    </select>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-1">
                Classe attribuée automatiquement aux collaborateurs lors de la création
            </p>
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
import type {
    ActivityTypeResponse,
    ClassPresets,
    ClassSchema,
    CollaboratorType,
} from "@beg/validations"

interface Props {
    activityType?: ActivityTypeResponse | null
    loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
    submit: [
        data: {
            name: string
            code: string
            billable: boolean
            adminOnly: boolean
            classPresets: ClassPresets
            defaultDuration: number | null
        },
    ]
    cancel: []
}>()

const collaboratorTypes: { value: CollaboratorType; label: string }[] = [
    { value: "cadre", label: "Cadre" },
    { value: "chefDeProjet", label: "Chef de projet" },
    { value: "collaborateur", label: "Collaborateur" },
    { value: "operateur", label: "Opérateur" },
    { value: "secretaire", label: "Secrétaire" },
    { value: "stagiaire", label: "Stagiaire" },
]

const rateClasses: ClassSchema[] = ["B", "C", "D", "E", "F", "G", "R"]

const defaultPresets: ClassPresets = {
    cadre: "C",
    chefDeProjet: "D",
    collaborateur: "D",
    operateur: "E",
    secretaire: "G",
    stagiaire: "G",
}

const formData = ref({
    name: "",
    code: "",
    billable: false,
    adminOnly: false,
    classPresets: { ...defaultPresets } as ClassPresets,
    defaultDuration: null as number | null,
})

const isFormValid = computed(() => {
    return formData.value.name.trim() !== "" && formData.value.code.trim() !== ""
})

const handleSubmit = () => {
    if (isFormValid.value) {
        emit("submit", {
            name: formData.value.name.trim(),
            code: formData.value.code.trim().toUpperCase(),
            billable: formData.value.billable,
            adminOnly: formData.value.adminOnly,
            classPresets: formData.value.classPresets,
            defaultDuration: formData.value.defaultDuration || null,
        })
    }
}

// Initialize form data when activityType prop changes
watch(
    () => props.activityType,
    (newActivityType) => {
        if (newActivityType) {
            formData.value = {
                name: newActivityType.name || "",
                code: newActivityType.code || "",
                billable: newActivityType.billable || false,
                adminOnly: newActivityType.adminOnly || false,
                classPresets: newActivityType.classPresets
                    ? { ...newActivityType.classPresets }
                    : { ...defaultPresets },
                defaultDuration: newActivityType.defaultDuration ?? null,
            }
        } else {
            // Reset form for new activity type
            formData.value = {
                name: "",
                code: "",
                billable: false,
                adminOnly: false,
                classPresets: { ...defaultPresets },
                defaultDuration: null,
            }
        }
    },
    { immediate: true }
)
</script>
