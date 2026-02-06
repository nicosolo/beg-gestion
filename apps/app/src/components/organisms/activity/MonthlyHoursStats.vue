<template>
    <div class="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">
                {{ $t("home.monthlyStats.title") }}
            </h2>
            <div class="flex items-center gap-2">
                <button type="button" class="p-1 rounded hover:bg-gray-100" @click="previousYear">
                    <ChevronLeftIcon class="h-5 w-5 text-gray-600" />
                </button>
                <span class="text-sm font-medium text-gray-700 min-w-[4rem] text-center">
                    {{ year }}
                </span>
                <button
                    type="button"
                    class="p-1 rounded hover:bg-gray-100"
                    :disabled="year >= currentYear"
                    :class="{ 'opacity-50 cursor-not-allowed': year >= currentYear }"
                    @click="nextYear"
                >
                    <ChevronRightIcon class="h-5 w-5 text-gray-600" />
                </button>
            </div>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="data" class="space-y-4">
            <div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                <div
                    v-for="item in visibleMonths"
                    :key="item.month"
                    class="bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm"
                    :class="{
                        'border-primary-500 border-2':
                            item.month === currentMonth && year === currentYear,
                    }"
                >
                    <div class="text-xs text-gray-500 uppercase">
                        {{ monthNames[item.month - 1] }}
                    </div>
                    <div class="text-lg font-semibold text-gray-900 mt-1">
                        {{ formatDuration(item.duration) }}
                    </div>
                </div>
            </div>

            <div class="flex justify-end pt-2 border-t border-gray-200">
                <div class="text-sm text-gray-600">
                    {{ $t("home.monthlyStats.total") }}:
                    <span class="font-semibold text-gray-900">
                        {{ formatDuration(data.totalDuration) }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue"
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline"
import { useFetchMyMonthlyStats } from "@/composables/api/useActivity"
import { useFormat } from "@/composables/utils/useFormat"
const { formatDuration } = useFormat()
const { get: fetchStats, data, loading } = useFetchMyMonthlyStats()

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const year = ref(currentYear)

const monthNames = [
    "jan",
    "fev",
    "mar",
    "avr",
    "mai",
    "jun",
    "jul",
    "aou",
    "sep",
    "oct",
    "nov",
    "dec",
]

const visibleMonths = computed(() => {
    if (!data.value) return []
    if (year.value < currentYear) return data.value.months
    return data.value.months.filter((m) => m.month <= currentMonth)
})

const loadStats = () => {
    fetchStats({ query: { year: year.value } })
}

const previousYear = () => {
    year.value--
}

const nextYear = () => {
    if (year.value < currentYear) {
        year.value++
    }
}

onMounted(() => {
    loadStats()
})

watch(year, () => {
    loadStats()
})
</script>
