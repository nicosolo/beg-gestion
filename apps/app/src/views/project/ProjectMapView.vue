<template>
    <div class="flex flex-col h-full">
        <div class="pb-4">
            <h1 class="text-2xl font-bold">{{ $t("projects.map.title") }}</h1>
            <ProjectFilterPanel
                :filter="filter"
                :show-sort="false"
                :show-name-input="false"
                @update:filter="handleFilterChange"
            />

            <div class="items-center justify-between mb-4">
                <div>
                    <p v-if="projects && projects.length > 0" class="text-sm text-gray-600 mt-1">
                        {{ $t("projects.map.projectCount", { count: projects.length }) }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        {{ $t("projects.map.filterInfo") }}
                    </p>
                </div>
            </div>
        </div>
        <div class="flex-1 -mx-4 md:mx-0 pb-6 min-h-0 relative">
            <!-- Loading indicator -->
            <div
                v-if="loading"
                class="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white/90 px-3 py-1.5 rounded-full shadow-md flex items-center gap-2"
            >
                <svg class="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                    />
                    <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
                <span class="text-sm text-gray-600">{{ $t("common.loading") }}</span>
            </div>

            <!-- No projects message -->
            <div
                v-if="!loading && projects && projects.length === 0 && !hasInteracted"
                class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
            >
                <p class="text-gray-500 bg-white/80 px-4 py-2 rounded-lg">
                    {{ $t("projects.map.noProjects") }}
                </p>
            </div>

            <ProjectMap
                :projects="projects ?? []"
                class="min-h-[500px] h-[calc(100vh-800px)] lg:h-[calc(100vh-600px)] md:h-[calc(100vh-500px)] w-full"
                @bounds-changed="handleBoundsChanged"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
defineOptions({ name: "ProjectMapView" })

import { ref, onMounted, onActivated } from "vue"
import { useFetchProjectMap } from "@/composables/api/useProjectMap"
import ProjectMap, { type MapBounds } from "@/components/organisms/project/ProjectMap.vue"
import ProjectFilterPanel, {
    type ProjectFilterModel,
} from "@/components/organisms/project/ProjectFilterPanel.vue"

// API client
const { get: fetchProjectMap, loading, data: projects } = useFetchProjectMap()

// Current map bounds (for viewport filtering)
const currentBounds = ref<MapBounds | null>(null)

// Track if map has been interacted with (to avoid showing "no projects" message when zoomed in)
const hasInteracted = ref(false)

// Initialize filter with default values
const filter = ref<ProjectFilterModel>({
    name: "",
    includeArchived: false,
    sortBy: "name",
    sortOrder: "asc",
    fromDate: undefined,
    toDate: undefined,
    referentUserId: undefined,
    projectTypeIds: [],
    hasUnbilledTime: false,
})

const loadProjects = async () => {
    const { projectTypeIds, ...rest } = filter.value
    await fetchProjectMap({
        query: {
            ...rest,
            projectTypeIds: projectTypeIds?.length ? projectTypeIds : undefined,
            ...(currentBounds.value ?? {}),
        },
    })
}

const handleFilterChange = (newFilter: ProjectFilterModel) => {
    filter.value = newFilter
    loadProjects()
}

const handleBoundsChanged = (bounds: MapBounds) => {
    hasInteracted.value = true
    currentBounds.value = bounds
    loadProjects()
}

onActivated(() => {
    document.title = "BEG - Projects Map"
})
// Initial load
onMounted(() => {
    loadProjects()
})
</script>
