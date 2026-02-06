<template>
    <div>
        <div class="mb-4 print:hidden">
            <Button variant="primary" :href="mailtoLink">Partager par email</Button>
        </div>
        <div class="invoice-preview print:p-0 p-6 text-sm" style="width: 17cm">
            <table class="line w-full border border-gray-300 border-collapse">
                <caption class="main text-base font-bold bg-gray-300 mt-6 p-1">
                    Informations pour la comptabilité
                </caption>
                <tbody>
                    <tr v-if="invoice.project">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Mandat
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            <router-link
                                :to="`/project/${invoice.project.id}/view`"
                                class="text-blue-600 hover:underline"
                            >
                                {{ invoice.project.projectNumber }}
                                <template v-if="invoice.project.subProjectName">
                                    - {{ invoice.project.subProjectName }}
                                </template>
                                - {{ invoice.project.name }}
                            </router-link>
                            <span v-if="invoice.project.client" class="text-gray-500 ml-1">
                                ({{ invoice.project.client.name }})
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Type de facture
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ $t(`invoice.type.${invoice.type || "invoice"}`) }}
                        </td>
                    </tr>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Statut
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ $t(`invoice.status.${invoice.status || "draft"}`) }}
                        </td>
                    </tr>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Visa
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            <template v-if="invoice.visaByUserId || invoice.visaBy">
                                {{ invoice.visaDate ? formatDate(invoice.visaDate) : "-" }} -
                                {{ visaByUserName || invoice.visaBy || "-" }}
                            </template>
                            <template v-else> Pas de visa </template>
                        </td>
                    </tr>
                    <tr v-if="invoice.inChargeUserId">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            {{ t("invoice.inChargeUser") }}
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ inChargeUserName }}
                        </td>
                    </tr>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Date d'émission
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ formatDate(invoice.issueDate || new Date()) }}
                        </td>
                    </tr>
                    <tr v-if="invoice.dueDate">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Date d'échéance
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ formatDate(invoice.dueDate) }}
                        </td>
                    </tr>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Mode de facturation
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ billingModeLabel }}
                        </td>
                    </tr>
                    <tr v-if="invoice.invoiceDocument">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            {{ t("invoice.document.label") }}
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            <button
                                v-if="buildFileUrl(invoice.id, invoice.invoiceDocument)"
                                type="button"
                                class="text-blue-600 hover:underline"
                                @click="downloadInvoiceFile(invoice.id, invoice.invoiceDocument)"
                            >
                                {{ extractFileName(invoice.invoiceDocument) }}
                            </button>
                            <template v-else>{{
                                extractFileName(invoice.invoiceDocument)
                            }}</template>
                        </td>
                    </tr>
                    <tr v-if="invoice.note">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Note
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ invoice.note }}
                        </td>
                    </tr>
                    <tr v-if="invoice.invoiceNumber">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Numéro de facture
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ invoice.invoiceNumber }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <table class="line w-full border border-gray-300 border-collapse">
                <caption class="main text-base font-bold bg-gray-300 mt-6 p-1">
                    Facture
                </caption>
                <tbody>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Adresse de facturation
                        </td>
                        <td
                            class="border border-gray-300 p-1 text-sm"
                            v-html="nl2br(invoice.clientAddress)"
                        ></td>
                    </tr>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Adresse d'envoi
                        </td>
                        <td
                            class="border border-gray-300 p-1 text-sm"
                            v-html="nl2br(invoice.recipientAddress)"
                        ></td>
                    </tr>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Objet
                        </td>
                        <td class="border border-gray-300 bg-gray-300 font-bold p-1">
                            {{ invoice.reference }}
                        </td>
                    </tr>
                    <tr v-if="invoice.period">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Période
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ invoice.period }}
                        </td>
                    </tr>
                    <tr v-else-if="invoice.periodStart && invoice.periodEnd">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Période de facturation
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            Du {{ formatDate(invoice.periodStart) }} au
                            {{ formatDate(invoice.periodEnd) }}
                        </td>
                    </tr>
                    <tr>
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Prestations
                        </td>
                        <td
                            class="border border-gray-300 p-1"
                            v-html="nl2br(invoice.description)"
                        ></td>
                    </tr>
                </tbody>
            </table>

            <table
                class="fac w-[70%] mx-auto border border-gray-300 border-collapse"
                v-if="shouldShowActivitySections"
            >
                <caption class="sub text-left font-bold p-1 text-sm">
                    Honoraires
                </caption>
                <thead>
                    <tr>
                        <td class="border border-gray-300 p-1 text-sm">Classe</td>
                        <td class="text-right border border-gray-300 p-1 text-sm w-1/4">Heures</td>
                        <td class="text-right border border-gray-300 p-1 text-sm w-1/4">Tarif</td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm w-1/4">
                            Montant
                        </td>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="rate in filteredRates" :key="rate.rateClass">
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ rate.rateClass }}
                        </td>
                        <td class="text-right border border-gray-300 p-1 text-sm">
                            {{ formatDuration(rate.adjusted) }}
                        </td>
                        <td class="text-right border border-gray-300 p-1 text-sm">
                            {{ formatCurrency(rate.hourlyRate) }}
                        </td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                            {{ formatCurrency(rate.amount) }}
                        </td>
                    </tr>
                    <tr>
                        <td class="border border-gray-300 p-1 text-sm" colspan="1">Total h.</td>
                        <td class="text-right border border-gray-300 p-1 text-sm">
                            {{ formatDuration(totalHours) }}
                        </td>
                        <td class="border border-gray-300 p-1 text-sm"></td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                            {{ formatCurrency(invoice.feesTotal || 0) }}
                        </td>
                    </tr>
                    <tr v-if="invoice.feesOthers && invoice.feesOthers !== 0">
                        <td class="border border-gray-300 p-1 text-sm" colspan="3">
                            Autres honoraires
                        </td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                            {{ formatCurrency(invoice.feesOthers) }}
                        </td>
                    </tr>
                    <tr v-if="invoice.feesDiscountPercentage">
                        <td class="border border-gray-300 p-1 text-sm" colspan="2">Rabais</td>
                        <td class="text-right border border-gray-300 p-1 text-sm">
                            {{ invoice.feesDiscountPercentage }}%
                        </td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                            -{{ formatCurrency(invoice.feesDiscountAmount || 0) }}
                        </td>
                    </tr>
                    <tr v-if="invoice.feesDiscountAmount && !invoice.feesDiscountPercentage">
                        <td class="border border-gray-300 p-1 text-sm" colspan="3">Rabais</td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                            -{{ formatCurrency(invoice.feesDiscountAmount) }}
                        </td>
                    </tr>
                    <tr>
                        <td class="border border-gray-300 p-1 text-sm" colspan="2">TOTAL</td>
                        <td class="border border-gray-300 p-1 text-sm"></td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                            {{ formatCurrency(invoice.feesFinalTotal || 0) }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <table
                class="fac w-[70%] mx-auto border border-gray-300 border-collapse"
                v-if="shouldShowActivitySections && (invoice.expensesPackageAmount || 0) > 0"
            >
                <caption class="sub text-left font-bold p-1 text-sm">
                    Frais
                </caption>
                <tbody>
                    <tr
                        v-if="
                            invoice.expensesPackagePercentage !== null &&
                            invoice.expensesPackagePercentage !== null
                        "
                    >
                        <td class="border border-gray-300 p-1 text-sm" colspan="2">
                            Frais BEG au %
                        </td>
                        <td class="text-right border border-gray-300 p-1 text-sm w-1/4">
                            {{ invoice.expensesPackagePercentage }}%
                        </td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm w-1/4">
                            {{ formatCurrency(invoice.expensesPackageAmount || 0) }}
                        </td>
                    </tr>
                    <template v-else>
                        <tr v-if="invoice.expensesTravelAmount > 0">
                            <td class="border border-gray-300 p-1 text-sm">Frais de déplacement</td>
                            <td class="text-right border border-gray-300 p-1 text-sm w-1/4">
                                {{ invoice.expensesTravelBase }} km
                            </td>
                            <td class="text-right border border-gray-300 p-1 text-sm w-1/4">
                                {{ formatCurrency(invoice.expensesTravelRate) }}/km
                            </td>
                            <td class="fac4 text-right border border-gray-300 p-1 text-sm w-1/4">
                                {{ formatCurrency(invoice.expensesTravelAmount) }}
                            </td>
                        </tr>
                        <tr v-if="invoice.expensesOtherAmount > 0">
                            <td class="border border-gray-300 p-1 text-sm" colspan="3">
                                Autres frais
                            </td>
                            <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                                {{ formatCurrency(invoice.expensesOtherAmount) }}
                            </td>
                        </tr>
                        <tr v-if="invoice.expensesThirdPartyAmount > 0">
                            <td class="border border-gray-300 p-1 text-sm" colspan="3">
                                Frais tiers
                            </td>
                            <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                                {{ formatCurrency(invoice.expensesThirdPartyAmount) }}
                            </td>
                        </tr>
                    </template>
                    <tr>
                        <td class="border border-gray-300 p-1 text-sm" colspan="3">
                            Total des frais
                        </td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                            {{ formatCurrency(invoice.expensesTotalExpenses || 0) }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <table
                class="fac w-[70%] mx-auto border border-gray-300 border-collapse"
                v-if="shouldShowActivitySections"
            >
                <caption class="sub text-left font-bold p-1 text-sm">
                    Montant total
                </caption>
                <tbody>
                    <tr>
                        <td class="border border-gray-300 p-1 text-sm font-bold" colspan="3">
                            TOTAL HT
                        </td>
                        <td
                            class="fac4 text-right border border-gray-300 p-1 text-sm font-bold w-1/4"
                        >
                            {{ formatCurrency(invoice.totalHT || 0) }}
                        </td>
                    </tr>
                    <tr>
                        <td class="border border-gray-300 p-1 text-sm" colspan="2">TVA</td>
                        <td class="text-right border border-gray-300 p-1 text-sm w-1/4">
                            {{ invoice.vatRate || 8.0 }}%
                        </td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm">
                            {{ formatCurrency(invoice.vatAmount || 0) }}
                        </td>
                    </tr>
                    <tr>
                        <td class="border border-gray-300 p-1 text-sm font-bold" colspan="3">
                            TOTAL TTC
                        </td>
                        <td class="fac4 text-right border border-gray-300 p-1 text-sm font-bold">
                            {{ formatCurrency(invoice.totalTTC || 0) }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Additional services and remarks -->
            <table
                class="fac w-[70%] mx-auto border border-gray-300 border-collapse"
                v-if="hasAdditionalInfo"
            >
                <caption class="sub text-left font-bold p-1 text-sm">
                    Informations complémentaires
                </caption>
                <tbody>
                    <tr v-if="invoice.otherServices">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Autres prestations
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ invoice.otherServices }}
                        </td>
                    </tr>
                    <tr v-if="invoice.remarksOtherServices">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Remarques prestations
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ invoice.remarksOtherServices }}
                        </td>
                    </tr>
                    <tr v-if="invoice.remarksTravelExpenses">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Remarques déplacements
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ invoice.remarksTravelExpenses }}
                        </td>
                    </tr>
                    <tr v-if="invoice.remarksExpenses">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Remarques frais
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ invoice.remarksExpenses }}
                        </td>
                    </tr>
                    <tr v-if="invoice.remarksThirdPartyExpenses">
                        <td
                            class="font-bold pr-4 text-right w-[4cm] border border-gray-300 p-1 text-sm"
                        >
                            Remarques frais tiers
                        </td>
                        <td class="border border-gray-300 p-1 text-sm">
                            {{ invoice.remarksThirdPartyExpenses }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <table class="line w-full border border-gray-300 border-collapse">
                <caption class="main text-base font-bold bg-gray-300 mt-6 p-1">
                    Liste des documents
                </caption>
            </table>

            <table
                class="line w-full border border-gray-300 border-collapse"
                v-if="invoice.offers && invoice.offers.length > 0"
            >
                <caption class="sub text-left font-bold p-1 text-sm">
                    Liste des offres
                </caption>
                <tbody>
                    <tr v-for="(offer, index) in invoice.offers" :key="index">
                        <td class="doc1 w-[1.8cm] border-none p-1 text-sm">
                            {{ formatDate(offer.date) }}
                        </td>
                        <td class="doc2 w-[5.7cm] border-none p-1 text-sm">
                            <button
                                v-if="buildFileUrl(invoice.id, offer.file)"
                                type="button"
                                class="text-blue-600 hover:underline"
                                @click="downloadInvoiceFile(invoice.id, offer.file)"
                            >
                                {{ extractFileName(offer.file) }}
                            </button>
                            <template v-else>{{ extractFileName(offer.file) }}</template>
                        </td>
                        <td class="doc3 border-none p-1 text-sm">{{ offer.remark }}</td>
                    </tr>
                </tbody>
            </table>

            <table
                class="line w-full border border-gray-300 border-collapse"
                v-if="invoice.adjudications && invoice.adjudications.length > 0"
            >
                <caption class="sub text-left font-bold p-1 text-sm">
                    Liste des adjudications
                </caption>
                <tbody>
                    <tr v-for="(adjudication, index) in invoice.adjudications" :key="index">
                        <td class="doc1 w-[1.8cm] border-none p-1 text-sm">
                            {{ formatDate(adjudication.date) }}
                        </td>
                        <td class="doc2 w-[5.7cm] border-none p-1 text-sm">
                            <button
                                v-if="buildFileUrl(invoice.id, adjudication.file)"
                                type="button"
                                class="text-blue-600 hover:underline"
                                @click="downloadInvoiceFile(invoice.id, adjudication.file)"
                            >
                                {{ extractFileName(adjudication.file) }}
                            </button>
                            <template v-else>{{ extractFileName(adjudication.file) }}</template>
                        </td>
                        <td class="doc3 border-none p-1 text-sm">{{ adjudication.remark }}</td>
                    </tr>
                </tbody>
            </table>

            <table
                class="line w-full border border-gray-300 border-collapse"
                v-if="invoice.situations && invoice.situations.length > 0"
            >
                <caption class="sub text-left font-bold p-1 text-sm">
                    Liste des situations
                </caption>
                <tbody>
                    <tr v-for="(situation, index) in invoice.situations" :key="index">
                        <td class="doc1 w-[1.8cm] border-none p-1 text-sm">
                            {{ formatDate(situation.date) }}
                        </td>
                        <td class="doc2 w-[5.7cm] border-none p-1 text-sm">
                            <button
                                v-if="buildFileUrl(invoice.id, situation.file)"
                                type="button"
                                class="text-blue-600 hover:underline"
                                @click="downloadInvoiceFile(invoice.id, situation.file)"
                            >
                                {{ extractFileName(situation.file) }}
                            </button>
                            <template v-else>{{ extractFileName(situation.file) }}</template>
                        </td>
                        <td class="doc3 border-none p-1 text-sm">{{ situation.remark }}</td>
                    </tr>
                </tbody>
            </table>

            <table
                class="line w-full border border-gray-300 border-collapse"
                v-if="invoice.documents && invoice.documents.length > 0"
            >
                <caption class="sub text-left font-bold p-1 text-sm">
                    Liste des documents
                </caption>
                <tbody>
                    <tr v-for="(document, index) in invoice.documents" :key="index">
                        <td class="doc1 w-[1.8cm] border-none p-1 text-sm">
                            {{ formatDate(document.date) }}
                        </td>
                        <td class="doc2 w-[5.7cm] border-none p-1 text-sm">
                            <button
                                v-if="buildFileUrl(invoice.id, document.file)"
                                type="button"
                                class="text-blue-600 hover:underline"
                                @click="downloadInvoiceFile(invoice.id, document.file)"
                            >
                                {{ extractFileName(document.file) }}
                            </button>
                            <template v-else>{{ extractFileName(document.file) }}</template>
                        </td>
                        <td class="doc3 border-none p-1 text-sm">{{ document.remark }}</td>
                    </tr>
                </tbody>
            </table>
            <button
                v-if="invoice.legacyInvoicePath && isTauri"
                type="button"
                class="text-blue-600 hover:underline"
                @click="openLegacyInvoice"
            >
                Facture originale:
                {{ extractFileName(invoice.legacyInvoicePath.replace(/\.fab$/i, ".html")) }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { type InvoiceResponse } from "@beg/validations"
import { useFormat } from "@/composables/utils/useFormat"
import { useI18n } from "vue-i18n"
import { useInvoiceDocuments } from "@/composables/invoice/useInvoiceDocuments"
import Button from "@/components/atoms/Button.vue"
import { useTauri } from "@/composables/useTauri"
import { useAppSettingsStore } from "@/stores/appSettings"

interface InvoiceProps {
    invoice: InvoiceResponse
}

const props = defineProps<InvoiceProps>()
const { formatCurrency, formatDuration, formatDate, nl2br } = useFormat()
const { t } = useI18n()
const { buildFileUrl, downloadInvoiceFile, extractFileName } = useInvoiceDocuments()
const { isTauri, openFile } = useTauri()

const openLegacyInvoice = async () => {
    const appSettingsStore = useAppSettingsStore()
    const absolutePath = appSettingsStore.getAbsolutePath(
        props.invoice.legacyInvoicePath?.replace(/\.fab$/i, ".html") || ""
    )
    if (isTauri.value) {
        await openFile(absolutePath)
    }
}

const inChargeUserName = computed(() => {
    const user = props.invoice.inChargeUser
    if (!user) return ""
    return `${user.initials} - ${user.firstName} ${user.lastName}`
})

const visaByUserName = computed(() => {
    const user = props.invoice.visaByUser
    if (!user) return ""
    return user.firstName
})

const filteredRates = computed(() => {
    // Only show rates with hours > 0
    if (!props.invoice.rates) return []
    return props.invoice.rates.filter((rate) => rate.adjusted > 0)
})

const billingModeLabel = computed(() => {
    return t(`invoice.billingMode.${props.invoice.billingMode || "accordingToData"}`)
})

const shouldShowActivitySections = computed(() => {
    return (
        props.invoice.billingMode !== "accordingToOffer" &&
        props.invoice.billingMode !== "accordingToInvoice"
    )
})

const totalHours = computed(() => {
    return filteredRates.value.reduce((acc, rate) => acc + rate.adjusted, 0)
})

const hasAdditionalInfo = computed(() => {
    return !!(
        props.invoice.otherServices ||
        props.invoice.remarksOtherServices ||
        props.invoice.remarksTravelExpenses ||
        props.invoice.remarksExpenses ||
        props.invoice.remarksThirdPartyExpenses
    )
})

const invoiceUrl = computed(() => {
    const path = `/invoice/${props.invoice.id}/preview`
    return `beg-gestion:/${path}`
})

const projectUrl = computed(() => {
    if (!props.invoice.project) return null
    const path = `/project/${props.invoice.project.id}/view`
    return `beg-gestion:/${path}`
})

const mailtoLink = computed(() => {
    const subject = encodeURIComponent(
        `Facture ${props.invoice.invoiceNumber || props.invoice.reference || ""}`
    )
    let text = `Bonjour,\n\nVeuillez trouver ci-joint le lien vers la facture:\n\n${invoiceUrl.value}`
    if (projectUrl.value) {
        text += `\n\nMandat: ${projectUrl.value}`
    }
    text += `\n\nCordialement`
    const body = encodeURIComponent(text)
    return `mailto:?subject=${subject}&body=${body}`
})
</script>

<style scoped>
.line {
    width: 100%;
}

.main {
    background-color: #c0c0c0;
    font-size: 100%;
    margin-top: 20px;
    padding: 4px;
}

.sub {
    font-weight: bold;
    text-align: left;
    padding: 4px;
}

@media print {
    .invoice-preview {
        font-size: 10px;
        margin: 0 auto;
    }

    .invoice-preview table {
        font-size: 10px;
    }

    .invoice-preview td,
    .invoice-preview th {
        padding: 2px 4px;
        font-size: 10px;
    }

    .main {
        font-size: 12px;
        margin-top: 12px;
        padding: 2px 4px;
    }

    .sub {
        font-size: 11px;
        padding: 2px 4px;
    }
}
</style>
