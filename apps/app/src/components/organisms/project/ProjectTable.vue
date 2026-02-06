<template>
    <DataTable
        :items="projects"
        :columns="columns"
        itemKey="id"
        :sort="sort"
        @sort-change="handleSortChange"
        :emptyMessage="$t('projects.noProjectsFound')"
        :row-class="getRowClass"
    >
        <template #cell:name="{ item }">
            <div>
                <Badge v-if="item.status === 'offer'" variant="info" class="mr-2">
                    {{ $t("projects.status.offer") }}
                </Badge>
                <Badge v-else-if="item.status === 'draft'" variant="warning" class="mr-2">
                    {{ $t("projects.status.draft") }}
                </Badge>
                <span class="text-md font-medium mr-2"
                    >{{ item.projectNumber
                    }}{{ item.subProjectName ? ` ${item.subProjectName}` : "" }}</span
                >
                <Badge v-if="item.ended" variant="muted" class="mr-2">
                    {{ $t("projects.ended") }}
                </Badge>
                <span class="text-sm text-gray-600">{{ item.name }}</span>
                <a
                    v-if="getMapUrl(item)"
                    :href="getMapUrl(item) ?? undefined"
                    target="_blank"
                    rel="noopener"
                    class="ml-2 text-indigo-600 hover:underline"
                >
                    {{ $t("projects.openGeoAdminMap") }}
                </a>
            </div>
        </template>

        <template #cell:unBilledDuration="{ item }">
            <div class="text-sm text-gray-900">
                {{ formatDuration(item.unBilledDuration) }}
            </div>
        </template>

        <template #cell:totalDuration="{ item }">
            <div class="text-sm text-gray-900">
                {{ formatDuration(item.totalDuration) }}
            </div>
        </template>

        <template #cell:firstActivityDate="{ item }">
            <div class="text-sm text-gray-900">
                {{ formatDate(item.firstActivityDate) }}
            </div>
        </template>

        <template #cell:lastActivityDate="{ item }">
            <div class="text-sm text-gray-900">
                {{ formatDate(item.lastActivityDate) }}
            </div>
        </template>

        <template #cell:createdAt="{ item }">
            <div class="text-sm text-gray-900">
                {{ formatDate(item.createdAt) }}
            </div>
        </template>

        <template #cell:actions="{ item }">
            <div class="flex flex-row sm:flex-col md:flex-row gap-2">
                <Button
                    @click="$emit('add-hours', item.id)"
                    variant="secondary"
                    size="sm"
                    class="whitespace-nowrap w-fit"
                >
                    Ajouter des heures
                </Button>

                <Button
                    :to="{
                        name: 'project-view',
                        params: { id: item.id },
                        query: { tab: 'activities' },
                    }"
                    variant="ghost-primary"
                    size="sm"
                    class="whitespace-nowrap w-fit"
                >
                    Heures
                </Button>
                <!-- 
                <Button
                    v-if="item.unBilledDuration && item.unBilledDuration > 0"
                    :to="{ name: 'invoice-new', query: { projectId: item.id } }"
                    variant="ghost-primary"
                    size="sm"
                    class="whitespace-nowrap w-fit"
                >
                    Facturer
                </Button> -->

                <Button
                    :to="{ name: 'project-view', params: { id: item.id } }"
                    variant="primary"
                    size="sm"
                    class="whitespace-nowrap w-fit"
                >
                    Détails
                </Button>
            </div>
        </template>
    </DataTable>
</template>

<script setup lang="ts">
import DataTable from "@/components/molecules/DataTable.vue"
import Button from "@/components/atoms/Button.vue"
import Badge from "@/components/atoms/Badge.vue"
import { useI18n } from "vue-i18n"
import { useFormat } from "@/composables/utils/useFormat"
import { ref } from "vue"
import type { ProjectFilter, ProjectResponse } from "@beg/validations"
import { buildGeoAdminUrl } from "@/utils/coordinates"

interface Props {
    projects: ProjectResponse[]
    sort: { key: ProjectFilter["sortBy"]; direction: ProjectFilter["sortOrder"] }
}

const emit = defineEmits<{
    (e: "sort-change", sort: { key: string; direction: "asc" | "desc" }): void
    (e: "add-hours", projectId: number): void
}>()

const getRowClass = (item: ProjectResponse) => {
    if (item.ended) {
        return "bg-amber-100/50"
    }
    if (item.lastActivityDate) {
        const lastActivityDate = new Date(item.lastActivityDate)
        if (item.unBilledDuration && item.unBilledDuration > 0) {
            if (lastActivityDate.getTime() < Date.now() - 180 * 24 * 60 * 60 * 1000) {
                return "bg-purple-100"
            }
            if (lastActivityDate.getTime() < Date.now() - 60 * 24 * 60 * 60 * 1000) {
                return "bg-red-100"
            }
        }
    }
    return "bg-white"
}
const handleSortChange = (sort: { key: string; direction: "asc" | "desc" }) => {
    console.log("handleSortChange", sort)
    emit("sort-change", sort)
}

const { t } = useI18n()

const { projects, sort } = defineProps<Props>()

const columns = ref([
    {
        key: "name",
        label: t("projects.titleSingular"),
        sortable: true,
        sortKey: "projectNumber",
    },

    {
        key: "unBilledDuration",
        label: t("projects.unBilledDuration"),
        nowrap: true,
        sortable: true,
        sortKey: "unBilledDuration",
        width: "8rem",
    },
    {
        key: "totalDuration",
        label: t("projects.totalDuration"),
        nowrap: true,
        sortKey: "totalDuration",
        sortable: true,
        width: "8rem",
    },
    // {
    //     key: "firstActivityDate",
    //     label: t("projects.firstActivity"),
    //     nowrap: true,
    //     sortKey: "firstActivityDate",
    //     width: "10rem",
    // },
    {
        key: "lastActivityDate",
        label: t("projects.lastActivity"),
        sortKey: "lastActivityDate",
        width: "10rem",
    },
    {
        key: "createdAt",
        label: t("projects.createdAt"),
        nowrap: true,
        width: "10rem",
        sortKey: "createdAt",
    },

    {
        key: "actions",
        label: t("projects.actions"),
        nowrap: false,
        actions: true,
        width: "22rem",
    },
])

const { formatDuration, formatDate } = useFormat()

const getMapUrl = (project: ProjectResponse) =>
    buildGeoAdminUrl(project.longitude, project.latitude)
</script>
