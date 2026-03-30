<template>
    <div class="flex flex-wrap lg:flex-nowrap gap-4">
        <div class="w-full lg:w-2/3">
            <section class="mb-8">
                <h2 class="text-lg font-medium mb-4 bg-gray-100 p-2 text-center">HONORAIRES</h2>

                <div class="border border-gray-200 rounded overflow-x-scroll">
                    <table
                        class="w-full divide-y divide-gray-200 text-left min-w-[550px] table-fixed"
                    >
                        <colgroup>
                            <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w }" />
                        </colgroup>
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2">
                                    <Select
                                        v-model="selectedYear"
                                        :options="yearOptions"
                                        @update:modelValue="updateRatesForYear"
                                        class-name="w-full text-xs py-1"
                                    />
                                </th>
                                <th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                    base
                                </th>
                                <th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                    corrigé
                                </th>
                                <th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                    Tarif
                                </th>
                                <th
                                    class="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-right"
                                >
                                    Montant
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200 text-sm">
                            <tr v-for="(rate, index) in rates" :key="index">
                                <td class="px-4 py-2 text-gray-800 bg-gray-100">
                                    {{ rate.rateClass }}
                                </td>
                                <td class="px-4 py-2">
                                    <span>{{ formatDuration(rate.base) }}</span>
                                </td>
                                <td class="px-4 py-2">
                                    <InputNumber
                                        :modelValue="rate.adjusted"
                                        @update:modelValue="
                                            (value) => updateRate(index, 'adjusted', value)
                                        "
                                        type="time"
                                        class="w-20"
                                    />
                                </td>
                                <td class="px-4 py-2">
                                    <InputNumber
                                        :modelValue="rate.hourlyRate"
                                        @update:modelValue="
                                            (value) => updateRate(index, 'hourlyRate', value)
                                        "
                                        :currency="true"
                                        type="amount"
                                        class="w-24"
                                    />
                                </td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(rate.amount || 0) }}
                                </td>
                            </tr>
                            <!-- Subtotal row before discount -->
                            <tr class="font-medium bg-gray-50">
                                <td class="px-4 py-2">Sous-total</td>
                                <td class="px-4 py-2">{{ formatDuration(feesBase) }}</td>
                                <td class="px-4 py-2">{{ formatDuration(feesAdjusted) }}</td>
                                <td class="px-4 py-2"></td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(feesFinalTotal) }}
                                </td>
                            </tr>
                            <!-- Discount row -->
                            <tr>
                                <td class="px-4 py-2">
                                    <label class="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            :checked="hasDiscount"
                                            @change="toggleDiscount"
                                            class="h-4 w-4"
                                        />
                                        <span>Remise</span>
                                    </label>
                                </td>
                                <td class="px-4 py-2" colspan="2">
                                    <div v-if="hasDiscount" class="flex items-center gap-2">
                                        <label class="flex items-center gap-1">
                                            <input
                                                type="radio"
                                                name="discountType"
                                                value="percentage"
                                                :checked="discountType === 'percentage'"
                                                @change="setDiscountType('percentage')"
                                                class="h-3 w-3"
                                            />
                                            <span class="text-xs">%</span>
                                        </label>
                                        <label class="flex items-center gap-1">
                                            <input
                                                type="radio"
                                                name="discountType"
                                                value="fixed"
                                                :checked="discountType === 'fixed'"
                                                @change="setDiscountType('fixed')"
                                                class="h-3 w-3"
                                            />
                                            <span class="text-xs">CHF</span>
                                        </label>
                                    </div>
                                </td>
                                <td class="px-4 py-2">
                                    <div v-if="hasDiscount" class="flex items-center gap-1">
                                        <InputNumber
                                            v-if="discountType === 'percentage'"
                                            :modelValue="discountPercentage"
                                            @update:modelValue="updateDiscountPercentage"
                                            :min="0"
                                            :max="100"
                                            :step="1"
                                            type="percentage"
                                            class="w-20"
                                        />
                                        <span v-if="discountType === 'percentage'" class="text-sm"
                                        >%</span
                                        >
                                        <InputNumber
                                            v-if="discountType === 'fixed'"
                                            :modelValue="discountAmount"
                                            @update:modelValue="updateDiscountAmount"
                                            :min="0"
                                            :step="100"
                                            :currency="true"
                                            class="w-24"
                                        />
                                    </div>
                                </td>
                                <td class="px-4 py-2 text-right text-red-600">
                                    <span v-if="hasDiscount"
                                    >- {{ formatCurrency(discountAmount) }}</span
                                    >
                                </td>
                            </tr>
                            <!-- Other fees row -->
                            <tr>
                                <td class="px-4 py-2">Autres honoraires</td>
                                <td class="px-4 py-2" colspan="3">
                                    <InputNumber
                                        v-model="invoice.feesOthers"
                                        :step="100"
                                        :currency="true"
                                        class="w-24"
                                    />
                                </td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(invoice.feesOthers || 0) }}
                                </td>
                            </tr>
                            <!-- Final total row -->
                            <tr class="font-medium bg-gray-100">
                                <td class="px-4 py-2">TOTAL HONORAIRES</td>
                                <td class="px-4 py-2"></td>
                                <td class="px-4 py-2"></td>
                                <td class="px-4 py-2"></td>
                                <td class="px-4 py-2 text-right font-bold">
                                    {{ formatCurrency(feesTotal) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- FRAIS Section -->
            <section class="mb-8">
                <h2 class="text-lg font-medium mb-4 bg-gray-100 p-2 text-center">FRAIS</h2>
                <div class="border border-gray-200 rounded overflow-x-scroll">
                    <table
                        class="w-full divide-y divide-gray-200 text-left min-w-[550px] table-fixed"
                    >
                        <colgroup>
                            <col v-for="(w, i) in colWidths" :key="i" :style="{ width: w }" />
                        </colgroup>
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                    Type
                                </th>
                                <th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                    Base
                                </th>
                                <th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                    Corrigé
                                </th>
                                <th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                    Taux/Montant
                                </th>
                                <th
                                    class="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-right"
                                >
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200 text-sm">
                            <!-- Travel expenses (kilometers) -->
                            <tr v-if="!hasPackage">
                                <td class="px-4 py-2">Km</td>
                                <td class="px-4 py-2">{{ invoice.expensesTravelBase || 0 }} km</td>
                                <td class="px-4 py-2">
                                    <InputNumber
                                        v-model="invoice.expensesTravelAdjusted"
                                        :step="1"
                                        class="w-20"
                                    />
                                    <span class="ml-1">km</span>
                                </td>
                                <td class="px-4 py-2">
                                    <InputNumber
                                        v-model="invoice.expensesTravelRate"
                                        :step="0.01"
                                        :currency="true"
                                        class="w-24"
                                    />
                                    <span class="ml-1">CHF/km</span>
                                </td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(expensesTravelAmount || 0) }}
                                </td>
                            </tr>
                            <!-- Other expenses -->
                            <tr v-if="!hasPackage">
                                <td class="px-4 py-2">Autres frais</td>
                                <td class="px-4 py-2">
                                    {{ formatCurrency(invoice.expensesOtherBase || 0) }}
                                </td>
                                <td class="px-4 py-2" colspan="2">
                                    <InputNumber
                                        v-model="invoice.expensesOtherAmount"
                                        :currency="true"
                                        class="w-32"
                                    />
                                </td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(invoice.expensesOtherAmount || 0) }}
                                </td>
                            </tr>
                            <!-- Third-party expenses -->
                            <tr v-if="!hasPackage">
                                <td class="px-4 py-2">Frais tiers</td>
                                <td class="px-4 py-2" colspan="3">
                                    <InputNumber
                                        v-model="invoice.expensesThirdPartyAmount"
                                        :currency="true"
                                        class="w-32"
                                    />
                                </td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(invoice.expensesThirdPartyAmount || 0) }}
                                </td>
                            </tr>
                            <!-- Package option (similar to discount row) -->
                            <tr>
                                <td class="px-4 py-2">
                                    <label class="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            :checked="hasPackage"
                                            @change="togglePackage"
                                            class="h-4 w-4"
                                        />
                                        <span>Forfait frais</span>
                                    </label>
                                </td>
                                <td class="px-4 py-2" colspan="2">
                                    <div v-if="hasPackage" class="flex items-center gap-2">
                                        <label class="flex items-center gap-1">
                                            <input
                                                type="radio"
                                                name="packageType"
                                                value="percentage"
                                                :checked="packageType === 'percentage'"
                                                @change="setPackageType('percentage')"
                                                class="h-3 w-3"
                                            />
                                            <span class="text-xs">%</span>
                                        </label>
                                        <label class="flex items-center gap-1">
                                            <input
                                                type="radio"
                                                name="packageType"
                                                value="fixed"
                                                :checked="packageType === 'fixed'"
                                                @change="setPackageType('fixed')"
                                                class="h-3 w-3"
                                            />
                                            <span class="text-xs">CHF</span>
                                        </label>
                                    </div>
                                </td>
                                <td class="px-4 py-2">
                                    <div v-if="hasPackage" class="flex items-center gap-1">
                                        <InputNumber
                                            v-if="packageType === 'percentage'"
                                            :modelValue="invoice.expensesPackagePercentage || 0"
                                            @update:modelValue="updatePackagePercentage"
                                            :min="0"
                                            :max="100"
                                            :step="1"
                                            class="w-20"
                                        />
                                        <span v-if="packageType === 'percentage'" class="text-sm"
                                        >%</span
                                        >
                                        <InputNumber
                                            v-if="packageType === 'fixed'"
                                            :modelValue="invoice.expensesPackageAmount"
                                            @update:modelValue="updatePackageAmount"
                                            :min="0"
                                            :step="1"
                                            :currency="true"
                                            class="w-24"
                                        />
                                    </div>
                                </td>
                                <td class="px-4 py-2 text-right">
                                    <span v-if="hasPackage">{{
                                        formatCurrency(invoice.expensesPackageAmount || 0)
                                    }}</span>
                                </td>
                            </tr>
                            <tr class="font-medium bg-gray-100">
                                <td class="px-4 py-2" colspan="4">TOTAL FRAIS</td>
                                <td class="px-4 py-2 text-right font-bold">
                                    {{ formatCurrency(invoice.expensesTotalExpenses || 0) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Récapitulatif -->
            <section class="mb-8">
                <h2 class="text-lg font-medium mb-4 bg-gray-100 p-2 text-center">RÉCAPITULATIF</h2>
                <div class="border border-gray-200 rounded overflow-x-scroll">
                    <table
                        class="w-full divide-y divide-gray-200 text-left min-w-[550px] table-fixed"
                    >
                        <colgroup>
                            <col style="width: 80%" />
                            <col style="width: 20%" />
                        </colgroup>
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                    Description
                                </th>
                                <th
                                    class="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-right"
                                >
                                    Montant
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200 text-sm">
                            <tr class="font-medium">
                                <td class="px-4 py-2">TOTAL HT</td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(totalHT) }}
                                </td>
                            </tr>
                            <tr>
                                <td class="px-4 py-2">
                                    TVA
                                    <Select
                                        v-model="selectedVatYear"
                                        :options="vatYearOptions"
                                        @update:modelValue="updateVatRate"
                                        class-name="inline-block ml-1 w-20 text-xs py-0.5"
                                    />
                                    ({{ vatRate }}%)
                                </td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(vatAmount) }}
                                </td>
                            </tr>
                            <tr class="font-bold text-base">
                                <td class="px-4 py-2">TOTAL TTC</td>
                                <td class="px-4 py-2 text-right">
                                    {{ formatCurrency(totalTTC) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
        <!-- Collapsible sections for other services -->
        <div class="space-y-4 w-full lg:w-1/3">
            <!-- 1. Autres prestations -->
            <AccordionPanel
                id="otherServices"
                title="1. Autres prestations (ME, inclinos, pénétros...)"
                :defaultOpen="!!invoice.remarksOtherServices"
            >
                <template #content>
                    <Textarea
                        :value="invoice.remarksOtherServices || ''"
                        @input="
                            (e: Event) =>
                                updateRemarks(
                                    'otherServices',
                                    (e.target as HTMLTextAreaElement).value
                                )
                        "
                        rows="6"
                    ></Textarea>
                </template>
            </AccordionPanel>

            <AccordionPanel
                id="deplacements"
                title="2. Déplacements (voiture)"
                :defaultOpen="!!invoice.remarksTravelExpenses"
            >
                <template #content>
                    <Textarea
                        :value="invoice.remarksTravelExpenses || ''"
                        @input="
                            (e: Event) =>
                                updateRemarks(
                                    'travelExpenses',
                                    (e.target as HTMLTextAreaElement).value
                                )
                        "
                        rows="6"
                    ></Textarea>
                </template>
            </AccordionPanel>

            <AccordionPanel
                id="frais-remboursables"
                title="3. Frais remboursables (achats...)"
                :defaultOpen="!!invoice.remarksExpenses"
            >
                <template #content>
                    <Textarea
                        :value="invoice.remarksExpenses || ''"
                        @input="
                            (e: Event) =>
                                updateRemarks('expenses', (e.target as HTMLTextAreaElement).value)
                        "
                        rows="6"
                    ></Textarea>
                </template>
            </AccordionPanel>

            <AccordionPanel
                id="frais-laboratoire"
                title="4. Frais de laboratoire, pelle, minage"
                :defaultOpen="!!invoice.remarksThirdPartyExpenses"
            >
                <template #content>
                    <Textarea
                        :value="invoice.remarksThirdPartyExpenses || ''"
                        @input="
                            (e: Event) =>
                                updateRemarks(
                                    'thirdPartyExpenses',
                                    (e.target as HTMLTextAreaElement).value
                                )
                        "
                        rows="6"
                    ></Textarea>
                </template>
            </AccordionPanel>
        </div>
        <!-- Activities Section - Full Width Below -->
        <div
            v-if="(isNewInvoice && invoice.projectId) || (!isNewInvoice && invoice.id)"
            class="w-full"
        >
            <h2 class="text-lg font-medium mb-4 bg-gray-100 p-2 text-center">
                {{
                    isNewInvoice
                        ? "HEURES À INCLURE DANS LA FACTURE"
                        : "HEURES INCLUSES DANS LA FACTURE"
                }}
            </h2>
            <TimeEntriesManager
                disable-selection
                :initial-filter="
                    isNewInvoice
                        ? {
                            projectId: invoice.projectId,
                            includeBilled: false,
                            includeUnbilled: true,
                            fromDate: undefined,
                            toDate: undefined,
                        }
                        : {
                            invoiceId: parseInt(invoice.id),
                            limit: 30,
                            fromDate: undefined,
                            toDate: undefined,
                        }
                "
                :show-project-filter="false"
                :hide-columns="['project', 'billed', 'disbursement', 'actions']"
                hide-header
                :empty-message="
                    isNewInvoice
                        ? 'Aucune activité non facturée pour cette période'
                        : 'Aucune activité dans cette facture'
                "
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { type Invoice } from "@beg/validations"
import AccordionPanel from "../../molecules/AccordionPanel.vue"
import { useFormat } from "@/composables/utils/useFormat"
import { computed, ref, onMounted, watch } from "vue"
import InputNumber from "@/components/atoms/InputNumber.vue"
import TimeEntriesManager from "../time/TimeEntriesManager.vue"
import Textarea from "@/components/atoms/Textarea.vue"
import Select from "@/components/atoms/Select.vue"
import { useI18n } from "vue-i18n"
import { useFetchRates } from "@/composables/api/useRate"
import { useFetchVatRates } from "@/composables/api/useVatRate"
import { useVModel } from "@vueuse/core"

const props = defineProps<{
    modelValue: Invoice
}>()

const emit = defineEmits<{
    "update:modelValue": [value: Invoice]
}>()
const { t } = useI18n()
const { formatCurrency, formatDuration } = useFormat()

// Computed property for invoice - moved before it's used

const invoice = useVModel(props, "modelValue", emit)

const colWidths = ["25%", "15%", "16%", "20%", "24%"]

const { get: fetchRates, data: ratesData } = useFetchRates()
const { get: fetchVatRates, data: vatRates } = useFetchVatRates()

const allRatesForYears = computed(() => {
    if (!ratesData.value) return {}

    const ratesByYear: Record<number, Record<string, number>> = {}

    for (const rate of ratesData.value) {
        if (!ratesByYear[rate.year]) {
            ratesByYear[rate.year] = {}
        }
        ratesByYear[rate.year][rate.class] = rate.amount
    }

    return ratesByYear
})
const isNewInvoice = computed(() => !invoice.value.id || invoice.value.id === "")

const selectedYear = ref<number | null>(null)
const selectedVatYear = ref<number | null>(null)

const yearOptions = computed(() => [
    { label: t("common.change"), value: null },
    ...Object.keys(allRatesForYears.value || {})
        .map(Number)
        .sort((a, b) => b - a)
        .map((year) => ({
            label: String(year),
            value: year,
        })),
])

const vatYearOptions = computed(() => [
    { label: t("common.change"), value: null },
    ...([...(vatRates.value || [])]
        .sort((a, b) => b.year - a.year)
        .map((vr) => ({
            label: String(vr.year),
            value: vr.year,
        })) || []),
])

onMounted(async () => {
    await Promise.all([
        fetchRates({
            query: {
                years: Array.from(
                    { length: 5 },
                    (_, i) => i + new Date().getFullYear() - 4
                ).reverse(),
            },
        }),
        fetchVatRates(),
    ])
    if (isNewInvoice.value) {
        const year = new Date(invoice.value.periodEnd || new Date()).getFullYear()
        // Set rate year
        selectedYear.value = year
        updateRatesForYear()

        // Use the latest VAT year (first in sorted array)
        selectedVatYear.value = vatYearOptions.value[1].value
        updateVatRate()
    }
})

// Function to update rates when year changes
const updateRatesForYear = () => {
    if (!allRatesForYears.value || !selectedYear.value) return

    const yearRates = allRatesForYears.value[selectedYear.value]
    if (!yearRates) return

    if (!invoice.value.rates) invoice.value.rates = []
    console.log(yearRates)
    // Update hourly rates for each rate class
    const rates = invoice.value.rates.map((rate) => ({
        ...rate,
        hourlyRate: yearRates[rate.rateClass] || 0,
        amount: (rate.adjusted || 0) * (yearRates[rate.rateClass] || 0),
    }))
    console.log(rates)
    invoice.value.rates = rates
}

// Function to update VAT rate when year changes
const updateVatRate = () => {
    if (!vatRates.value || vatRates.value.length === 0 || !selectedVatYear.value) return

    // Find the VAT rate for the selected year (which should exist since we only show available years)
    const vatRateForYear = vatRates.value.find((vr) => vr.year === selectedVatYear.value)

    if (!vatRateForYear) return

    invoice.value.vatRate = vatRateForYear.rate
}

// Computed properties for data - using flat structure
const rates = computed(() => invoice.value.rates || [])

// These will be calculated by watchers, keeping as computed for template use
const feesBase = computed(() => invoice.value.feesBase || 0)
const feesAdjusted = computed(() => invoice.value.feesAdjusted || 0)
const feesFinalTotal = computed(() => invoice.value.feesFinalTotal || 0)
const feesTotal = computed(() => invoice.value.feesTotal || 0)

const hasDiscount = computed(
    () =>
        (invoice.value.feesDiscountPercentage || 0) > 0 ||
        (invoice.value.feesDiscountAmount || 0) > 0
)
const discountPercentage = computed(() => invoice.value.feesDiscountPercentage || 0)
const discountAmount = computed(() => invoice.value.feesDiscountAmount || 0)

const hasPackage = computed(() => invoice.value.expensesPackageAmount !== null)

// Computed properties for template display
const expensesTravelAmount = computed(() => invoice.value.expensesTravelAmount || 0)
const totalHT = computed(() => invoice.value.totalHT || 0)
const vatAmount = computed(() => invoice.value.vatAmount || 0)
const totalTTC = computed(() => invoice.value.totalTTC || 0)

// Watch for changes in rates and recalculate fee totals
watch(
    () => invoice.value.rates,
    (rates) => {
        if (!rates) return
        invoice.value.feesBase = rates.reduce((sum, rate) => sum + rate.base, 0)
        invoice.value.feesAdjusted = rates.reduce((sum, rate) => sum + rate.adjusted, 0)
        invoice.value.feesFinalTotal = rates.reduce((sum, rate) => sum + rate.amount, 0)
        invoice.value.feesMultiplicationFactor = 1
    },
    { deep: true, immediate: true }
)

// Watch for discount/other fees changes and recalculate feesTotal
watch(
    [
        () => invoice.value.feesFinalTotal,
        () => invoice.value.feesDiscountAmount,
        () => invoice.value.feesOthers,
    ],
    () => {
        invoice.value.feesTotal =
            (invoice.value.feesFinalTotal || 0) -
            (invoice.value.feesDiscountAmount || 0) +
            (invoice.value.feesOthers || 0)
    },
    { immediate: true }
)

// Calculate travel amount
watch(
    [() => invoice.value.expensesTravelAdjusted, () => invoice.value.expensesTravelRate],
    () => {
        invoice.value.expensesTravelAmount =
            (invoice.value.expensesTravelAdjusted || 0) * (invoice.value.expensesTravelRate || 0.7)
    },
    { immediate: true }
)

// Calculate total expenses: package fixed amount
watch(
    () => invoice.value.expensesPackageAmount,
    (amount) => {
        if (amount !== null) {
            invoice.value.expensesTotalExpenses = amount || 0
        }
    },
    { immediate: true }
)

// Calculate total expenses: package percentage
watch(
    [() => invoice.value.expensesPackagePercentage, () => invoice.value.feesTotal],
    () => {
        if ((invoice.value.expensesPackagePercentage || 0) > 0) {
            invoice.value.expensesTotalExpenses =
                ((invoice.value.feesTotal || 0) * (invoice.value.expensesPackagePercentage || 0)) /
                100
        }
    },
    { immediate: true }
)

// Calculate total expenses: sum of individual expenses
watch(
    [
        () => invoice.value.expensesTravelAmount,
        () => invoice.value.expensesOtherAmount,
        () => invoice.value.expensesThirdPartyAmount,
        () => invoice.value.expensesPackageAmount,
    ],
    () => {
        if (invoice.value.expensesPackageAmount === null) {
            invoice.value.expensesTotalExpenses =
                (invoice.value.expensesTravelAmount || 0) +
                (invoice.value.expensesOtherAmount || 0) +
                (invoice.value.expensesThirdPartyAmount || 0)
        }
    },
    { immediate: true }
)

// Watch for final total calculations
watch(
    [
        () => invoice.value.feesTotal,
        () => invoice.value.expensesTotalExpenses,
        () => invoice.value.vatRate,
    ],
    () => {
        invoice.value.totalHT =
            (invoice.value.feesTotal || 0) + (invoice.value.expensesTotalExpenses || 0)
        invoice.value.vatAmount = invoice.value.totalHT * ((invoice.value.vatRate || 0) / 100)
        invoice.value.totalTTC = invoice.value.totalHT + invoice.value.vatAmount
    },
    { immediate: true }
)
// Discount and package type states
const discountType = ref<"percentage" | "fixed">(
    invoice.value.feesDiscountAmount && invoice.value.feesDiscountAmount > 0
        ? "fixed"
        : "percentage"
)
const packageType = ref<"percentage" | "fixed">(
    invoice.value.expensesPackagePercentage && invoice.value.expensesPackagePercentage > 0
        ? "percentage"
        : "fixed"
)

const vatRate = computed(() => invoice.value.vatRate || 8.0)

// Helper function to update remarks
const updateRemarks = (field: string, value: string) => {
    // Map field names to flat structure
    const fieldMap: Record<string, string> = {
        otherServices: "remarksOtherServices",
        travelExpenses: "remarksTravelExpenses",
        expenses: "remarksExpenses",
        thirdPartyExpenses: "remarksThirdPartyExpenses",
    }
    const flatField = fieldMap[field]
    if (flatField) {
        // @ts-expect-error dynamic field access
        invoice.value[flatField] = value
    }
}

// Update rate
const updateRate = (index: number, field: string, value: any) => {
    if (!invoice.value.rates) invoice.value.rates = []
    invoice.value.rates = [...invoice.value.rates]
    invoice.value.rates[index] = { ...invoice.value.rates[index], [field]: value }
    // Recalculate amount
    const rate = invoice.value.rates[index]
    invoice.value.rates[index].amount = rate.adjusted * rate.hourlyRate
}

// Toggle discount
const toggleDiscount = () => {
    // Check if there's any discount currently applied
    const hasExistingDiscount =
        (invoice.value.feesDiscountPercentage || 0) > 0 ||
        (invoice.value.feesDiscountAmount || 0) > 0

    if (hasExistingDiscount) {
        // Remove discount
        invoice.value.feesDiscountPercentage = 0
        invoice.value.feesDiscountAmount = 0
    } else {
        // Apply default discount based on current type
        if (discountType.value === "percentage") {
            invoice.value.feesDiscountPercentage = 10
            invoice.value.feesDiscountAmount = (invoice.value.feesFinalTotal || 0) * 0.1
        } else {
            invoice.value.feesDiscountAmount = 100
            invoice.value.feesDiscountPercentage = 0
        }
    }
}

// Set discount type
const setDiscountType = (type: "percentage" | "fixed") => {
    discountType.value = type

    if (type === "percentage") {
        // Convert to percentage if was fixed
        if (!invoice.value.feesDiscountPercentage || invoice.value.feesDiscountPercentage === 0) {
            invoice.value.feesDiscountPercentage = 10
            invoice.value.feesDiscountAmount = (invoice.value.feesFinalTotal || 0) * 0.1
        }
    } else {
        // Convert to fixed if was percentage
        if (!invoice.value.feesDiscountAmount || invoice.value.feesDiscountAmount === 0) {
            invoice.value.feesDiscountAmount = 1000
            invoice.value.feesDiscountPercentage = 0
        }
    }
}

// Update discount percentage
const updateDiscountPercentage = (value: number) => {
    invoice.value.feesDiscountPercentage = value
    if (value && invoice.value.feesFinalTotal) {
        invoice.value.feesDiscountAmount = (invoice.value.feesFinalTotal * value) / 100
    } else {
        invoice.value.feesDiscountAmount = 0
    }
}

// Update discount amount (fixed)
const updateDiscountAmount = (value: number) => {
    invoice.value.feesDiscountAmount = value
    invoice.value.feesDiscountPercentage = 0 // Clear percentage when using fixed
}

// Toggle package
const togglePackage = () => {
    // Check if there's any package currently applied

    if (invoice.value.expensesPackageAmount !== null) {
        // Remove package
        invoice.value.expensesPackagePercentage = null
        invoice.value.expensesPackageAmount = null
    } else {
        // Apply default package based on current type
        if (packageType.value === "percentage") {
            invoice.value.expensesPackagePercentage = 4
            invoice.value.expensesPackageAmount = (invoice.value.feesTotal || 0) * 0.04
        } else {
            invoice.value.expensesPackageAmount = 500
            invoice.value.expensesPackagePercentage = 0
        }
    }
}

// Set package type
const setPackageType = (type: "percentage" | "fixed") => {
    packageType.value = type

    if (type === "percentage") {
        // Convert to percentage if was fixed
        if (invoice.value.expensesPackagePercentage !== null) {
            invoice.value.expensesPackagePercentage = 4
            invoice.value.expensesPackageAmount = (invoice.value.feesTotal || 0) * 0.04
        }
    } else {
        // Convert to fixed if was percentage
        if (invoice.value.expensesPackageAmount !== null) {
            invoice.value.expensesPackageAmount = 500
            invoice.value.expensesPackagePercentage = 0
        }
    }
}

// Update package percentage
const updatePackagePercentage = (value: number) => {
    invoice.value.expensesPackagePercentage = value
    // Calculate package amount based on current feesTotal from invoice
    if (value && invoice.value.feesTotal) {
        invoice.value.expensesPackageAmount = (invoice.value.feesTotal * value) / 100
    } else {
        invoice.value.expensesPackageAmount = 0
    }
}

// Update package amount (fixed)
const updatePackageAmount = (value: number) => {
    invoice.value.expensesPackageAmount = value
    invoice.value.expensesPackagePercentage = 0 // Clear percentage when using fixed
}
</script>
