<template>
    <div class="max-w-8xl py-8 space-y-6">
        <!-- Title + Search -->
        <SectionCard :title="$t('home.title')" class="max-w-3xl mx-auto">
            <ProjectSelect
                id="home-project-search"
                v-model="selectedProjectId"
                class-name="w-full"
                :placeholder="$t('home.searchPlaceholder')"
                :include-archived="true"
                :include-ended="true"
                @update:model-value="handleProjectSelect"
            />
        </SectionCard>

        <!-- Alert for orphaned activities (only for managers) -->
        <div class="max-w-4xl mx-auto">
            <OrphanedActivitiesAlert />
        </div>

        <!-- Monthly hours stats -->
        <div class="max-w-6xl mx-auto">
            <MonthlyHoursStats />
        </div>

        <!-- Today's activities -->
        <div>
            <div class="flex items-baseline gap-2 mb-3">
                <h2 class="text-lg font-semibold text-gray-900">{{ $t("home.myDay") }}</h2>
                <span class="text-sm text-gray-500">{{ $t("home.myDayDescription") }}</span>
            </div>
        </div>
        <TimeEntriesManager
            :show-project-filter="false"
            :initial-filter="{
                includeBilled: false,
                includeUnbilled: true,
                userId: authStore.user?.id,
                fromDate: initialFromDate,
                toDate: initialToDate,
            }"
            initial-date-preset="today"
            hide-header
            empty-message="Aucune entrée d'heure trouvée"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import SectionCard from "@/components/molecules/SectionCard.vue"
import ProjectSelect from "@/components/organisms/project/ProjectSelect.vue"
import TimeEntriesManager from "@/components/organisms/time/TimeEntriesManager.vue"
import OrphanedActivitiesAlert from "@/components/organisms/activity/OrphanedActivitiesAlert.vue"
import MonthlyHoursStats from "@/components/organisms/activity/MonthlyHoursStats.vue"
import { useAuthStore } from "@/stores/auth"
import { getTodayRange } from "@/composables/utils/useDateRangePresets"

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()
const selectedProjectId = ref<number | undefined>(undefined)
const { from: initialFromDate, to: initialToDate } = getTodayRange()
onMounted(() => {
    document.title = t("home.documentTitle")
})

const handleProjectSelect = async (projectId?: number) => {
    if (!projectId) {
        selectedProjectId.value = undefined
        return
    }

    try {
        await router.push({ name: "project-view", params: { id: projectId } })
    } catch {
        // Ignore navigation duplication or aborted navigations
    } finally {
        selectedProjectId.value = undefined
    }
}
</script>
