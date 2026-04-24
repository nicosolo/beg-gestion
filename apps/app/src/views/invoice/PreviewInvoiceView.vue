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

                    <Button
                        v-if="canMarkAsSent"
                        variant="primary"
                        size="lg"
                        class="w-full sm:w-auto"
                        :loading="markingSent"
                        @click="showSentConfirm = true"
                    >
                        <svg class="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {{ $t("invoice.markAsSent") }}
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

            <ConfirmDialog
                v-model="showSentConfirm"
                :title="$t('invoice.markAsSent')"
                :message="$t('invoice.confirmMarkAsSent')"
                :confirm-text="$t('common.confirm')"
                :cancel-text="$t('common.cancel')"
                @confirm="handleMarkAsSent"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import InvoicePreview from "@/components/organisms/invoice/InvoicePreview.vue"
import { useFetchInvoice, useVisaInvoice, useUpdateInvoice } from "@/composables/api/useInvoice"
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
const { put: updateInvoice, loading: markingSent } = useUpdateInvoice()

// Invoice data
const invoice = ref<InvoiceResponse | null>(null)

const canVisa = computed(() => {
    const notVisaYet = invoice.value?.visaDate === null || invoice.value?.visaDate === undefined
    if (!notVisaYet) return false
    // admin & super_admin can visa any invoice
    if (authStore.isRole("admin")) return true
    // user_visa can visa only their own invoices (where they are in charge)
    if (authStore.user?.role === "user_visa") {
        return invoice.value?.inChargeUserId === authStore.user.id
    }
    return false
})
const showVisaConfirm = ref(false)
const showSentConfirm = ref(false)

const canMarkAsSent = computed(() => {
    return authStore.isRole("admin") && invoice.value?.status === "vise"
})

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

const handleMarkAsSent = async () => {
    if (!invoiceId.value) return
    try {
        const updated = await updateInvoice({
            params: { id: parseInt(invoiceId.value) },
            body: { status: "sent", visaByUserId: authStore.user?.id },
        })
        if (updated) {
            invoice.value = updated
            successAlert(t("invoice.markedAsSent"))
        }
    } catch (error) {
        console.error("Failed to mark invoice as sent:", error)
    } finally {
        showSentConfirm.value = false
    }
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
