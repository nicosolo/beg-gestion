<template>
    <FormLayout
        :title="isNewProject ? $t('projects.new') : $t('projects.edit')"
        :loading="isSubmitting || loadingData"
        :error-message="errorMessage"
    >
        <!-- Project mode tabs (only for new projects) -->
        <div v-if="isNewProject" class="border-b border-gray-200 mb-4">
            <nav class="flex gap-2 -mb-px">
                <button
                    type="button"
                    @click="setProjectMode('standard')"
                    :class="[
                        'py-3 px-6 font-medium text-sm cursor-pointer shrink-0',
                        projectMode === 'standard'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]"
                >
                    {{ $t("projects.mode.standard") }}
                </button>
                <button
                    type="button"
                    @click="setProjectMode('sub')"
                    :class="[
                        'py-3 px-6 font-medium text-sm cursor-pointer shrink-0',
                        projectMode === 'sub'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]"
                >
                    {{ $t("projects.mode.sub") }}
                </button>
            </nav>
        </div>

        <form @submit.prevent="saveProject" id="projectForm" class="divide-y divide-gray-200">
            <!-- Section: Identification -->
            <fieldset class="space-y-4 pt-2 pb-8">
                <legend class="text-base font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    {{ $t("projects.sections.identification") }}
                </legend>

                <!-- Parent Project Selection (sub mode only) -->
                <div v-if="isNewProject && projectMode === 'sub'">
                    <FormField
                        :label="$t('projects.parentProject')"
                        :error="errors.parentProjectId"
                    >
                        <template #input>
                            <ProjectSelect
                                v-model="form.parentProjectId"
                                :placeholder="$t('projects.selectParentProject')"
                                :include-ended="false"
                                :include-archived="false"
                                @update:model-value="handleParentProjectChange"
                            />
                        </template>
                    </FormField>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField :label="$t('projects.mandat')" :error="errors.projectNumber">
                        <template #input>
                            <Input
                                type="text"
                                v-model="form.projectNumber"
                                :disabled="!!form.parentProjectId"
                                :placeholder="$t('projects.mandatPlaceholder')"
                            />
                        </template>
                        <template #help>
                            <p class="text-sm text-gray-500 mt-1">
                                {{ $t("projects.mandatHelp") }}
                            </p>
                        </template>
                    </FormField>
                    <FormField :label="$t('projects.designation')" :error="errors.name" required>
                        <template #input>
                            <Input type="text" v-model="form.name" required />
                        </template>
                    </FormField>
                    <FormField
                        v-if="projectMode === 'sub' || (!isNewProject && form.subProjectName)"
                        :label="$t('projects.subProjectName')"
                        :error="errors.subProjectName"
                    >
                        <template #input>
                            <Input
                                type="text"
                                v-model="form.subProjectName"
                                :placeholder="$t('projects.subProjectNamePlaceholder')"
                            />
                        </template>
                    </FormField>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField :label="$t('projects.startDate')" :error="errors.startDate" required>
                        <template #input>
                            <Input type="date" v-model="formattedDate" required />
                        </template>
                    </FormField>
                    <FormField :label="$t('projects.type')" :error="errors.projectTypeIds" required>
                        <template #input>
                            <MultiProjectTypeSelect
                                v-model="form.projectTypeIds"
                                :placeholder="$t('common.select')"
                            />
                        </template>
                    </FormField>
                    <FormField :label="$t('projects.statusLabel')" :error="errors.status">
                        <template #input>
                            <ToggleGroup
                                :model-value="form.status"
                                :options="statusOptions"
                                @update:model-value="form.status = ($event as typeof form.status) || 'active'"
                            />
                        </template>
                    </FormField>
                </div>
            </fieldset>

            <!-- Section: Intervenants -->
            <fieldset class="space-y-4 pt-10 pb-8">
                <legend class="text-base font-semibold text-gray-700 uppercase tracking-wide my-4">
                    {{ $t("projects.sections.stakeholders") }}
                </legend>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField :label="$t('projects.client')" :error="errors.clientId">
                        <template #input>
                            <ClientSelect
                                v-model="form.clientId"
                                :placeholder="$t('common.select')"
                            />
                        </template>
                    </FormField>
                    <FormField :label="$t('projects.enterprise')" :error="errors.companyId">
                        <template #input>
                            <CompanySelect
                                v-model="form.companyId"
                                :placeholder="$t('common.select')"
                            />
                        </template>
                    </FormField>
                    <FormField :label="$t('projects.engineer')" :error="errors.engineerId">
                        <template #input>
                            <EngineerSelect
                                v-model="form.engineerId"
                                :placeholder="$t('common.select')"
                            />
                        </template>
                    </FormField>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField :label="$t('projects.responsible')" :error="errors.projectManagers">
                        <template #input>
                            <UserSelect
                                v-model="form.projectManagers"
                                :placeholder="$t('common.select')"
                                :multiple="true"
                            />
                        </template>
                    </FormField>
                    <FormField :label="$t('projects.members')" :error="errors.projectMembers">
                        <template #input>
                            <UserSelect
                                v-model="form.projectMembers"
                                :placeholder="$t('common.select')"
                                :multiple="true"
                            />
                        </template>
                    </FormField>
                </div>
            </fieldset>

            <!-- Section: Localisation (card style) -->
            <fieldset class="pt-10 pb-8">
                <legend class="text-base font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    {{ $t("projects.sections.location") }}
                </legend>

                <div class="bg-gray-50 rounded-lg border border-gray-300 p-5 space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField :label="$t('projects.locality')" :error="errors.locationId">
                            <template #input>
                                <LocationSelect
                                    v-model="form.locationId"
                                    :placeholder="$t('common.select')"
                                />
                            </template>
                        </FormField>
                    </div>

                    <FormField
                        :label="$t('projects.location')"
                        :error="errors.latitude || errors.longitude"
                    >
                        <template #input>
                            <LocationPicker
                                :latitude="parsedLatitude"
                                :longitude="parsedLongitude"
                                @update:latitude="updateLatitude"
                                @update:longitude="updateLongitude"
                            />
                        </template>
                    </FormField>
                </div>
            </fieldset>

            <!-- Section: Finances & notes -->
            <fieldset class="space-y-4 pt-10 pb-8">
                <legend class="text-base font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    {{ $t("projects.sections.financesNotes") }}
                </legend>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField :label="$t('projects.offerAmount')" :error="errors.offerAmount">
                        <template #input>
                            <Input
                                type="number"
                                v-model.number="form.offerAmount"
                                step="0.05"
                                min="0"
                                :placeholder="$t('projects.offerAmountPlaceholder')"
                            />
                        </template>
                        <template #help>
                            <p class="text-sm text-gray-500 mt-1">
                                {{ $t("projects.offerAmountHelp") }}
                            </p>
                        </template>
                    </FormField>
                    <FormField
                        :label="$t('projects.invoicingAddress')"
                        :error="errors.invoicingAddress"
                    >
                        <template #input>
                            <Textarea
                                v-model="form.invoicingAddress"
                                rows="3"
                                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                :placeholder="$t('projects.invoicingAddressPlaceholder')"
                            ></Textarea>
                        </template>
                    </FormField>
                </div>

                <FormField :label="$t('projects.remark')" :error="errors.remark">
                    <template #input>
                        <Textarea
                            v-model="form.remark"
                            rows="3"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            :placeholder="$t('projects.remarkPlaceholder')"
                        ></Textarea>
                    </template>
                </FormField>
            </fieldset>

            <!-- Section: Statut (only when editing) -->
            <fieldset v-if="!isNewProject" class="pt-10 pb-2">
                <legend class="text-base font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    {{ $t("projects.statusLabel") }}
                </legend>

                <div class="flex gap-8">
                    <label class="flex items-center">
                        <input
                            type="checkbox"
                            v-model="form.ended"
                            class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span>{{ $t("projects.markAsEnded") }}</span>
                    </label>
                    <label class="flex items-center">
                        <input
                            type="checkbox"
                            v-model="form.archived"
                            class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span>{{ $t("projects.markAsArchived") }}</span>
                    </label>
                </div>
            </fieldset>
        </form>

        <template #actions>
            <Button variant="secondary" type="button" :to="{ name: 'project-list' }">
                {{ $t("common.cancel") }}
            </Button>
            <Button
                variant="primary"
                type="submit"
                form="projectForm"
                :loading="isSubmitting || loadingData"
            >
                {{ $t("common.save") }}
            </Button>
        </template>
    </FormLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { useAlert } from "@/composables/utils/useAlert"
import { useAuthStore } from "@/stores/auth"
import Button from "@/components/atoms/Button.vue"
import FormField from "@/components/molecules/FormField.vue"
import FormLayout from "@/components/templates/FormLayout.vue"
import Input from "@/components/atoms/Input.vue"
import ProjectSelect from "@/components/organisms/project/ProjectSelect.vue"
import LocationSelect from "@/components/organisms/location/LocationSelect.vue"
import ClientSelect from "@/components/organisms/client/ClientSelect.vue"
import EngineerSelect from "@/components/organisms/engineer/EngineerSelect.vue"
import CompanySelect from "@/components/organisms/company/CompanySelect.vue"
import MultiProjectTypeSelect from "@/components/organisms/projectType/MultiProjectTypeSelect.vue"
import UserSelect from "@/components/organisms/user/UserSelect.vue"
import LocationPicker from "@/components/molecules/LocationPicker.vue"
import ToggleGroup from "@/components/atoms/ToggleGroup.vue"

// API Composables
import { useFetchProject, useCreateProject, useUpdateProject } from "@/composables/api/useProject"
import type { ProjectCreateInput, ProjectUpdateInput } from "@beg/validations"
import Textarea from "@/components/atoms/Textarea.vue"

interface ProjectFormState {
    projectNumber: string
    subProjectName?: string
    parentProjectId?: number
    name: string
    startDate: Date
    projectTypeIds: number[]
    locationId?: number | null
    clientId?: number | null
    engineerId?: number | null
    companyId?: number | null
    projectManagers: number[]
    projectMembers: number[]
    remark?: string
    invoicingAddress?: string
    offerAmount?: number | null
    status: "offer" | "draft" | "active"
    ended: boolean
    archived: boolean
    latitude: string
    longitude: string
}

const { t } = useI18n()

const statusOptions = computed(() => [
    {
        value: "offer",
        label: t("projects.status.offer"),
        activeClass: "bg-blue-600 text-white border-blue-600",
    },
    {
        value: "draft",
        label: t("projects.status.draft"),
        activeClass: "bg-amber-500 text-white border-amber-500",
    },
    {
        value: "active",
        label: t("projects.status.active"),
        activeClass: "bg-emerald-600 text-white border-emerald-600",
    },
])

const route = useRoute()
const router = useRouter()
const { successAlert, errorAlert } = useAlert()
const authStore = useAuthStore()
// Get current user
const user = computed(() => authStore.user)

// Determine if we're creating a new project or editing an existing one
const projectId = computed(() => (route.params.id ? parseInt(route.params.id as string) : null))
const isNewProject = computed(() => !projectId.value)

// Project mode tabs (only used for new projects)
const projectMode = ref<"standard" | "sub">("standard")

const setProjectMode = (mode: "standard" | "sub") => {
    projectMode.value = mode
    if (mode === "standard") {
        form.value.parentProjectId = undefined
        form.value.subProjectName = ""
        form.value.projectNumber = ""
        form.value.projectTypeIds = []
        form.value.name = ""
        form.value.locationId = undefined
        form.value.clientId = undefined
        form.value.engineerId = undefined
        form.value.companyId = undefined
        form.value.projectManagers = []
        form.value.projectMembers = []
        form.value.latitude = ""
        form.value.longitude = ""
    }
}

// Loading states
const isSubmitting = ref(false)
const loadingData = ref(true)

// Form validation errors
const errors = ref<Record<string, string>>({})
const errorMessage = ref<string | null>(null)

// API composables
const { get: fetchProject, data: projectData } = useFetchProject()
const { post: createProject, loading: creating } = useCreateProject()
const { put: updateProject, loading: updating } = useUpdateProject()

// Note: Select components handle their own data fetching

// Form state
const form = ref<ProjectFormState>({
    projectNumber: "",
    subProjectName: "",
    parentProjectId: undefined,
    name: "",
    startDate: new Date(),
    projectTypeIds: [],
    locationId: undefined,
    clientId: undefined,
    engineerId: undefined,
    companyId: undefined,
    projectManagers: [],
    projectMembers: [],
    remark: "",
    invoicingAddress: "",
    offerAmount: null,
    status: "active",
    ended: false,
    archived: false,
    latitude: "",
    longitude: "",
})

// Note: AutocompleteSelect now uses the raw data directly with displayField prop

// Handle date formatting
const formattedDate = computed({
    get: () => {
        if (!form.value.startDate) return ""
        const date =
            typeof form.value.startDate === "string"
                ? new Date(form.value.startDate)
                : form.value.startDate
        return date.toISOString().split("T")[0]
    },
    set: (value: string) => {
        if (value) {
            form.value.startDate = new Date(value)
        }
    },
})

// Handle coordinate parsing for LocationPicker
const parsedLatitude = computed(() => {
    const value = form.value.latitude?.trim()
    return value && value !== "" ? Number(value) : null
})

const parsedLongitude = computed(() => {
    const value = form.value.longitude?.trim()
    return value && value !== "" ? Number(value) : null
})

const updateLatitude = (value: number | null) => {
    form.value.latitude = value !== null ? value.toString() : ""
}

const updateLongitude = (value: number | null) => {
    form.value.longitude = value !== null ? value.toString() : ""
}

// Create a separate instance for fetching parent project
const { get: fetchParentProjectData, data: parentProjectData } = useFetchProject()

// Handle parent project selection
const handleParentProjectChange = async (parentProjectId: number | undefined) => {
    if (parentProjectId && isNewProject.value) {
        // Fetch the parent project details
        await fetchParentProjectData({ params: { id: parentProjectId } })

        if (parentProjectData.value) {
            // Copy parent project data
            form.value.projectNumber = parentProjectData.value.projectNumber || ""
            form.value.projectTypeIds = parentProjectData.value.types?.map((t: any) => t.id) || []
            form.value.name = parentProjectData.value.name
            form.value.locationId = parentProjectData.value.location?.id
            form.value.clientId = parentProjectData.value.client?.id
            form.value.engineerId = parentProjectData.value.engineer?.id
            form.value.companyId = parentProjectData.value.company?.id
            form.value.projectManagers =
                parentProjectData.value.projectManagers?.map((pm: any) => pm.id) || []
            form.value.projectMembers =
                parentProjectData.value.projectMembers?.map((pm: any) => pm.id) || []
            form.value.latitude =
                parentProjectData.value.latitude !== null &&
                parentProjectData.value.latitude !== undefined
                    ? parentProjectData.value.latitude.toString()
                    : ""
            form.value.longitude =
                parentProjectData.value.longitude !== null &&
                parentProjectData.value.longitude !== undefined
                    ? parentProjectData.value.longitude.toString()
                    : ""
        }
    } else if (!parentProjectId) {
        // Clear copied data when parent is deselected
        form.value.projectNumber = ""
        form.value.subProjectName = ""
        form.value.latitude = ""
        form.value.longitude = ""
    }
}

// Validate form
const validateForm = (): boolean => {
    errors.value = {}
    let isValid = true

    // projectNumber is now optional (for draft projects)
    // No validation needed for projectNumber

    if (!form.value.name) {
        errors.value.name = t("validation.required")
        isValid = false
    }

    if (!form.value.startDate) {
        errors.value.startDate = t("validation.required")
        isValid = false
    }

    if (!form.value.projectTypeIds || form.value.projectTypeIds.length === 0) {
        errors.value.projectTypeIds = t("validation.required")
        isValid = false
    }

    const latitudeValue = form.value.latitude?.trim()
    if (latitudeValue) {
        const parsedLatitude = Number(latitudeValue)
        if (!Number.isFinite(parsedLatitude)) {
            errors.value.latitude = t("validation.number")
            isValid = false
        }
    }

    const longitudeValue = form.value.longitude?.trim()
    if (longitudeValue) {
        const parsedLongitude = Number(longitudeValue)
        if (!Number.isFinite(parsedLongitude)) {
            errors.value.longitude = t("validation.number")
            isValid = false
        }
    }

    return isValid
}

// Save project function
const saveProject = async () => {
    // Validate form
    if (!validateForm()) {
        errorMessage.value = t("validation.pleaseFillRequired")
        errorAlert(t("validation.pleaseFillRequired"))
        return
    }

    try {
        isSubmitting.value = true
        errorMessage.value = null

        // Prepare data for submission
        const latitudeValue = form.value.latitude?.trim() ?? ""
        const longitudeValue = form.value.longitude?.trim() ?? ""
        const parsedLatitude = latitudeValue ? Number(latitudeValue) : null
        const parsedLongitude = longitudeValue ? Number(longitudeValue) : null
        const projectNumberValue = form.value.projectNumber?.trim()
        const submitData = {
            projectNumber: projectNumberValue || null,
            name: form.value.name,
            startDate: form.value.startDate,
            projectTypeIds: form.value.projectTypeIds,
            subProjectName: form.value.subProjectName,
            parentProjectId: form.value.parentProjectId,
            locationId: form.value.locationId || null,
            clientId: form.value.clientId || null,
            engineerId: form.value.engineerId || null,
            companyId: form.value.companyId || null,
            projectManagers: form.value.projectManagers || [],
            projectMembers: form.value.projectMembers || [],
            remark: form.value.remark,
            invoicingAddress: form.value.invoicingAddress,
            offerAmount: form.value.offerAmount || null,
            status: form.value.status,
            ended: form.value.ended || false,
            archived: form.value.archived || false,
            latitude: parsedLatitude,
            longitude: parsedLongitude,
        }

        let savedProjectId = projectId.value

        if (isNewProject.value) {
            // Create new project
            const response = await createProject({ body: submitData as ProjectCreateInput })
            savedProjectId = response?.id
            successAlert(t("projects.createSuccess"))
        } else {
            // Update existing project
            await updateProject({
                params: { id: projectId.value! },
                body: submitData as ProjectUpdateInput,
            })
            successAlert(t("projects.updateSuccess"))
        }

        // Redirect to project preview after saving
        if (savedProjectId) {
            router.push({ name: "project-view", params: { id: savedProjectId } })
        } else {
            router.push({ name: "project-list" })
        }
    } catch (error: any) {
        console.error("Error saving project:", error)

        // Handle specific error messages
        if (error.message?.includes("already exists")) {
            errors.value.projectNumber = t("projects.projectNumberExists")
            errorMessage.value = t("projects.projectNumberExists")
            errorAlert(t("projects.projectNumberExists"))
        } else if (error.message?.includes("permissions")) {
            errorMessage.value = t("errors.noPermission")
            errorAlert(t("errors.noPermission"))
        } else {
            errorMessage.value = t("errors.general")
            errorAlert(t("errors.general"))
        }
    } finally {
        isSubmitting.value = false
    }
}

// Load data on mount
onMounted(async () => {
    document.title = "BEG - Modifier le mandat"
    try {
        loadingData.value = true

        // No need to load select options - dedicated components handle their own data

        // Load existing project if editing
        if (projectId.value && !isNaN(projectId.value)) {
            await fetchProject({ params: { id: projectId.value } })

            if (projectData.value) {
                // Map API response to form
                form.value = {
                    projectNumber: projectData.value.projectNumber || "",
                    subProjectName: projectData.value.subProjectName || "",
                    parentProjectId: undefined,
                    name: projectData.value.name,
                    startDate: projectData.value.startDate,
                    projectTypeIds: projectData.value.types?.map((t) => t.id) || [],
                    locationId: projectData.value.location?.id,
                    clientId: projectData.value.client?.id,
                    engineerId: projectData.value.engineer?.id,
                    companyId: projectData.value.company?.id,
                    projectManagers: projectData.value.projectManagers?.map((pm) => pm.id) || [],
                    projectMembers: projectData.value.projectMembers?.map((pm) => pm.id) || [],
                    remark: projectData.value.remark || "",
                    invoicingAddress: projectData.value.invoicingAddress || "",
                    offerAmount: projectData.value.offerAmount || null,
                    status: projectData.value.status || "active",
                    ended: projectData.value.ended || false,
                    archived: projectData.value.archived || false,
                    latitude:
                        projectData.value.latitude !== null &&
                        projectData.value.latitude !== undefined
                            ? projectData.value.latitude.toString()
                            : "",
                    longitude:
                        projectData.value.longitude !== null &&
                        projectData.value.longitude !== undefined
                            ? projectData.value.longitude.toString()
                            : "",
                }
            }
        }
    } catch (error) {
        console.error("Error loading data:", error)
        errorAlert(t("errors.loadingData"))
    } finally {
        loadingData.value = false
    }
})

// Watch for submission state
watch([creating, updating], ([isCreating, isUpdating]) => {
    isSubmitting.value = isCreating || isUpdating
})
</script>
