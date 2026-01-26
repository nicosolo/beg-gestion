<template>
    <div class="bg-white">
        <!-- Header with title and actions -->
        <div class="py-4 border-b border-gray-200">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <div class="flex flex-wrap items-baseline gap-2">
                        <h1 class="text-2xl font-bold">
                            {{ $t("projects.preview") }}
                        </h1>
                        <strong class="text-2xl text-gray-500 leading-tight">
                            {{ projectData?.projectNumber }}
                            {{
                                projectData?.subProjectName ? ` ${projectData.subProjectName}` : ""
                            }}
                        </strong>
                        <Badge v-if="projectData?.archived" variant="error" size="md">
                            {{ $t("projects.markAsArchived") }}
                        </Badge>
                        <Badge v-else-if="projectData?.ended" variant="muted" size="md">
                            {{ $t("projects.markAsEnded") }}
                        </Badge>
                        <Badge v-else-if="projectData?.isDraft" variant="amber" size="md">
                            {{ $t("projects.draft") }}
                        </Badge>
                    </div>
                    <span class="text-lg text-gray-900 leading-tight">
                        {{ projectData?.name || "-" }}
                    </span>
                </div>
                <div class="flex flex-wrap gap-2 justify-start md:justify-end">
                    <Button
                        v-if="canEditProject"
                        class="w-full sm:w-auto"
                        variant="primary"
                        :to="{ name: 'project-edit', params: { id: projectId } }"
                    >
                        {{ $t("common.edit") }}
                    </Button>
                    <Button
                        v-if="canEditProject"
                        class="w-full sm:w-auto"
                        variant="primary"
                        :to="{ name: 'invoice-new', query: { projectId: projectId } }"
                    >
                        {{ $t("invoice.new") }}
                    </Button>
                    <Button
                        v-if="canViewActivitiesAndInvoices"
                        class="w-full sm:w-auto"
                        variant="secondary"
                        @click="showTimeEntryModal = true"
                    >
                        {{ $t("time.new") }}
                    </Button>
                    <Button
                        @click="openProjectFolder"
                        v-if="projectFolder?.found"
                        type="button"
                        class="text-sm px-3 py-1.5 rounded-md font-medium focus:outline-none focus:ring-2 cursor-pointer leading-none block text-center hover:bg-indigo-200 text-indigo-700 w-full sm:w-auto"
                    >
                        Ouvrir dossier
                    </Button>
                </div>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="border-b border-gray-200">
            <nav class="flex flex-wrap gap-2 -mb-px overflow-x-auto">
                <button
                    @click="activeTab = 'overview'"
                    :class="[
                        'py-4 px-6 font-medium text-sm cursor-pointer shrink-0',
                        activeTab === 'overview'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]"
                >
                    {{ $t("projects.tabs.overview") }}
                </button>
                <button
                    v-if="canViewActivitiesAndInvoices"
                    @click="activeTab = 'activities'"
                    :class="[
                        'py-4 px-6 font-medium text-sm cursor-pointer shrink-0',
                        activeTab === 'activities'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]"
                >
                    {{ $t("projects.tabs.activities") }}
                </button>
                <button
                    v-if="canEditProject"
                    @click="activeTab = 'invoices'"
                    :class="[
                        'py-4 px-6 font-medium text-sm cursor-pointer shrink-0',
                        activeTab === 'invoices'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]"
                >
                    {{ $t("projects.tabs.invoices") }}
                </button>
            </nav>
        </div>

        <!-- Tab Content -->
        <LoadingOverlay :loading="loading">
            <div v-if="projectData" class="pt-6">
                <!-- Overview Tab -->
                <div v-show="activeTab === 'overview'" class="space-y-6">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Project Details -->
                        <div class="lg:col-span-2">
                            <div class="bg-gray-50 rounded-lg border-1 p-4 border-gray-300">
                                <h2 class="text-lg font-semibold mb-4">
                                    {{ $t("projects.details") }}
                                </h2>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.mandat") }}
                                        </p>
                                        <p class="font-medium">
                                            {{ projectData.projectNumber }}
                                            {{
                                                projectData.subProjectName
                                                    ? ` ${projectData.subProjectName}`
                                                    : ""
                                            }}
                                        </p>
                                    </div>

                                    <div>
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.date") }}
                                        </p>
                                        <p class="font-medium">
                                            {{ formatDate(projectData.startDate) }}
                                        </p>
                                    </div>

                                    <div class="col-span-2">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.designation") }}
                                        </p>
                                        <p class="font-medium">{{ projectData.name }}</p>
                                    </div>

                                    <div v-if="projectData.client">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.client") }}
                                        </p>
                                        <p class="font-medium">{{ projectData.client.name }}</p>
                                    </div>

                                    <div v-if="projectData.company">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.enterprise") }}
                                        </p>
                                        <p class="font-medium">{{ projectData.company.name }}</p>
                                    </div>

                                    <div v-if="projectData.types && projectData.types.length > 0">
                                        <p class="text-sm text-gray-500 mb-2">
                                            {{ $t("projects.type") }}
                                        </p>
                                        <div class="flex flex-wrap gap-2">
                                            <Badge
                                                v-for="type in projectData.types"
                                                :key="type.id"
                                                variant="amber"
                                                size="md"
                                            >
                                                {{ type.name }}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div v-if="projectData.engineer">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.engineer") }}
                                        </p>
                                        <p class="font-medium">{{ projectData.engineer.name }}</p>
                                    </div>

                                    <div
                                        v-if="
                                            projectData.projectManagers &&
                                            projectData.projectManagers.length > 0
                                        "
                                        class="col-span-2"
                                    >
                                        <p class="text-sm text-gray-500 mb-2">
                                            {{ $t("projects.responsible") }}
                                        </p>
                                        <div class="flex flex-wrap gap-2">
                                            <Badge
                                                v-for="manager in projectData.projectManagers"
                                                :key="manager.id"
                                                variant="blue"
                                                size="md"
                                            >
                                                {{ manager.firstName }} {{ manager.lastName }}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div
                                        v-if="
                                            projectData.projectMembers &&
                                            projectData.projectMembers.length > 0
                                        "
                                        class="col-span-2"
                                    >
                                        <p class="text-sm text-gray-500 mb-2">
                                            {{ $t("projects.members") }}
                                        </p>
                                        <div class="flex flex-wrap gap-2">
                                            <Badge
                                                v-for="member in projectData.projectMembers"
                                                :key="member.id"
                                                size="md"
                                            >
                                                {{ member.firstName }} {{ member.lastName }}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div v-if="mapLink" class="col-span-2">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.coordinates") }}
                                        </p>
                                        <div
                                            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                                        >
                                            <span class="font-medium">
                                                {{ formattedCoordinates || "—" }}
                                            </span>
                                            <div class="flex flex-wrap items-center gap-3 text-sm">
                                                <a
                                                    v-if="googleMapsLink"
                                                    :href="googleMapsLink ?? undefined"
                                                    target="_blank"
                                                    rel="noopener"
                                                    class="text-indigo-600 hover:underline"
                                                >
                                                    {{ $t("projects.openGoogleMaps") }}
                                                </a>
                                                <a
                                                    :href="mapLink ?? undefined"
                                                    target="_blank"
                                                    rel="noopener"
                                                    class="text-indigo-600 hover:underline"
                                                >
                                                    {{ $t("projects.openGeoAdminMap") }}
                                                </a>
                                            </div>
                                        </div>
                                        <div
                                            v-if="
                                                projectData.latitude !== null &&
                                                projectData.longitude !== null
                                            "
                                            class="mt-2 col-span-3"
                                        >
                                            <MapDisplay
                                                :latitude="projectData.latitude"
                                                :longitude="projectData.longitude"
                                                :zoom="14"
                                                height="250px"
                                            />
                                        </div>
                                    </div>
                                    <!-- Map Display -->

                                    <div v-if="projectData.invoicingAddress" class="col-span-2">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.invoicingAddress") }}
                                        </p>
                                        <p class="font-medium whitespace-pre-line">
                                            {{ projectData.invoicingAddress }}
                                        </p>
                                    </div>

                                    <div v-if="projectData.remark" class="col-span-2">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.remark") }}
                                        </p>
                                        <p class="font-medium whitespace-pre-line">
                                            {{ projectData.remark }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Project Statistics -->
                        <div>
                            <div class="bg-gray-50 rounded-lg border-1 p-4 border-gray-300">
                                <h2 class="text-lg font-semibold mb-4">
                                    {{ $t("projects.statistics") }}
                                </h2>
                                <div class="space-y-4">
                                    <div v-if="projectData.offerAmount">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.offerAmount") }}
                                        </p>
                                        <p class="font-medium text-lg">
                                            CHF {{ formatNumber(projectData.offerAmount) }}
                                        </p>
                                    </div>
                                    <div v-if="projectData.totalDuration">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.totalDuration") }}
                                        </p>
                                        <p class="font-medium text-lg">
                                            {{ formatNumber(projectData.totalDuration) }}
                                        </p>
                                    </div>
                                    <div v-if="projectData.unBilledDuration">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.unBilledDuration") }}
                                        </p>
                                        <p class="font-medium text-lg text-orange-600">
                                            {{ formatNumber(projectData.unBilledDuration) }}
                                        </p>
                                    </div>
                                    <div v-if="projectData.firstActivityDate">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.firstActivity") }}
                                        </p>
                                        <p class="font-medium">
                                            {{ formatDate(projectData.firstActivityDate) }}
                                        </p>
                                    </div>
                                    <div v-if="projectData.lastActivityDate">
                                        <p class="text-sm text-gray-500">
                                            {{ $t("projects.lastActivity") }}
                                        </p>
                                        <p class="font-medium">
                                            {{ formatDate(projectData.lastActivityDate) }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Activities Tab -->
                <div v-if="canViewActivitiesAndInvoices" v-show="activeTab === 'activities'">
                    <TimeEntriesManager
                        :show-project-filter="false"
                        :show-user-filter="
                            projectData.projectManagers.some((pm) => pm.id === authStore.user?.id)
                        "
                        :available-users="availableUsers"
                        :initial-filter="{
                            projectId: projectId,
                            userId: projectData.projectManagers.some(
                                (pm) => pm.id === authStore.user?.id
                            )
                                ? undefined
                                : authStore.user?.id,
                            fromDate: initialFromDate,
                            toDate: initialToDate,
                        }"
                        :hide-columns="['project']"
                        empty-message="Aucune entrée d'heure trouvée pour ce mandat"
                    />
                </div>

                <!-- Invoices Tab -->
                <div v-if="canEditProject" v-show="activeTab === 'invoices'">
                    <InvoiceListManager
                        :initial-filter="{ projectId: projectId }"
                        :hide-columns="['project']"
                        :show-delete="false"
                        empty-message="Aucune facture trouvée pour ce mandat"
                    />
                </div>
            </div>
        </LoadingOverlay>

        <!-- Time Entry Modal -->
        <TimeEntryModal
            v-model="showTimeEntryModal"
            :project-id="projectId"
            @saved="handleTimeEntrySaved"
        />
    </div>
</template>

<script setup lang="ts">
defineOptions({ name: "ProjectPreviewView" })

import { ref, computed, watch, onActivated } from "vue"
import { useRoute, useRouter } from "vue-router"
import Button from "@/components/atoms/Button.vue"
import Badge from "@/components/atoms/Badge.vue"
import TimeEntriesManager from "@/components/organisms/time/TimeEntriesManager.vue"
import InvoiceListManager from "@/components/organisms/invoice/InvoiceListManager.vue"
import TimeEntryModal from "@/components/organisms/time/TimeEntryModal.vue"
import { useFetchProject, useProjectFolder } from "@/composables/api/useProject"
import LoadingOverlay from "@/components/atoms/LoadingOverlay.vue"
import MapDisplay from "@/components/molecules/MapDisplay.vue"
import { useFormat } from "@/composables/utils/useFormat"
import { useTauri } from "@/composables/useTauri"
import { buildGeoAdminUrl, buildGoogleMapsUrl } from "@/utils/coordinates"
import { useAuthStore } from "@/stores/auth"
import { useAppSettingsStore } from "@/stores/appSettings"
import { getMonthRange } from "@/composables/utils/useDateRangePresets"
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { from: initialFromDate, to: initialToDate } = getMonthRange()
// Tab state - get from query string or default to overview
const activeTab = computed({
    get: () => (route.query.tab as string) || "overview",
    set: (value) => {
        router.push({
            query: { ...route.query, tab: value },
        })
    },
})
const showTimeEntryModal = ref(false)

// API client
const { get: fetchProject, loading, data: projectData } = useFetchProject()
const { get: fetchProjectFolder, data: projectFolder } = useProjectFolder()
const { formatNumber, formatDate } = useFormat()
const { isTauri, openFolder } = useTauri()
const mapLink = computed(() =>
    buildGeoAdminUrl(projectData.value?.longitude ?? null, projectData.value?.latitude ?? null)
)

const googleMapsLink = computed(() =>
    buildGoogleMapsUrl(projectData.value?.longitude ?? null, projectData.value?.latitude ?? null)
)
const availableUsers = computed(() => {
    return [
        ...(projectData.value?.projectManagers?.map((pm) => pm.id) || []),
        ...(projectData.value?.projectMembers?.map((pm) => pm.id) || []),
    ]
})
// Check if current user is assigned to this project (manager or member)
const isAssignedToProject = computed(() => {
    if (!projectData.value || !authStore.user) return false

    const isManager = projectData.value.projectManagers?.some((pm) => pm.id === authStore.user?.id)
    const isMember = projectData.value.projectMembers?.some((pm) => pm.id === authStore.user?.id)

    return isManager || isMember
})

// Check if current user can view Hours and Invoices (admin or assigned)
const canViewActivitiesAndInvoices = computed(() => {
    if (authStore.isRole("admin")) return true
    return isAssignedToProject.value
})

// Check if current user can edit this project
const canEditProject = computed(() => {
    // Admins can always edit
    if (authStore.isRole("admin")) {
        return true
    }

    // Check if user is a project manager of this project
    if (projectData.value?.projectManagers && authStore.user) {
        return projectData.value.projectManagers.some((pm) => pm.id === authStore.user?.id)
    }

    return false
})

const formattedCoordinates = computed(() => {
    if (
        projectData.value?.latitude === null ||
        projectData.value?.longitude === null ||
        projectData.value?.latitude === undefined ||
        projectData.value?.longitude === undefined
    ) {
        return null
    }

    const formatCoordinate = (value: number) =>
        Number.isInteger(value) ? value.toString() : value.toFixed(6)

    return `${formatCoordinate(projectData.value.latitude)}, ${formatCoordinate(projectData.value.longitude)}`
})

// Get project ID from route
const projectId = computed(() => parseInt(route.params.id as string))

watch(
    () => projectData.value,
    async () => {
        document.title = `BEG - Mandat ${projectData.value?.projectNumber || ""}`
    },
    { immediate: true }
)

// Load project data on mount
onActivated(async () => {
    console.log("onActivated a ProjectPreviewView")
    if (projectId.value && !isNaN(projectId.value)) {
        if (isTauri.value) {
            await fetchProjectFolder({ params: { id: projectId.value } })
        }
        await fetchProject({ params: { id: projectId.value } })
    }
})

// Handle time entry saved
const handleTimeEntrySaved = async () => {
    // Refresh project data to update unbilled duration
    if (projectId.value && !isNaN(projectId.value)) {
        await fetchProject({ params: { id: projectId.value } })
    }
    // Switch to activities tab to show the new entry
    activeTab.value = "activities"
}

// Open project folder in native finder
const openProjectFolder = async (e?: Event) => {
    if (!projectFolder.value?.folder?.fullPath) return

    if (isTauri.value) {
        // Prevent default link behavior in Tauri
        e?.preventDefault()

        // Get app settings store to build absolute path
        const appSettingsStore = useAppSettingsStore()
        const absolutePath = appSettingsStore.getAbsolutePath(projectFolder.value.folder.fullPath)

        // Use Tauri API to open folder with absolute path
        const success = await openFolder(absolutePath)
        if (!success) {
            console.error("Failed to open folder in Tauri")
        }
        console.log(success)
    }
}
</script>
