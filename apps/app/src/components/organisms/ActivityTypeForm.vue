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
                        <option v-for="cls in rateClasses" :key="cls ?? 'none'" :value="cls">
                            {{ cls ?? "—" }}
                        </option>
                    </select>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-1">
                Classe attribuée automatiquement aux collaborateurs lors de la création
            </p>
        </div>

        <div>
            <label class="flex items-center">
                <input
                    v-model="formData.applyClasses"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="ml-2 text-sm font-medium text-gray-700"> Appliquer les classes </span>
            </label>
            <p class="text-xs text-gray-500 mt-1">
                Attribue les classes aux collaborateurs selon leurs types
            </p>

            <!-- Inline preview -->
            <div v-if="formData.applyClasses" class="mt-3">
                <div v-if="previewLoading" class="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <LoadingSpinner size="sm" />
                    Chargement de l'aperçu...
                </div>
                <div v-else-if="previewChanges.length > 0" class="border border-gray-200 rounded-md overflow-hidden">
                    <!-- Summary -->
                    <div class="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex flex-wrap gap-2">
                        <span v-if="addCount" class="text-green-700 font-medium">{{ addCount }} ajout{{ addCount > 1 ? 's' : '' }}</span>
                        <span v-if="updateCount" class="text-blue-700 font-medium">{{ updateCount }} modification{{ updateCount > 1 ? 's' : '' }}</span>
                        <span v-if="removeCount" class="text-red-700 font-medium">{{ removeCount }} suppression{{ removeCount > 1 ? 's' : '' }}</span>
                        <span v-if="unchangedCount" class="text-gray-400">{{ unchangedCount }} inchangé{{ unchangedCount > 1 ? 's' : '' }}</span>
                    </div>
                    <!-- Warning -->
                    <div v-if="removeCount > 0" class="px-3 py-2 bg-red-50 border-b border-red-200 text-xs text-red-800">
                        Attention : {{ removeCount }} collaborateur{{ removeCount > 1 ? 's' : '' }} perdra{{ removeCount > 1 ? 'ont' : '' }} cette activité.
                    </div>
                    <!-- Changes list -->
                    <div class="max-h-48 overflow-y-auto divide-y divide-gray-100">
                        <div
                            v-for="change in visibleChanges"
                            :key="change.userId"
                            :class="['px-3 py-1.5 text-xs flex items-center justify-between', rowClass(change.action)]"
                        >
                            <span>
                                <span class="font-medium">{{ change.initials }}</span>
                                {{ change.firstName }} {{ change.lastName }}
                                <span class="text-gray-400">({{ collaboratorTypeLabel(change.collaboratorType) }})</span>
                            </span>
                            <span class="flex items-center gap-1.5 shrink-0 ml-2">
                                <span class="font-mono">{{ change.currentClass ?? '—' }}</span>
                                <span class="text-gray-400">→</span>
                                <span class="font-mono">{{ change.newClass ?? '—' }}</span>
                                <span :class="['px-1.5 py-0.5 rounded text-[10px] font-medium', actionBadgeClass(change.action)]">
                                    {{ actionLabel(change.action) }}
                                </span>
                            </span>
                        </div>
                    </div>
                    <!-- Toggle unchanged -->
                    <label v-if="unchangedCount > 0" class="flex items-center px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 cursor-pointer">
                        <input v-model="showUnchanged" type="checkbox" class="mr-1.5 h-3 w-3 rounded border-gray-300" />
                        Afficher les {{ unchangedCount }} inchangé{{ unchangedCount > 1 ? 's' : '' }}
                    </label>
                </div>
            </div>
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
import LoadingSpinner from "@/components/atoms/LoadingSpinner.vue"
import { usePreviewClassPresets } from "@/composables/api/useActivityType"
import type {
    ActivityTypeResponse,
    ClassPresets,
    ClassSchema,
    CollaboratorType,
    ClassPresetPreviewItem,
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
            applyClasses: boolean
        },
    ]
    cancel: []
}>()

const collaboratorTypes: { value: CollaboratorType | "default"; label: string }[] = [
    { value: "cadre", label: "Cadre" },
    { value: "chefDeProjet", label: "Chef de projet" },
    { value: "collaborateur", label: "Collaborateur" },
    { value: "operateur", label: "Opérateur" },
    { value: "secretaire", label: "Secrétaire" },
    { value: "stagiaire", label: "Stagiaire" },
    { value: "default", label: "Sans type" },
]

const rateClasses: (ClassSchema | null)[] = [null, "B", "C", "D", "E", "F", "G", "R"]

const defaultPresets: ClassPresets = {
    cadre: "R",
    chefDeProjet: "R",
    collaborateur: "R",
    operateur: "R",
    secretaire: "R",
    stagiaire: "R",
    default: "R",
}

const formData = ref({
    name: "",
    code: "",
    billable: false,
    adminOnly: false,
    classPresets: { ...defaultPresets } as ClassPresets,
    defaultDuration: null as number | null,
    applyClasses: true,
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
            applyClasses: formData.value.applyClasses,
        })
    }
}

// Preview logic
const { post: fetchPreview, loading: previewLoading } = usePreviewClassPresets()
const previewChanges = ref<ClassPresetPreviewItem[]>([])
const showUnchanged = ref(false)

let previewDebounce: ReturnType<typeof setTimeout> | null = null

const loadPreview = () => {
    if (previewDebounce) clearTimeout(previewDebounce)
    previewDebounce = setTimeout(async () => {
        if (!formData.value.applyClasses) {
            previewChanges.value = []
            return
        }
        const result = await fetchPreview({
            body: {
                activityId: props.activityType?.id,
                classPresets: formData.value.classPresets,
            },
        })
        if (result) {
            previewChanges.value = result.changes
        }
    }, 300)
}

watch(
    () => formData.value.applyClasses,
    (checked) => {
        if (checked) loadPreview()
        else previewChanges.value = []
    }
)

watch(() => formData.value.classPresets, loadPreview, { deep: true })

const visibleChanges = computed(() => {
    if (showUnchanged.value) return previewChanges.value
    return previewChanges.value.filter((c) => c.action !== "unchanged")
})

const addCount = computed(() => previewChanges.value.filter((c) => c.action === "add").length)
const updateCount = computed(() => previewChanges.value.filter((c) => c.action === "update").length)
const removeCount = computed(() => previewChanges.value.filter((c) => c.action === "remove").length)
const unchangedCount = computed(() => previewChanges.value.filter((c) => c.action === "unchanged").length)

const collaboratorTypeLabel = (type: string | null) => {
    if (!type) return "Sans type"
    return collaboratorTypes.find((ct) => ct.value === type)?.label ?? type
}

const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
        add: "Ajout",
        update: "Modifié",
        remove: "Supprimé",
        unchanged: "Inchangé",
    }
    return labels[action] ?? action
}

const actionBadgeClass = (action: string) => {
    const classes: Record<string, string> = {
        add: "bg-green-100 text-green-800",
        update: "bg-blue-100 text-blue-800",
        remove: "bg-red-100 text-red-800",
        unchanged: "bg-gray-100 text-gray-500",
    }
    return classes[action] ?? ""
}

const rowClass = (action: string) => {
    const classes: Record<string, string> = {
        add: "bg-green-50/50",
        update: "bg-blue-50/50",
        remove: "bg-red-50/50",
        unchanged: "",
    }
    return classes[action] ?? ""
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
                applyClasses: false,
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
                applyClasses: true,
            }
        }
    },
    { immediate: true }
)
</script>
