<template>
    <LoadingOverlay :loading="loading">
        <div class="container mx-auto">
            <div class="flex items-center justify-between mb-6">
                <h1 class="text-2xl font-bold">Journal d'audit</h1>
            </div>

            <div v-if="error" class="bg-red-50 text-red-600 p-4 rounded mb-6">
                {{ typeof error === "string" ? error : "Une erreur s'est produite" }}
            </div>

            <!-- Filters -->
            <div class="flex flex-wrap gap-3 mb-4 items-end">
                <select
                    v-model="filters.entity"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    @change="loadData()"
                >
                    <option value="">Toutes les entités</option>
                    <option v-for="(label, key) in entityLabels" :key="key" :value="key">
                        {{ label }}
                    </option>
                </select>
                <select
                    v-model="filters.action"
                    class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    @change="loadData()"
                >
                    <option value="">Toutes les actions</option>
                    <option value="create">Création</option>
                    <option value="update">Modification</option>
                    <option value="delete">Suppression</option>
                    <option value="login_success">Connexion réussie</option>
                    <option value="login_failure">Connexion échouée</option>
                </select>
            </div>

            <!-- Date range filter -->
            <div class="mb-4">
                <DateRange
                    :from-date="filters.fromDate"
                    :to-date="filters.toDate"
                    from-label="Du"
                    to-label="Au"
                    @change="onDateRangeChange"
                />
            </div>

            <!-- Log entries -->
            <div class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                <div
                    v-for="log in logs"
                    :key="log.id"
                    class="px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
                >
                    <span class="text-gray-400 whitespace-nowrap text-xs">
                        {{ formatDateTime(log.createdAt) }}
                    </span>
                    <span class="text-gray-900">
                        {{ formatLog(log) }}
                    </span>
                </div>
                <div v-if="logs.length === 0" class="px-4 py-8 text-center text-gray-500">
                    Aucune entrée trouvée
                </div>
            </div>

            <!-- Pagination -->
            <div
                v-if="totalPages > 1"
                class="flex items-center justify-center gap-2 mt-4"
            >
                <Button
                    variant="secondary"
                    size="sm"
                    :disabled="currentPage <= 1"
                    @click="goToPage(currentPage - 1)"
                >
                    Précédent
                </Button>
                <span class="text-sm text-gray-600">
                    Page {{ currentPage }} / {{ totalPages }}
                </span>
                <Button
                    variant="secondary"
                    size="sm"
                    :disabled="currentPage >= totalPages"
                    @click="goToPage(currentPage + 1)"
                >
                    Suivant
                </Button>
            </div>
        </div>
    </LoadingOverlay>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import Button from "@/components/atoms/Button.vue"
import DateRange from "@/components/molecules/DateRange.vue"
import { useFetchAuditLogs } from "@/composables/api/useAuditLog"
import type { AuditLogResponse } from "@beg/validations"

const { get: fetchAuditLogs, loading, error, data: response } = useFetchAuditLogs()

const filters = ref<{
    entity: string
    action: string
    fromDate?: Date
    toDate?: Date
}>({
    entity: "",
    action: "",
})
const currentPage = ref(1)

const logs = computed(() => response.value?.data ?? [])
const totalPages = computed(() => response.value?.totalPages ?? 1)

const entityLabels: Record<string, string> = {
    auth: "Authentification",
    activity: "Activité",
    activityType: "Type d'activité",
    project: "Mandat",
    invoice: "Facture",
    client: "Client",
    company: "Bureau",
    engineer: "Ingénieur",
    location: "Lieu",
    user: "Utilisateur",
    rate: "Tarif",
    projectType: "Type de mandat",
    vatRate: "Taux TVA",
    monthlyHours: "Heures mensuelles",
    workload: "Charge de travail",
}

const actionVerbs: Record<string, string> = {
    create: "a créé",
    update: "a modifié",
    delete: "a supprimé",
    login_success: "s'est connecté",
    login_failure: "tentative de connexion échouée",
}

const entityArticles: Record<string, string> = {
    auth: "",
    activity: "une activité",
    activityType: "un type d'activité",
    project: "un mandat",
    invoice: "une facture",
    client: "un client",
    company: "un bureau",
    engineer: "un ingénieur",
    location: "un lieu",
    user: "un utilisateur",
    rate: "un tarif",
    projectType: "un type de mandat",
    vatRate: "un taux TVA",
    monthlyHours: "des heures mensuelles",
    workload: "une charge de travail",
}

function formatDateTime(dateStr: string | Date) {
    const d = new Date(dateStr)
    return d.toLocaleString("fr-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function formatLog(log: AuditLogResponse) {
    const verb = actionVerbs[log.action] ?? log.action
    const entity = entityArticles[log.entity] ?? log.entity

    if (log.action === "login_success") {
        return `${log.userInitials} ${verb}`
    }
    if (log.action === "login_failure") {
        return `${log.userInitials} — ${verb}`
    }

    const metaStr = log.meta
        ? Object.entries(log.meta)
              .filter(([, v]) => v !== null && v !== undefined)
              .map(([, v]) => String(v))
              .join(", ")
        : ""

    return `${log.userInitials} ${verb} ${entity}${metaStr ? ` (${metaStr})` : ""}`
}

const onDateRangeChange = (value: { fromDate?: Date; toDate?: Date }) => {
    filters.value.fromDate = value.fromDate
    filters.value.toDate = value.toDate
    currentPage.value = 1
    loadData()
}

const loadData = async () => {
    await fetchAuditLogs({
        query: {
            page: currentPage.value,
            limit: 50,
            ...(filters.value.entity ? { entity: filters.value.entity } : {}),
            ...(filters.value.action ? { action: filters.value.action } : {}),
            ...(filters.value.fromDate ? { fromDate: filters.value.fromDate.toISOString() } : {}),
            ...(filters.value.toDate ? { toDate: filters.value.toDate.toISOString() } : {}),
        },
    })
}

const goToPage = (page: number) => {
    currentPage.value = page
    loadData()
}

onMounted(() => {
    document.title = "BEG - Journal d'audit"
    loadData()
})
</script>
