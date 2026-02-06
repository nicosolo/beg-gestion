<template>
    <div class="container mx-auto p-4">
        <div v-if="loading" class="text-center py-8">
            <div
                class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"
            ></div>
            <p class="mt-2 text-gray-600">Chargement de la facture...</p>
        </div>

        <div v-else-if="error" class="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {{ error }}
        </div>

        <template v-else>
            <div
                class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6 print:hidden"
            >
                <h1 class="text-2xl font-bold">Aperçu de la facture</h1>
                <div class="flex flex-wrap gap-2 justify-start md:justify-end">
                    <Button
                        v-if="invoice?.project?.id"
                        variant="ghost-primary"
                        size="lg"
                        class="w-full sm:w-auto"
                        :to="{
                            name: 'project-view',
                            params: { id: invoice.project.id },
                            query: { tab: 'invoices' },
                        }"
                    >
                        Retour à la vue projet
                    </Button>

                    <Button
                        @click="printInvoice"
                        size="lg"
                        variant="primary"
                        class="w-full sm:w-auto"
                    >
                        Imprimer la facture
                    </Button>

                    <Button
                        variant="secondary"
                        size="lg"
                        class="w-full sm:w-auto"
                        :to="{ name: 'invoice-edit', params: { id: $route.params.id } }"
                    >
                        Edition
                    </Button>

                    <Button
                        v-if="canVisa"
                        variant="primary"
                        size="lg"
                        class="w-full sm:w-auto"
                        :loading="visaLoading"
                        @click="openVisaDialog"
                    >
                        Visa
                    </Button>
                </div>
            </div>

            <InvoicePreview v-if="invoice" :invoice="invoice" />

            <ConfirmDialog
                v-model="showVisaConfirm"
                title="Visa de la facture"
                message="Confirmer le visa de cette facture ?"
                confirm-text="Confirmer"
                cancel-text="Annuler"
                @confirm="handleVisa"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import InvoicePreview from "@/components/organisms/invoice/InvoicePreview.vue"
import { useFetchInvoice, useVisaInvoice } from "@/composables/api/useInvoice"
import type { InvoiceResponse } from "@beg/validations"
import Button from "@/components/atoms/Button.vue"
import { useAuthStore } from "@/stores/auth"
import ConfirmDialog from "@/components/molecules/ConfirmDialog.vue"
import { useAlert } from "@/composables/utils/useAlert"
import { useI18n } from "vue-i18n"

const route = useRoute()
const router = useRouter()
const invoiceId = computed(() => route.params.id as string | undefined)
const authStore = useAuthStore()
const { successAlert } = useAlert()
const { t } = useI18n()

// API composable
const { get: fetchInvoice, loading, error } = useFetchInvoice()
const { post: postVisa, loading: visaLoading } = useVisaInvoice()

// Invoice data
const invoice = ref<InvoiceResponse | null>(null)

const canVisa = computed(() => {
    const isSuperAdmin = authStore.isRole("super_admin")
    const notVisaYet = invoice.value?.visaDate === null || invoice.value?.visaDate === undefined
    return isSuperAdmin && notVisaYet
})
const showVisaConfirm = ref(false)

const openVisaDialog = () => {
    if (!invoiceId.value) {
        return
    }
    showVisaConfirm.value = true
}

// Load invoice
const loadInvoice = async () => {
    if (invoiceId.value) {
        try {
            const data = await fetchInvoice({ params: { id: parseInt(invoiceId.value) } })
            if (data) {
                invoice.value = data
            }
        } catch (err) {
            console.error("Failed to load invoice:", err)
            // If loading fails, redirect back to list
            router.push({ name: "invoice-list" })
        }
    }
}

const printInvoice = () => {
    window.print()
}

const handleVisa = async () => {
    if (!invoiceId.value) return
    try {
        const updated = await postVisa({ params: { id: parseInt(invoiceId.value) } })
        if (updated) {
            invoice.value = updated
            successAlert(t("invoice.visa.success"), 4000)
        }
    } catch (error) {
        console.error("Failed to visa invoice:", error)
    } finally {
        showVisaConfirm.value = false
    }
}

onMounted(() => {
    document.title = "BEG - Aperçu de facture"
    loadInvoice()
})
</script>

<style scoped>
@media print {
}
</style>
