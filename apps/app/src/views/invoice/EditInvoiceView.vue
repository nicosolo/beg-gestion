<template>
    <form @submit.prevent="handleSave">
        <FormLayout
            :title="isNewInvoice ? 'Créer une facture' : 'Modifier la facture'"
            :subtitle="invoice?.reference + ' - ' + invoice?.invoiceNumber"
            :loading="fetchProjectLoading || fetchUnbilledLoading"
            :error-message="errorMessage"
            :has-unsaved-changes="hasUnsavedChanges"
        >
            <template #header-actions>
                <Button
                    v-if="canOpenFolder"
                    type="button"
                    @click="openProjectFolder"
                    class="text-sm px-3 py-1.5 rounded-md font-medium focus:outline-none focus:ring-2 cursor-pointer leading-none block text-center hover:bg-indigo-200 text-indigo-700"
                >
                    Ouvrir dossier
                </Button>
            </template>
            <!-- Tabs Navigation -->
            <div class="-mx-6 -mt-6 mb-6">
                <div class="border-b border-gray-200">
                    <nav class="flex -mb-px px-6">
                        <button
                            @click="activeTab = 'general'"
                            type="button"
                            :class="[
                                'py-4 px-6 font-medium text-sm cursor-pointer',
                                activeTab === 'general'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
                            ]"
                        >
                            Données de facturation et documents
                        </button>
                        <button
                            v-if="invoice && activityBasedBilling"
                            @click="activeTab = 'details'"
                            type="button"
                            :class="[
                                'py-4 px-6 font-medium text-sm cursor-pointer',
                                activeTab === 'details'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
                            ]"
                        >
                            Préparation de la facture et heures réalisées
                        </button>
                    </nav>
                </div>
            </div>
            <!-- Tab Content -->
            <div class="tab-content" v-if="invoice">
                <InvoiceGeneralInfo
                    v-if="activeTab === 'general'"
                    v-model="invoice"
                    :invoice-id="invoiceId ? parseInt(invoiceId) : null"
                    :default-path="projectFolderPath"
                    @document-file-change="handleDocumentFileChange"
                    @document-entry-removed="handleDocumentEntryRemoved"
                    @invoice-document-change="handleInvoiceDocumentFileChange"
                />
                <InvoiceDetails
                    v-if="activeTab === 'details' && activityBasedBilling"
                    v-model="invoice"
                />
            </div>
            <template #actions>
                <Button
                    v-if="!isNewInvoice"
                    variant="danger"
                    type="button"
                    @click="handleDelete"
                    :disabled="loading || deleteLoading || !canDelete"
                >
                    {{ $t("common.delete") }}
                </Button>
                <Button
                    v-if="!isNewInvoice"
                    variant="secondary"
                    type="button"
                    @click="handleDuplicate"
                    :disabled="loading"
                >
                    Dupliquer
                </Button>
                <Button variant="secondary" type="button" @click="handleCancel" :disabled="loading">
                    Annuler
                </Button>
                <Button variant="primary" type="submit" :loading="loading">
                    {{ $t("common.save") }}
                </Button>
            </template>
        </FormLayout>
    </form>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
        v-model="showDeleteConfirm"
        :title="$t('common.confirmDelete')"
        :message="$t('invoice.confirmDelete')"
        type="danger"
        :confirm-text="$t('common.delete')"
        :cancel-text="$t('common.cancel')"
        @confirm="confirmDelete"
    />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import FormLayout from "@/components/templates/FormLayout.vue"
import Button from "@/components/atoms/Button.vue"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"
import InvoiceGeneralInfo from "@/components/organisms/invoice/InvoiceGeneralInfo.vue"
import InvoiceDetails from "@/components/organisms/invoice/InvoiceDetails.vue"
import { createEmptyInvoice, type Invoice, type InvoiceResponse } from "@beg/validations"
import { useFetchInvoice, useDeleteInvoice } from "@/composables/api/useInvoice"
import { useFetchProject } from "@/composables/api/useProject"
import { useOpenProjectFolder } from "@/composables/useOpenProjectFolder"
import { useFetchUnbilledActivities } from "@/composables/api/useUnbilled"
import { useFormat } from "@/composables/utils/useFormat"
import { useI18n } from "vue-i18n"
import { useAlert } from "@/composables/utils/useAlert"
import { useAuthStore } from "@/stores/auth"
import { parseApiError, ApiError } from "@/utils/api-error"
import { useUnsavedChanges } from "@/composables/utils/useUnsavedChanges"
import { useAppSettingsStore } from "@/stores/appSettings"

const route = useRoute()
const router = useRouter()
const invoiceId = computed(() => route.params.id as string | undefined)
const isNewInvoice = computed(() => !invoiceId.value)
const { formatDate } = useFormat()
const { t } = useI18n()
const { errorAlert, successAlert } = useAlert()
const activeTab = ref("general")
const isUpdatingFromApi = ref(false)
const showDeleteConfirm = ref(false)

// API composables
const { get: fetchInvoice, loading: fetchLoading, error: fetchError } = useFetchInvoice()
const { delete: deleteInvoice, loading: deleteLoading } = useDeleteInvoice()
const { get: fetchProject, loading: fetchProjectLoading, data: projectResponse } = useFetchProject()

const { get: fetchUnbilledActivities, loading: fetchUnbilledLoading } = useFetchUnbilledActivities()
const { fetchProjectFolder, projectFolder, canOpen: canOpenFolder, absolutePath: projectFolderPath, openProjectFolder } = useOpenProjectFolder()
const appSettingsStore = useAppSettingsStore()
const authStore = useAuthStore()

const pendingOfferFiles = ref<(File | null)[]>([])
const pendingAdjudicationFiles = ref<(File | null)[]>([])
const pendingSituationFiles = ref<(File | null)[]>([])
const pendingDocumentFiles = ref<(File | null)[]>([])
const pendingInvoiceDocumentFile = ref<File | null>(null)
const savingInvoice = ref(false)
const savingError = ref<string | null>(null)

// Form state
const invoice = ref<Invoice | null>(null)

watch(
    () => invoice.value?.offers ?? [],
    (offers) => {
        const next = offers.map((_, index) => pendingOfferFiles.value[index] ?? null)
        pendingOfferFiles.value = next
    },
    { deep: true, immediate: true }
)

watch(
    () => invoice.value?.adjudications ?? [],
    (adjudications) => {
        const next = adjudications.map((_, index) => pendingAdjudicationFiles.value[index] ?? null)
        pendingAdjudicationFiles.value = next
    },
    { deep: true, immediate: true }
)

watch(
    () => invoice.value?.situations ?? [],
    (situations) => {
        const next = situations.map((_, index) => pendingSituationFiles.value[index] ?? null)
        pendingSituationFiles.value = next
    },
    { deep: true, immediate: true }
)

watch(
    () => invoice.value?.documents ?? [],
    (documents) => {
        const next = documents.map((_, index) => pendingDocumentFiles.value[index] ?? null)
        pendingDocumentFiles.value = next
    },
    { deep: true, immediate: true }
)

const hasPendingUploads = computed(
    () =>
        pendingOfferFiles.value.some(Boolean) ||
        pendingAdjudicationFiles.value.some(Boolean) ||
        pendingSituationFiles.value.some(Boolean) ||
        pendingDocumentFiles.value.some(Boolean) ||
        Boolean(pendingInvoiceDocumentFile.value)
)

const canDelete = computed(() => invoice.value?.status !== "sent")

// Unsaved changes tracking
const { isDirty, hasUnsavedChanges, markClean } = useUnsavedChanges({
    hasChanges: hasPendingUploads,
})

// Mark form as dirty when invoice changes (except during API updates)
watch(
    () => invoice.value,
    () => {
        if (!isUpdatingFromApi.value && invoice.value) {
            isDirty.value = true
        }
    },
    { deep: true }
)

const handleDocumentFileChange = ({
    type,
    index,
    file,
}: {
    type: "offer" | "adjudication" | "situation" | "document"
    index: number
    file: File | null
}) => {
    if (type === "offer") {
        const next = [...pendingOfferFiles.value]
        next[index] = file ?? null
        pendingOfferFiles.value = next
    } else if (type === "adjudication") {
        const next = [...pendingAdjudicationFiles.value]
        next[index] = file ?? null
        pendingAdjudicationFiles.value = next
    } else if (type === "situation") {
        const next = [...pendingSituationFiles.value]
        next[index] = file ?? null
        pendingSituationFiles.value = next
    } else {
        const next = [...pendingDocumentFiles.value]
        next[index] = file ?? null
        pendingDocumentFiles.value = next
    }
}

const handleDocumentEntryRemoved = ({
    type,
    index,
}: {
    type: "offer" | "adjudication" | "situation" | "document"
    index: number
}) => {
    if (type === "offer") {
        const next = [...pendingOfferFiles.value]
        next.splice(index, 1)
        pendingOfferFiles.value = next
    } else if (type === "adjudication") {
        const next = [...pendingAdjudicationFiles.value]
        next.splice(index, 1)
        pendingAdjudicationFiles.value = next
    } else if (type === "situation") {
        const next = [...pendingSituationFiles.value]
        next.splice(index, 1)
        pendingSituationFiles.value = next
    } else {
        const next = [...pendingDocumentFiles.value]
        next.splice(index, 1)
        pendingDocumentFiles.value = next
    }
}

const handleInvoiceDocumentFileChange = (file: File | null) => {
    pendingInvoiceDocumentFile.value = file ?? null
}

const activityBasedBilling = computed(() => {
    const mode = invoice.value?.billingMode
    return mode !== "accordingToOffer" && mode !== "accordingToInvoice"
})

const loading = computed(() => fetchLoading.value || savingInvoice.value)
const error = computed(() => fetchError.value || savingError.value)
const errorMessage = computed(() => {
    const err = error.value as any
    if (typeof err === "string") return err
    if (err?.message) return err.message
    return err ? "Une erreur s'est produite" : null
})

const projectId = computed<number | undefined>(() => {
    // Check route params first
    if (route.params.projectId) {
        return parseInt(route.params.projectId as string)
    }
    // Check query params for new invoice
    if (route.query.projectId) {
        return parseInt(route.query.projectId as string)
    }
    return undefined
})
// Helper to convert API response to form data (response is already flat)
const convertResponseToInvoice = (response: InvoiceResponse): Invoice => {
    return {
        ...createEmptyInvoice({}),
        id: response.id.toString(),
        projectId: response.projectId,

        // All fields are already flat in response
        invoiceNumber: response.invoiceNumber || "",
        reference: response.reference || "",
        type: response.type || "invoice",
        status: response.status || "draft",
        billingMode: response.billingMode,
        visaByUserId: response.visaByUserId,
        inChargeUserId: response.inChargeUserId,
        description: response.description || "",
        note: response.note || "",
        invoiceDocument: response.invoiceDocument || "",

        // Dates - flat
        issueDate: response.issueDate ? new Date(response.issueDate) : undefined,
        dueDate: response.dueDate ? new Date(response.dueDate) : undefined,
        periodStart: response.periodStart ? new Date(response.periodStart) : undefined,
        periodEnd: response.periodEnd ? new Date(response.periodEnd) : undefined,
        period: response.period || "",

        // Client and recipient - flat
        clientAddress: response.clientAddress || "",
        recipientAddress: response.recipientAddress || "",

        // All flat fields from response
        feesBase: response.feesBase || 0,
        feesAdjusted: response.feesAdjusted || 0,
        feesTotal: response.feesTotal || 0,
        feesOthers: response.feesOthers || 0,
        feesFinalTotal: response.feesFinalTotal || 0,
        feesMultiplicationFactor: response.feesMultiplicationFactor || 1,
        feesDiscountPercentage: response.feesDiscountPercentage || null,
        feesDiscountAmount: response.feesDiscountAmount || null,

        expensesTravelBase: response.expensesTravelBase || 0,
        expensesTravelAdjusted: response.expensesTravelAdjusted || 0,
        expensesTravelRate: response.expensesTravelRate || 0.65,
        expensesTravelAmount: response.expensesTravelAmount || 0,
        expensesOtherBase: response.expensesOtherBase || 0,
        expensesOtherAmount: response.expensesOtherAmount || 0,
        expensesThirdPartyAmount: response.expensesThirdPartyAmount || 0,
        expensesPackagePercentage: response.expensesPackagePercentage,
        expensesPackageAmount: response.expensesPackageAmount,
        expensesTotalExpenses: response.expensesTotalExpenses || 0,

        totalHT: response.totalHT || 0,
        vatRate: response.vatRate || 8.0,
        vatAmount: response.vatAmount || 0,
        totalTTC: response.totalTTC || 0,

        otherServices: response.otherServices || "",
        remarksOtherServices: response.remarksOtherServices || "",
        remarksTravelExpenses: response.remarksTravelExpenses || "",
        remarksExpenses: response.remarksExpenses || "",
        remarksThirdPartyExpenses: response.remarksThirdPartyExpenses || "",

        // Arrays
        rates: response.rates || [],
        offers: response.offers || [],
        adjudications: response.adjudications || [],
        situations: response.situations || [],
        documents: response.documents || [],
    }
}

// Helper to convert form data to API input
const convertInvoiceToInput = (invoice: Invoice): any => {
    return {
        projectId: invoice.projectId,
        invoiceNumber: invoice.invoiceNumber,
        reference: invoice.reference,
        type: invoice.type,
        billingMode: invoice.billingMode,
        visaByUserId: invoice.visaByUserId,
        inChargeUserId: invoice.inChargeUserId,
        status: invoice.status || "draft",
        description: invoice.description,
        note: invoice.note,
        invoiceDocument: invoice.invoiceDocument,

        // Dates
        issueDate: new Date(),
        dueDate: undefined,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        period: invoice.period,

        // Client and recipient addresses
        clientAddress: invoice.clientAddress,
        recipientAddress: invoice.recipientAddress,

        // All flat fields
        feesBase: invoice.feesBase,
        feesAdjusted: invoice.feesAdjusted,
        feesTotal: invoice.feesTotal,
        feesOthers: invoice.feesOthers,
        feesFinalTotal: invoice.feesFinalTotal,
        feesMultiplicationFactor: invoice.feesMultiplicationFactor,
        feesDiscountPercentage: invoice.feesDiscountPercentage,
        feesDiscountAmount: invoice.feesDiscountAmount,

        expensesTravelBase: invoice.expensesTravelBase,
        expensesTravelAdjusted: invoice.expensesTravelAdjusted,
        expensesTravelRate: invoice.expensesTravelRate,
        expensesTravelAmount: invoice.expensesTravelAmount,
        expensesOtherBase: invoice.expensesOtherBase,
        expensesOtherAmount: invoice.expensesOtherAmount,
        expensesThirdPartyAmount: invoice.expensesThirdPartyAmount,
        expensesPackagePercentage: invoice.expensesPackagePercentage,
        expensesPackageAmount: invoice.expensesPackageAmount,
        expensesTotalExpenses: invoice.expensesTotalExpenses,

        totalHT: invoice.totalHT,
        vatRate: invoice.vatRate,
        vatAmount: invoice.vatAmount,
        totalTTC: invoice.totalTTC,

        otherServices: invoice.otherServices,
        remarksOtherServices: invoice.remarksOtherServices,
        remarksTravelExpenses: invoice.remarksTravelExpenses,
        remarksExpenses: invoice.remarksExpenses,
        remarksThirdPartyExpenses: invoice.remarksThirdPartyExpenses,

        // Arrays
        rates: invoice.rates || [],
        offers: invoice.offers || [],
        adjudications: invoice.adjudications || [],
        situations: invoice.situations || [],
        documents: invoice.documents || [],

        // Activity IDs if present
        activityIds: invoice.activityIds,
    }
}

const loadInvoice = async () => {
    if (!isNewInvoice.value && invoiceId.value) {
        try {
            const data = await fetchInvoice({ params: { id: parseInt(invoiceId.value) } })
            if (data) {
                isUpdatingFromApi.value = true
                invoice.value = convertResponseToInvoice(data)
                pendingInvoiceDocumentFile.value = null
            }
            fetchProjectFolder({ params: { id: data.projectId } })
        } catch (err: any) {
            console.error("Failed to load invoice:", err)
            // Error will be displayed in the FormLayout
        } finally {
            isUpdatingFromApi.value = false
        }
    }
}

// Save invoice
const handleSave = async () => {
    if (!invoice.value) return

    if (invoice.value.billingMode === "accordingToInvoice" && !invoice.value.invoiceDocument) {
        errorAlert(t("invoice.document.required"), 5000)
        return
    }

    savingInvoice.value = true
    savingError.value = null

    try {
        const payload = convertInvoiceToInput(invoice.value)
        const shouldUseFormData = hasPendingUploads.value
        const endpoint = isNewInvoice.value ? "/api/invoice" : `/api/invoice/${invoiceId.value}`
        const method = isNewInvoice.value ? "POST" : "PUT"
        const headers: Record<string, string> = { ...authStore.getAuthHeaders() }
        let body: BodyInit

        if (shouldUseFormData) {
            const formData = new FormData()
            formData.append("payload", JSON.stringify(payload))

            if (pendingInvoiceDocumentFile.value) {
                formData.append("invoiceDocument", pendingInvoiceDocumentFile.value)
            }

            pendingOfferFiles.value.forEach((file, index) => {
                if (file) {
                    formData.append(`offerFiles[${index}]`, file)
                }
            })

            pendingAdjudicationFiles.value.forEach((file, index) => {
                if (file) {
                    formData.append(`adjudicationFiles[${index}]`, file)
                }
            })

            pendingSituationFiles.value.forEach((file, index) => {
                if (file) {
                    formData.append(`situationFiles[${index}]`, file)
                }
            })

            pendingDocumentFiles.value.forEach((file, index) => {
                if (file) {
                    formData.append(`documentFiles[${index}]`, file)
                }
            })

            body = formData
        } else {
            headers["Content-Type"] = "application/json"
            body = JSON.stringify(payload)
        }

        const response = await fetch(endpoint, {
            method,
            headers,
            body,
        })

        if (!response.ok) {
            const apiError = await parseApiError(response)
            const message = apiError.getLocalizedMessage(t)
            savingError.value = message
            errorAlert(message)
            throw apiError
        }

        const data = (await response.json()) as InvoiceResponse
        isUpdatingFromApi.value = true
        invoice.value = convertResponseToInvoice(data)

        pendingOfferFiles.value = pendingOfferFiles.value.map(() => null)
        pendingAdjudicationFiles.value = pendingAdjudicationFiles.value.map(() => null)
        pendingSituationFiles.value = pendingSituationFiles.value.map(() => null)
        pendingDocumentFiles.value = pendingDocumentFiles.value.map(() => null)
        pendingInvoiceDocumentFile.value = null
        markClean()

        successAlert(t("invoice.save.success"), 4000)
        router.push({ name: "invoice-preview", params: { id: data.id } })
    } catch (err: unknown) {
        console.error("Failed to save invoice:", err)
        if (err instanceof ApiError) {
            return
        }

        const message = err instanceof Error ? err.message : t("common.errorOccurred")
        savingError.value = message
        errorAlert(message)
    } finally {
        savingInvoice.value = false
    }
}

// Cancel and go back
const handleCancel = () => {
    router.push({ name: "invoice-list" })
}

// Duplicate invoice (billing data and documents only, no activities)
const handleDuplicate = () => {
    if (!invoice.value) return

    const duplicated = createEmptyInvoice({
        ...invoice.value,
        visaBy: undefined,
        visaDate: undefined,
        activityIds: [],
        invoiceNumber: undefined,
        dueDate: undefined,
        issueDate: new Date(),
        rates: [],
        id: undefined,
    })

    invoice.value = duplicated
    router.push({ name: "invoice-new", query: { projectId: invoice.value.projectId?.toString() } })
}

// Delete invoice
const handleDelete = () => {
    showDeleteConfirm.value = true
}

const confirmDelete = async () => {
    try {
        if (invoiceId.value) {
            await deleteInvoice({ params: { id: parseInt(invoiceId.value) } })
            showDeleteConfirm.value = false
            router.push({ name: "invoice-list" })
        }
    } catch (err) {
        console.error("Failed to delete invoice:", err)
        showDeleteConfirm.value = false
        // Error will be handled by the FormLayout error display
    }
}

// Load unbilled activities for new invoice
const loadUnbilledActivities = async (periodStart?: Date, periodEnd?: Date) => {
    if (!projectId.value) return

    try {
        const queryParams: any = {}
        if (periodStart) queryParams.periodStart = periodStart.toISOString()
        if (periodEnd) queryParams.periodEnd = periodEnd.toISOString()

        const unbilledData = await fetchUnbilledActivities({
            params: { projectId: projectId.value },
            query: queryParams,
        })

        if (unbilledData) {
            // Keep the original period if it was passed, otherwise use API calculation
            const finalPeriodStart =
                periodStart ||
                (unbilledData.periodStart ? new Date(unbilledData.periodStart) : new Date())
            const finalPeriodEnd =
                periodEnd ||
                (unbilledData.periodEnd ? new Date(unbilledData.periodEnd) : new Date())

            // Pre-populate invoice with calculated data from API
            if (!invoice.value) {
                invoice.value = createEmptyInvoice({
                    // Use final period
                    periodStart: finalPeriodStart,
                    periodEnd: finalPeriodEnd,
                    projectId: projectId.value,
                    status: "draft",
                    inChargeUserId: authStore.user?.id ?? null,
                })
            }
            invoice.value.projectId = projectId.value

            // Set reference and invoice number from project data
            if (projectResponse.value && isNewInvoice.value) {
                const referenceParts = []
                if (projectResponse.value.projectNumber) {
                    referenceParts.push(projectResponse.value.projectNumber)
                }
                if (projectResponse.value.subProjectName) {
                    referenceParts.push(projectResponse.value.subProjectName)
                }
                if (projectResponse.value.name) {
                    referenceParts.push(projectResponse.value.name)
                }
                invoice.value.reference = referenceParts.join(" - ")

                // Generate default invoice number
                const now = new Date()
                const projectNum = projectResponse.value.projectNumber || ""
                const sub = projectResponse.value.subProjectName
                    ? `-${projectResponse.value.subProjectName}`
                    : ""
                invoice.value.invoiceNumber = `${projectNum}${sub} F ${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
            }

            // Set period string from dates
            if (invoice.value.periodStart && invoice.value.periodEnd) {
                invoice.value.period = `Travaux du ${formatDate(finalPeriodStart)} au ${formatDate(finalPeriodEnd)}`
            }

            // Set client address from project if available
            if (projectResponse.value) {
                const addressParts = []

                if (projectResponse.value.client?.name) {
                    addressParts.push(projectResponse.value.client.name)
                }

                if (projectResponse.value.location) {
                    if (projectResponse.value.location.address) {
                        addressParts.push(projectResponse.value.location.address)
                    }

                    const cityLine = []
                    if (projectResponse.value.location.name) {
                        cityLine.push(projectResponse.value.location.name)
                    }
                    if (projectResponse.value.location.canton) {
                        cityLine.push(projectResponse.value.location.canton)
                    }
                    if (cityLine.length > 0) {
                        addressParts.push(cityLine.join(", "))
                    }

                    if (projectResponse.value.location.country) {
                        addressParts.push(projectResponse.value.location.country)
                    }
                }

                invoice.value.clientAddress =
                    projectResponse.value.invoicingAddress || addressParts.join("\n")
            }

            // Rates array
            invoice.value.rates = unbilledData.rates

            // Expenses from raw data
            invoice.value.expensesTravelBase = unbilledData.totalKilometers || 0
            invoice.value.expensesTravelAdjusted = unbilledData.totalKilometers || 0
            invoice.value.expensesTravelRate = unbilledData.expensesTravelRate
            invoice.value.expensesTravelAmount =
                (unbilledData.totalKilometers || 0) * unbilledData.expensesTravelRate
            invoice.value.expensesOtherBase = unbilledData.totalExpenses || 0
            invoice.value.expensesOtherAmount = unbilledData.totalExpenses || 0
            invoice.value.expensesThirdPartyAmount = unbilledData.totalDisbursements || 0

            // Store activity IDs for later marking as billed
            invoice.value.activityIds = unbilledData.activityIds
        }
    } catch (err: any) {
        console.error("Failed to load unbilled activities:", err)
    }
}

onMounted(async () => {
    // Set page title
    document.title = isNewInvoice.value ? "BEG - Créer une facture" : "BEG - Modifier la facture"

    // If it's a new invoice with a projectId, fetch unbilled activities
    if (isNewInvoice.value && projectId.value) {
        await loadUnbilledActivities()
    } else {
        // For existing invoices, load the invoice and rates data
        await Promise.all([loadInvoice()])
    }
})

// Reload when route changes
watch(
    () => route.params.id,
    () => {
        loadInvoice()
    }
)
watch(
    () => projectId,
    async () => {
        if (projectId.value) {
            fetchProjectFolder({ params: { id: projectId.value } })
            const project = await fetchProject({ params: { id: projectId.value } })

            // Build client address from project location
            if (project && invoice.value) {
                const addressParts = []

                if (project.client?.name) {
                    addressParts.push(project.client.name)
                }

                if (project.location) {
                    if (project.location.address) {
                        addressParts.push(project.location.address)
                    }

                    const cityLine = []
                    if (project.location.name) {
                        cityLine.push(project.location.name)
                    }
                    if (project.location.canton) {
                        cityLine.push(project.location.canton)
                    }
                    if (cityLine.length > 0) {
                        addressParts.push(cityLine.join(", "))
                    }

                    if (project.location.country) {
                        addressParts.push(project.location.country)
                    }
                }

                invoice.value.clientAddress = addressParts.join("\n")

                // Set reference from project data for new invoices
                if (isNewInvoice.value) {
                    const referenceParts = []
                    if (project.projectNumber) {
                        referenceParts.push(project.projectNumber)
                    }
                    if (project.subProjectName) {
                        referenceParts.push(project.subProjectName)
                    }
                    if (project.name) {
                        referenceParts.push(project.name)
                    }
                    invoice.value.reference = referenceParts.join(" - ")
                }
            }
        }
    },
    { immediate: true }
)

// Watch for period changes and refetch unbilled activities
watch(
    () => [invoice.value?.periodStart?.getTime(), invoice.value?.periodEnd?.getTime()],
    ([newStartTime, newEndTime], [oldStartTime, oldEndTime]) => {
        // Skip if we're updating from API to prevent infinite loop
        if (isUpdatingFromApi.value) {
            return
        }

        // Only refetch if the period actually changed
        if (newStartTime === oldStartTime && newEndTime === oldEndTime) {
            return
        }

        // Only refetch if we're creating a new invoice and have a project
        if (
            invoice.value &&
            isNewInvoice.value &&
            projectId.value &&
            (invoice.value.periodStart || invoice.value.periodEnd)
        ) {
            loadUnbilledActivities(invoice.value.periodStart, invoice.value.periodEnd)
        }
    }
)
</script>
