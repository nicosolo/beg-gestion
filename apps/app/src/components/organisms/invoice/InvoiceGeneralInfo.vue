<template>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left Column -->
        <div>
            <div class="mb-4">
                <label class="text-sm font-medium text-gray-700 mb-1" for="invoiceNumber">
                    {{ $t("invoice.invoiceNumber") }}
                </label>
                <Input id="invoiceNumber" v-model="invoice.invoiceNumber" type="text" />
            </div>

            <div class="mb-4">
                <h3 class="text-sm font-medium text-gray-700 mb-1">Objet de la facture</h3>
                <Input v-model="invoice.reference" type="text" required />
            </div>

            <div class="mb-4">
                <h3 class="text-sm font-medium text-gray-700 mb-1">Période de facturation</h3>
                <div class="flex gap-2">
                    <Input v-model="startDate" type="date" className="w-1/2" />
                    <Input v-model="endDate" type="date" className="w-1/2" />
                </div>
            </div>

            <div class="mb-4">
                <label class="text-sm font-medium text-gray-700 mb-1" for="invoiceDescription">
                    Description des prestations
                </label>
                <Textarea id="invoiceDescription" v-model="invoice.description" :rows="6" />
            </div>

            <div class="mb-4">
                <label class="text-sm font-medium text-gray-700 mb-1" for="invoiceNote">
                    Note
                </label>
                <Textarea id="invoiceNote" v-model="invoice.note" :rows="4" />
            </div>
            <div class="mb-4">
                <label class="text-sm font-medium text-gray-700 mb-1" for="invoiceClientAddress">
                    Adresse de facturation (société)
                </label>
                <Textarea id="invoiceClientAddress" v-model="invoice.clientAddress" :rows="4" />
            </div>

            <div>
                <label class="text-sm font-medium text-gray-700 mb-1" for="invoiceRecipientAddress">
                    Adresse d'envoi de la facture
                </label>
                <Textarea
                    id="invoiceRecipientAddress"
                    v-model="invoice.recipientAddress"
                    :rows="4"
                />
            </div>
        </div>

        <div>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1" for="invoiceType">
                        Type de facture
                    </label>
                    <Select
                        id="invoiceType"
                        v-model="invoice.type"
                        :options="[
                            { value: 'invoice', label: $t('invoice.type.invoice') },
                            { value: 'final_invoice', label: $t('invoice.type.final_invoice') },
                            { value: 'situation', label: $t('invoice.type.situation') },
                            { value: 'deposit', label: $t('invoice.type.deposit') },
                        ]"
                    />
                </div>

                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1" for="invoiceBillingMode">
                        Mode de facturation
                    </label>
                    <Select
                        id="invoiceBillingMode"
                        v-model="invoice.billingMode"
                        :options="[
                            {
                                value: 'accordingToData',
                                label: $t('invoice.billingMode.accordingToData'),
                            },
                            {
                                value: 'accordingToOffer',
                                label: $t('invoice.billingMode.accordingToOffer'),
                            },
                            {
                                value: 'accordingToInvoice',
                                label: $t('invoice.billingMode.accordingToInvoice'),
                            },
                            { value: 'fixedPrice', label: $t('invoice.billingMode.fixedPrice') },
                        ]"
                    />
                    <DragDropZone
                        v-if="invoice.billingMode === 'accordingToInvoice'"
                        class="mt-4 p-2"
                        :multiple="false"
                        highlight-class="border-blue-500 border-2 bg-blue-50 rounded"
                        normal-class="border border-gray-300 border-dashed rounded"
                        @drop="handleInvoiceDocDrop"
                    >
                        <label class="text-sm font-medium text-gray-700 mb-1">
                            {{ $t("invoice.document.label") }}
                        </label>
                        <DocumentUploadField
                            :required="
                                invoice.billingMode === 'accordingToInvoice' &&
                                    !invoice.invoiceDocument
                            "
                            :file-name="invoice.invoiceDocument"
                            :display-name="invoiceDocumentDisplayName"
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            :default-path="props.defaultPath"
                            :upload-label="$t('invoice.documents.actions.upload')"
                            :replace-label="$t('invoice.documents.actions.replace')"
                            :remove-label="$t('invoice.document.clear')"
                            @select="handleInvoiceDocumentSelected"
                            @select-path="handleInvoiceDocumentPathSelected"
                            @clear="clearInvoiceDocument"
                        >
                            <template #preview>
                                <button
                                    v-if="invoiceDocumentPreviewUrl"
                                    type="button"
                                    class="text-blue-600 hover:underline"
                                    @click="downloadInvoiceDocument"
                                >
                                    {{ $t("common.view") }}
                                </button>
                            </template>
                        </DocumentUploadField>
                        <p class="mt-1 text-xs text-gray-500">
                            {{ $t("invoice.document.helper") }}
                        </p>
                    </DragDropZone>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1" for="invoiceStatus">
                        {{ $t("invoice.status.title") }}
                    </label>
                    <Select
                        id="invoiceStatus"
                        v-model="invoice.status"
                        :options="[
                            { value: 'draft', label: $t('invoice.status.draft') },
                            { value: 'controle', label: $t('invoice.status.controle') },
                            { value: 'vise', label: $t('invoice.status.vise') },
                            { value: 'sent', label: $t('invoice.status.sent') },
                        ]"
                    />
                </div>

                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1" for="visaByUserId">
                        {{ $t("invoice.visaByUser") }}
                    </label>
                    <UserSelect
                        id="visaByUserId"
                        v-model="invoice.visaByUserId"
                        :roles="['super_admin']"
                        :placeholder="$t('invoice.selectVisaUser')"
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1" for="inChargeUserId">
                        {{ $t("invoice.inChargeUser") }}
                    </label>
                    <UserSelect
                        id="inChargeUserId"
                        v-model="invoice.inChargeUserId"
                        :placeholder="$t('invoice.selectInChargeUser')"
                    />
                </div>
            </div>

            <div class="mb-4">
                <label class="text-sm font-medium text-gray-700 mb-1" for="invoicePeriod">
                    Période
                </label>
                <Input id="invoicePeriod" v-model="invoice.period" type="text" required />
            </div>

            <InvoiceDocumentEntries
                v-model="invoice.offers"
                :title="$t('invoice.documents.offer.title')"
                :add-button-label="$t('invoice.documents.offer.add')"
                :empty-state-label="$t('invoice.documents.offer.empty')"
                entry-type="offer"
                :invoice-id="invoiceId"
                :default-path="props.defaultPath"
                @file-change="(payload) => handleDocumentFileChange('offer', payload)"
                @entry-removed="(payload) => handleDocumentEntryRemoved('offer', payload)"
            />

            <InvoiceDocumentEntries
                v-model="invoice.adjudications"
                :title="$t('invoice.documents.adjudication.title')"
                :add-button-label="$t('invoice.documents.adjudication.add')"
                :empty-state-label="$t('invoice.documents.adjudication.empty')"
                entry-type="adjudication"
                :invoice-id="invoiceId"
                :default-path="props.defaultPath"
                @file-change="(payload) => handleDocumentFileChange('adjudication', payload)"
                @entry-removed="(payload) => handleDocumentEntryRemoved('adjudication', payload)"
            />

            <InvoiceDocumentEntries
                v-model="invoice.situations"
                :title="$t('invoice.documents.situation.title')"
                :add-button-label="$t('invoice.documents.situation.add')"
                :empty-state-label="$t('invoice.documents.situation.empty')"
                entry-type="situation"
                :invoice-id="invoiceId"
                :default-path="props.defaultPath"
                @file-change="(payload) => handleDocumentFileChange('situation', payload)"
                @entry-removed="(payload) => handleDocumentEntryRemoved('situation', payload)"
            />

            <InvoiceDocumentEntries
                v-model="invoice.documents"
                :title="$t('invoice.documents.document.title')"
                :add-button-label="$t('invoice.documents.document.add')"
                :empty-state-label="$t('invoice.documents.document.empty')"
                entry-type="document"
                :invoice-id="invoiceId"
                :default-path="props.defaultPath"
                :show-amount="false"
                @file-change="(payload) => handleDocumentFileChange('document', payload)"
                @entry-removed="(payload) => handleDocumentEntryRemoved('document', payload)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { type Invoice } from "@beg/validations"
import { computed, watch } from "vue"
import Input from "@/components/atoms/Input.vue"
import Select from "@/components/atoms/Select.vue"
import Textarea from "@/components/atoms/Textarea.vue"
import InvoiceDocumentEntries from "./InvoiceDocumentEntries.vue"
import DocumentUploadField from "@/components/molecules/DocumentUploadField.vue"
import DragDropZone from "@/components/molecules/DragDropZone.vue"
import UserSelect from "@/components/organisms/user/UserSelect.vue"
import { useInvoiceDocuments } from "@/composables/invoice/useInvoiceDocuments"
import { resolveFilePath, type ResolvedFile } from "@/composables/useFileResolver"

const props = defineProps<{
    modelValue: Invoice
    invoiceId?: number | null
    defaultPath?: string
}>()

const emit = defineEmits<{
    "update:modelValue": [value: Invoice]
    "document-file-change": [
        value: {
            type: "offer" | "adjudication" | "situation" | "document"
            index: number
            file: File | null
        },
    ]
    "document-entry-removed": [
        value: { type: "offer" | "adjudication" | "situation" | "document"; index: number },
    ]
    "invoice-document-change": [value: File | null]
}>()

const { buildFileUrl, downloadInvoiceFile, extractFileName } = useInvoiceDocuments()

const handleInvoiceDocDrop = (files: ResolvedFile[]) => {
    if (files.length === 0) return
    const result = files[0]
    if ("file" in result) {
        invoice.value = { ...invoice.value, invoiceDocument: result.file.name }
        emit("invoice-document-change", result.file)
    } else {
        invoice.value = { ...invoice.value, invoiceDocument: result.relativePath }
    }
}

const invoice = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
})

const invoiceId = computed(() => props.invoiceId)

const invoiceDocumentPreviewUrl = computed(() => {
    const file = invoice.value.invoiceDocument
    if (!file) return null
    const trimmed = file.trim()
    if (!trimmed) return null
    const hasPath = trimmed.includes("/") || trimmed.includes("\\")
    if (!hasPath) return null
    if (!props.invoiceId) return null
    return buildFileUrl(props.invoiceId, file)
})

const invoiceDocumentDisplayName = computed(() => extractFileName(invoice.value.invoiceDocument))

const handleDocumentFileChange = (
    type: "offer" | "adjudication" | "situation" | "document",
    payload: { index: number; file: File | null }
) => {
    emit("document-file-change", { type, ...payload })
}

const handleDocumentEntryRemoved = (
    type: "offer" | "adjudication" | "situation" | "document",
    payload: { index: number }
) => {
    emit("document-entry-removed", { type, ...payload })
}

const downloadInvoiceDocument = () => {
    if (!props.invoiceId) return
    downloadInvoiceFile(props.invoiceId, invoice.value.invoiceDocument)
}

const startDate = computed({
    get: () => invoice.value.periodStart?.toISOString().split("T")[0] || "",
    set: (value: string) => {
        const newInvoice = { ...invoice.value }
        newInvoice.periodStart = value ? new Date(value) : undefined
        invoice.value = newInvoice
    },
})

const endDate = computed({
    get: () => invoice.value.periodEnd?.toISOString().split("T")[0] || "",
    set: (value: string) => {
        const newInvoice = { ...invoice.value }
        newInvoice.periodEnd = value ? new Date(value) : undefined
        invoice.value = newInvoice
    },
})

const handleInvoiceDocumentSelected = (file: File | null) => {
    if (!file) return
    invoice.value = {
        ...invoice.value,
        invoiceDocument: file.name,
    }
    emit("invoice-document-change", file)
}

const handleInvoiceDocumentPathSelected = async (filePath: string) => {
    try {
        const result = await resolveFilePath(filePath)
        if ("file" in result) {
            invoice.value = { ...invoice.value, invoiceDocument: result.file.name }
            emit("invoice-document-change", result.file)
        } else {
            invoice.value = { ...invoice.value, invoiceDocument: result.relativePath }
        }
    } catch (error) {
        console.error("Failed to read file:", filePath, error)
    }
}

const clearInvoiceDocument = () => {
    if (!invoice.value.invoiceDocument) return
    invoice.value = {
        ...invoice.value,
        invoiceDocument: "",
    }
    emit("invoice-document-change", null)
}

watch(
    () => invoice.value.billingMode,
    (mode) => {
        if (mode !== "accordingToInvoice" && invoice.value.invoiceDocument) {
            clearInvoiceDocument()
        }
    }
)
</script>
