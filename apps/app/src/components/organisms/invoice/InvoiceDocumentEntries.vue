<template>
    <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-gray-700">
                {{ title }}
            </h3>
            <button
                type="button"
                class="px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                @click="addEntry"
            >
                + {{ addButtonLabel }}
            </button>
        </div>

        <DragDropZone
            highlight-class="border-blue-500 border-2 bg-blue-50 rounded"
            normal-class="border border-gray-300 rounded"
            @drop="handleFileDrop"
        >
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {{ t("invoice.documents.headers.file") }}
                        </th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {{ t("invoice.documents.headers.date") }}
                        </th>
                        <th
                            v-if="showAmount"
                            class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                            {{ t("invoice.documents.headers.amount") }}
                        </th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {{ t("invoice.documents.headers.remark") }}
                        </th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {{ t("common.actions") }}
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-if="!entries.length">
                        <td class="px-4 py-3 text-sm text-gray-500" :colspan="showAmount ? 5 : 4">
                            {{ emptyStateLabel }}
                        </td>
                    </tr>
                    <tr v-for="(entry, index) in entries" :key="index">
                        <td class="px-4 py-2 text-sm text-gray-900">
                            <DocumentUploadField
                                :required="!entry.file"
                                :file-name="entry.file"
                                :display-name="displayFileName(entry.file)"
                                :accept="accept"
                                :default-path="props.defaultPath"
                                :upload-label="t('invoice.documents.actions.upload')"
                                :replace-label="t('invoice.documents.actions.replace')"
                                :remove-label="t('common.remove')"
                                @select="(file) => handleFileSelected(index, file)"
                                @select-path="(path) => handlePathSelected(index, path)"
                                @clear="() => clearFile(index)"
                            >
                                <template #preview>
                                    <button
                                        v-if="previewUrl(entry.file)"
                                        type="button"
                                        class="text-blue-600 hover:underline"
                                        @click="downloadFile(entry.file)"
                                    >
                                        {{ t("common.view") }}
                                    </button>
                                </template>
                            </DocumentUploadField>
                        </td>
                        <td class="px-4 py-2 text-sm text-gray-900">
                            <Input
                                type="date"
                                :modelValue="formatDateValue(entry.date)"
                                :required="Boolean(entry.file)"
                                @update:modelValue="(value) => updateEntry(index, 'date', value)"
                            />
                        </td>
                        <td v-if="showAmount" class="px-4 py-2 text-sm text-gray-900">
                            <Input
                                type="number"
                                :modelValue="formatAmount(entry.amount)"
                                :required="Boolean(entry.file)"
                                @update:modelValue="(value) => updateEntry(index, 'amount', value)"
                            />
                        </td>
                        <td class="px-4 py-2 text-sm text-gray-900">
                            <Input
                                type="text"
                                :modelValue="entry.remark || ''"
                                @update:modelValue="(value) => updateEntry(index, 'remark', value)"
                            />
                        </td>
                        <td class="px-4 py-2 text-sm text-gray-900">
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                @click="removeEntry(index)"
                            >
                                X
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </DragDropZone>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import Input from "@/components/atoms/Input.vue"
import DocumentUploadField from "@/components/molecules/DocumentUploadField.vue"
import DragDropZone from "@/components/molecules/DragDropZone.vue"
import { useInvoiceDocuments } from "@/composables/invoice/useInvoiceDocuments"
import Button from "@/components/atoms/Button.vue"
import { resolveFilePath, type ResolvedFile } from "@/composables/useFileResolver"

export interface InvoiceDocumentEntry {
    file: string
    date?: string | Date | null
    amount?: number | null
    remark?: string | null
}

const props = withDefaults(
    defineProps<{
        title: string
        addButtonLabel: string
        emptyStateLabel: string
        entryType: "offer" | "adjudication" | "situation" | "document"
        modelValue: InvoiceDocumentEntry[]
        invoiceId?: number | null
        accept?: string
        showAmount?: boolean
        defaultPath?: string
    }>(),
    {
        showAmount: true,
        invoiceId: null,
    }
)

const emit = defineEmits<{
    (e: "update:modelValue", value: InvoiceDocumentEntry[]): void
    (e: "file-change", value: { index: number; file: File | null }): void
    (e: "entry-removed", value: { index: number }): void
}>()

const { t } = useI18n()
const { buildFileUrl, downloadInvoiceFile, extractFileName } = useInvoiceDocuments()

const handleFileDrop = (files: ResolvedFile[]) => {
    for (const result of files) {
        const newIndex = entries.value.length
        entries.value = [
            ...entries.value,
            { file: result.relativePath, date: "", amount: null, remark: "" },
        ]
        if ("file" in result) {
            emit("file-change", { index: newIndex, file: result.file })
        }
    }
}

const entries = computed({
    get: () => props.modelValue || [],
    set: (value: InvoiceDocumentEntry[]) => emit("update:modelValue", value),
})

const accept = computed(
    () =>
        props.accept ||
        ".pdf,.doc,.docx,.xls,.xlsx,.html,.jpg,.jpeg,.png,.gif,.nef,.tiff,.bmp,.heic,.heif,.webp,.ppt,.pptx"
)

const showAmount = computed(() => props.showAmount)

const addEntry = () => {
    entries.value = [
        ...entries.value,
        {
            file: "",
            date: "",
            amount: null,
            remark: "",
        },
    ]
}

const removeEntry = (index: number) => {
    const updated = [...entries.value]
    updated.splice(index, 1)
    entries.value = updated
    emit("file-change", { index, file: null })
    emit("entry-removed", { index })
}

const updateEntry = (index: number, field: keyof InvoiceDocumentEntry, value: unknown) => {
    const updated = [...entries.value]
    const entry = { ...updated[index] }

    if (field === "amount") {
        const parsed = typeof value === "string" ? parseFloat(value) : Number(value)
        entry.amount = Number.isFinite(parsed) ? parsed : null
    } else if (field === "date") {
        entry.date = value as string
    } else if (field === "file") {
        entry.file = (value as string) || ""
    } else if (field === "remark") {
        entry.remark = (value as string) || ""
    }

    updated[index] = entry
    entries.value = updated
}

const clearFile = (index: number) => {
    updateEntry(index, "file", "")
    emit("file-change", { index, file: null })
}

const handleFileSelected = (index: number, file: File | null) => {
    if (!file) {
        updateEntry(index, "file", "")
        emit("file-change", { index, file: null })
        return
    }

    // Browser File objects don't expose full path for security reasons
    // Tauri paths only come through drag and drop or native file dialog
    updateEntry(index, "file", file.name)
    emit("file-change", { index, file })
}

const handlePathSelected = async (index: number, filePath: string) => {
    try {
        const result = await resolveFilePath(filePath)
        updateEntry(index, "file", result.relativePath)
        if ("file" in result) {
            emit("file-change", { index, file: result.file })
        }
    } catch (error) {
        console.error("Failed to read file:", filePath, error)
    }
}

const isStoredFile = (file?: string | null) => {
    if (!file) return false
    const value = file.trim()
    if (!value) return false
    return value.includes("/") || value.includes("\\")
}

const previewUrl = (file?: string | null) => {
    if (!isStoredFile(file)) return null
    if (!props.invoiceId) return null
    return buildFileUrl(props.invoiceId, file)
}

const downloadFile = (file?: string | null) => {
    if (!props.invoiceId) return
    downloadInvoiceFile(props.invoiceId, file)
}

const displayFileName = (file?: string | null) => extractFileName(file)

const formatDateValue = (value: InvoiceDocumentEntry["date"]) => {
    if (!value) return ""
    if (!(value instanceof Date)) {
        try {
            value = new Date(value)
        } catch (e) {}
    }
    if (!(value instanceof Date)) {
        return value
    }
    return value.toISOString().split("T")[0]
}

const formatAmount = (value: InvoiceDocumentEntry["amount"]) => {
    if (value === null || value === undefined) return ""
    return String(value)
}
</script>
