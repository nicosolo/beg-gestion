<template>
    <div class="space-y-6">
        <!-- Section: Identification -->
        <SectionCard :title="$t('invoice.sections.identification')" content-class="space-y-4" highlight>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField :label="$t('invoice.invoiceNumber')">
                    <template #input>
                        <Input id="invoiceNumber" v-model="invoice.invoiceNumber" type="text" />
                    </template>
                </FormField>
                <FormField :label="$t('invoice.reference')" required>
                    <template #input>
                        <Input v-model="invoice.reference" type="text" required />
                    </template>
                </FormField>
                <FormField :label="$t('invoice.period')">
                    <template #input>
                        <Input id="invoicePeriod" v-model="invoice.period" type="text" required />
                    </template>
                </FormField>
            </div>
        </SectionCard>

        <!-- Section: Facturation -->
        <SectionCard :title="$t('invoice.sections.billing')" content-class="space-y-4" highlight>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField :label="$t('invoice.invoiceType')">
                    <template #input>
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
                    </template>
                </FormField>
                <FormField :label="$t('invoice.billingModeLabel')">
                    <template #input>
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
                    </template>
                </FormField>
                <FormField :label="$t('invoice.billingPeriod')">
                    <template #input>
                        <div class="flex gap-2">
                            <Input v-model="startDate" type="date" className="w-1/2" />
                            <Input v-model="endDate" type="date" className="w-1/2" />
                        </div>
                    </template>
                </FormField>
            </div>
            <DragDropZone
                v-if="invoice.billingMode === 'accordingToInvoice'"
                class="mt-2 p-2"
                :multiple="false"
                highlight-class="border-blue-500 border-2 bg-blue-50 rounded"
                normal-class="border border-gray-300 border-dashed rounded"
                @drop="handleInvoiceDocDrop"
            >
                <FormField :label="$t('invoice.document.label')">
                    <template #input>
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
                    </template>
                    <template #help>
                        <p class="mt-1 text-xs text-gray-500">
                            {{ $t("invoice.document.helper") }}
                        </p>
                    </template>
                </FormField>
            </DragDropZone>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField :label="$t('invoice.status.title')">
                    <template #input>
                        <InvoiceStatusSelect id="invoiceStatus" v-model="invoice.status" />
                    </template>
                </FormField>
                <FormField :label="$t('invoice.visaByUser')">
                    <template #input>
                        <UserSelect
                            id="visaByUserId"
                            v-model="invoice.visaByUserId"
                            :roles="['super_admin', 'admin', 'user_eac']"
                            :placeholder="$t('invoice.selectVisaUser')"
                            :required="['controle', 'vise', 'sent'].includes(invoice.status)"
                            :disabled="['vise', 'sent'].includes(invoice.status)"
                        />
                    </template>
                </FormField>
                <FormField :label="$t('invoice.inChargeUser')">
                    <template #input>
                        <UserSelect
                            id="inChargeUserId"
                            v-model="invoice.inChargeUserId"
                            :placeholder="$t('invoice.selectInChargeUser')"
                        />
                    </template>
                </FormField>
            </div>
        </SectionCard>

        <!-- Section: Prestations, Adresses & Documents -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left: Prestations + Adresses -->
            <div class="space-y-6">
                <SectionCard :title="$t('invoice.sections.services')" content-class="space-y-4">
                    <FormField :label="$t('invoice.description')">
                        <template #input>
                            <Textarea id="invoiceDescription" v-model="invoice.description" :rows="6" />
                        </template>
                    </FormField>
                    <FormField :label="$t('invoice.note')">
                        <template #input>
                            <Textarea id="invoiceNote" v-model="invoice.note" :rows="4" />
                        </template>
                    </FormField>
                </SectionCard>

                <SectionCard :title="$t('invoice.sections.addresses')" content-class="space-y-4">
                    <FormField :label="$t('invoice.clientAddress')">
                        <template #input>
                            <Textarea id="invoiceClientAddress" v-model="invoice.clientAddress" :rows="4" />
                        </template>
                    </FormField>
                    <FormField :label="$t('invoice.recipientAddress')">
                        <template #input>
                            <Textarea
                                id="invoiceRecipientAddress"
                                v-model="invoice.recipientAddress"
                                :rows="4"
                            />
                        </template>
                    </FormField>
                </SectionCard>
            </div>

            <!-- Right: Documents -->
            <SectionCard :title="$t('invoice.sections.documents')" content-class="space-y-4">
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
            </SectionCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { type Invoice } from "@beg/validations"
import { computed, watch } from "vue"
import Input from "@/components/atoms/Input.vue"
import Select from "@/components/atoms/Select.vue"
import Textarea from "@/components/atoms/Textarea.vue"
import SectionCard from "@/components/molecules/SectionCard.vue"
import FormField from "@/components/molecules/FormField.vue"
import InvoiceDocumentEntries from "./InvoiceDocumentEntries.vue"
import InvoiceStatusSelect from "./InvoiceStatusSelect.vue"
import DocumentUploadField from "@/components/molecules/DocumentUploadField.vue"
import DragDropZone from "@/components/molecules/DragDropZone.vue"
import UserSelect from "@/components/organisms/user/UserSelect.vue"
import { useInvoiceDocuments } from "@/composables/invoice/useInvoiceDocuments"
import { resolveFilePath, type ResolvedFile } from "@/composables/useFileResolver"

const props = defineProps<{
    modelValue: Invoice
    invoiceId?: number | null
    defaultPath?: string
    savedStatus?: string | null
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

watch(
    () => invoice.value.status,
    (status) => {
        if (status === "draft" && invoice.value.visaByUserId) {
            invoice.value = { ...invoice.value, visaByUserId: null }
        }
    }
)
</script>
