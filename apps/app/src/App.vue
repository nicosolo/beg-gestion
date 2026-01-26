<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { ref, computed, watch, onMounted, KeepAlive } from "vue"
import {
    Bars3Icon,
    XMarkIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ArrowLeftIcon,
    ArrowDownTrayIcon,
} from "@heroicons/vue/24/outline"
import { useAuthStore } from "./stores/auth"
import { useAlert } from "./composables/utils/useAlert"
import { useTauri } from "./composables/useTauri"
import Snackbar from "./components/atoms/Snackbar.vue"
import Button from "./components/atoms/Button.vue"
import desktopVersionConfig from "./config/desktop-version.json"

const { t } = useI18n()
const isSidebarOpen = ref(false)
const { alerts, removeAlert } = useAlert()
const { isTauri, appVersion, fetchAppVersion, setupDeepLinkListener } = useTauri()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const hasAdminAccess = computed(() => authStore.isRole("admin"))

// Generate unique keys for components that need per-instance caching
const componentKey = computed(() => {
    // Cache ProjectPreviewView per project ID
    if (route.name === "project-view" && route.params.id) {
        return `ProjectPreviewView-${route.params.id}`
    }
    return undefined
})

// Check if the current route is the login page
const isLoginPage = computed(() => route.name === "login")

// Check if we can go back (has history and not on home page)
const canGoBack = computed(
    () => isTauri.value && route.name !== "home" && window.history.length > 1
)

// Compare versions to check if update is available
const isUpdateAvailable = computed(() => {
    if (!isTauri.value || !appVersion.value) return false
    const current = appVersion.value.split(".").map(Number)
    const latest = desktopVersionConfig.version.split(".").map(Number)
    for (let i = 0; i < Math.max(current.length, latest.length); i++) {
        const c = current[i] || 0
        const l = latest[i] || 0
        if (l > c) return true
        if (c > l) return false
    }
    return false
})

const goBack = () => {
    router.back()
}

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value
}

// Handle logout with router navigation
const handleLogout = () => {
    // Clear auth data from the store and localStorage
    authStore.logout()

    // Navigate to login
    router.push("/login")
}

// Navigation items with their routes and active states
const navigation = computed(() =>
    [
        {
            name: t("navigation.home"),
            to: { name: "home" },
            current: route.name === "home",
        },
        {
            name: t("navigation.time"),
            to: { name: "time-list" },
            current: route.name === "time-list",
        },
        {
            name: t("navigation.projects"),
            to: { name: "project-list" },
            current: route.name === "project-list",
        },
        {
            name: t("projects.map.title"),
            to: { name: "project-map" },
            current: route.name === "project-map",
        },
        {
            name: t("navigation.invoices"),
            to: { name: "invoice-list" },
            current: route.name === "invoice-list",
        },
        {
            name: t("navigation.settings"),
            visible: hasAdminAccess.value,
            children: [
                {
                    name: t("navigation.collaborators"),
                    to: { name: "collaborator-list" },
                    current: route.name === "collaborator-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: t("navigation.activities"),
                    to: { name: "activity-type-list" },
                    current: route.name === "activity-type-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: t("navigation.tariffs"),
                    to: { name: "tariff-list" },
                    current: route.name === "tariff-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: t("navigation.projectTypes"),
                    to: { name: "project-type-list" },
                    current: route.name === "project-type-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: t("navigation.locations"),
                    to: { name: "location-list" },
                    current: route.name === "location-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: t("navigation.clients"),
                    to: { name: "client-list" },
                    current: route.name === "client-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: t("navigation.companies"),
                    to: { name: "company-list" },
                    current: route.name === "company-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: t("navigation.engineers"),
                    to: { name: "engineer-list" },
                    current: route.name === "engineer-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: "Taux TVA",
                    to: { name: "vat-rate-list" },
                    current: route.name === "vat-rate-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: t("monthlyHours.title"),
                    to: { name: "monthly-hours-list" },
                    current: route.name === "monthly-hours-list",
                    visible: hasAdminAccess.value,
                },
                {
                    name: "Import DB",
                    to: { name: "database-import" },
                    current: route.name === "database-import",
                    visible: hasAdminAccess.value,
                },
            ].filter((item) => item.visible !== false),
            // Mark parent as current if any child is current
            get current() {
                return this.children.some((child) => child.current)
            },
        },
        // App Settings - only visible in Tauri environment
        {
            name: t("appSettings.title"),
            to: { name: "app-settings" },
            current: route.name === "app-settings",
            visible: isTauri.value,
        },
    ].filter((item) => item.visible !== false)
)

const expandedItems = ref<Record<string, boolean>>({})

// Initialize expandedItems based on current route
const initializeExpandedItems = () => {
    navigation.value.forEach((item) => {
        if (item.children && item.current) {
            expandedItems.value[item.name] = true
        }
    })
}

// Watch route changes to update expanded items
watch(
    () => route.name,
    () => {
        initializeExpandedItems()
    }
)

// Initialize on mount (for page reload)
onMounted(() => {
    initializeExpandedItems()
    fetchAppVersion()
    setupDeepLinkListener()
})

const toggleNestedMenu = (itemName: string) => {
    expandedItems.value[itemName] = !expandedItems.value[itemName]
}

const isExpanded = (itemName: string): boolean => {
    return !!expandedItems.value[itemName]
}
</script>

<style>
html {
    scrollbar-gutter: stable;
}
</style>

<template>
    <div class="flex flex-col min-h-screen">
        <!-- Header for all viewports with toggle button - hidden on login page -->
        <header
            v-if="!isLoginPage"
            class="fixed top-0 left-0 right-0 flex items-center p-2 border-b border-gray-200 bg-white z-10 print:hidden"
        >
            <div class="flex justify-between items-center w-full gap-2">
                <div class="flex items-center">
                    <!-- Back button - only in Tauri when not on home -->
                    <button
                        v-if="canGoBack"
                        @click="goBack"
                        class="inline-flex items-center justify-center p-2 mr-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
                    >
                        <ArrowLeftIcon class="h-5 w-5" />
                    </button>

                    <a href="/">
                        <div class="flex items-center">
                            <img alt="BEG logo" class="h-7 w-auto mr-1" src="@/assets/logo.png" />
                            <h2 class="text-xl font-bold text-gray-700 pt-2">Gestion</h2>
                        </div>
                    </a>
                </div>

                <!-- Main navigation links -->
                <nav class="hidden md:flex items-center gap-1 ml-auto">
                    <RouterLink
                        :to="{ name: 'time-list' }"
                        :class="[
                            route.name === 'time-list'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            'px-3 py-1.5 text-sm font-medium rounded-md',
                        ]"
                    >
                        {{ t("navigation.time") }}
                    </RouterLink>
                    <RouterLink
                        :to="{ name: 'project-list' }"
                        :class="[
                            route.name === 'project-list'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            'px-3 py-1.5 text-sm font-medium rounded-md',
                        ]"
                    >
                        {{ t("navigation.projects") }}
                    </RouterLink>
                    <RouterLink
                        :to="{ name: 'project-map' }"
                        :class="[
                            route.name === 'project-map'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            'px-3 py-1.5 text-sm font-medium rounded-md',
                        ]"
                    >
                        {{ t("projects.map.title") }}
                    </RouterLink>
                    <RouterLink
                        :to="{ name: 'invoice-list' }"
                        :class="[
                            route.name === 'invoice-list'
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            'px-3 py-1.5 text-sm font-medium rounded-md',
                        ]"
                    >
                        {{ t("navigation.invoices") }}
                    </RouterLink>
                </nav>

                <button
                    class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                    @click="toggleSidebar"
                >
                    <span class="sr-only">Toggle sidebar</span>
                    <span class="text-3xl"><Bars3Icon class="h-6 w-6" /></span>
                </button>
            </div>
        </header>

        <div class="flex flex-1 relative pt-12">
            <!-- Main content - no margin adjustment, sidebar will overlay -->
            <main class="flex-1 p-4 w-full">
                <div class="container mx-auto md:max-w-full">
                    <RouterView v-slot="{ Component }">
                        <KeepAlive
                            :include="[
                                'ProjectPreviewView',
                                'ProjectListView',
                                'ProjectMapView',
                                'InvoiceListView',
                                'TimeListView',
                            ]"
                        >
                            <component :is="Component" :key="componentKey" />
                        </KeepAlive>
                    </RouterView>
                </div>
            </main>

            <!-- Overlay sidebar for all viewports -->
            <aside
                v-if="!isLoginPage"
                class="fixed top-0 right-0 h-screen flex flex-col w-64 transition-all duration-300 ease-in-out z-30 print:hidden"
                :class="[isSidebarOpen ? 'translate-x-0' : 'translate-x-full']"
            >
                <!-- Sidebar component -->
                <div class="flex h-full flex-col border-l border-gray-200 bg-white shadow-lg">
                    <!-- Close button - always visible when sidebar is open -->
                    <div class="flex flex-shrink-0 items-center px-4 pt-5">
                        <button
                            class="ml-auto inline-flex items-center justify-center p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                            @click="toggleSidebar"
                        >
                            <span class="sr-only">Close sidebar</span>
                            <span class="text-xxl"><XMarkIcon class="h-6 w-6" /></span>
                        </button>
                    </div>
                    <!-- Scrollable navigation area -->
                    <div class="flex-1 overflow-y-auto pt-5 pb-4">
                        <nav class="space-y-1 bg-white px-2">
                            <template v-for="item in navigation" :key="item.name">
                                <!-- Parent item with children -->
                                <div v-if="item.children" class="space-y-1">
                                    <button
                                        @click="toggleNestedMenu(item.name)"
                                        :class="[
                                            item.current
                                                ? 'bg-gray-100 text-gray-900'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                            'group flex w-full items-center justify-between px-2 py-2 text-sm font-medium rounded-md cursor-pointer',
                                        ]"
                                    >
                                        <span>{{ item.name }}</span>
                                        <span class="text-gray-500">
                                            <ChevronDownIcon
                                                v-if="isExpanded(item.name)"
                                                class="h-4 w-4"
                                            />
                                            <ChevronRightIcon v-else class="h-4 w-4" />
                                        </span>
                                    </button>
                                    <!-- Nested children -->
                                    <div v-if="isExpanded(item.name)" class="ml-3 space-y-1">
                                        <RouterLink
                                            v-for="child in item.children"
                                            :key="child.name"
                                            :to="child.to"
                                            :class="[
                                                child.current
                                                    ? 'bg-gray-100 text-gray-900'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                                            ]"
                                            @click="toggleSidebar"
                                        >
                                            {{ child.name }}
                                        </RouterLink>
                                    </div>
                                </div>
                                <!-- Regular item without children -->
                                <RouterLink
                                    v-else
                                    :to="item.to"
                                    :class="[
                                        item.current
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                                    ]"
                                    @click="toggleSidebar"
                                >
                                    {{ item.name }}
                                </RouterLink>
                            </template>
                        </nav>
                    </div>
                    <!-- Update available notice - only visible in Tauri when update available -->
                    <div
                        v-if="isUpdateAvailable"
                        class="flex-shrink-0 border-t border-gray-200 px-4 py-3 bg-amber-50"
                    >
                        <RouterLink
                            :to="{ name: 'download-app' }"
                            class="flex items-center text-sm text-amber-700 hover:text-amber-900 font-medium"
                            @click="toggleSidebar"
                        >
                            <ArrowDownTrayIcon class="h-4 w-4 mr-2" />
                            {{ t("downloadApp.updateAvailable") }} (v{{
                                desktopVersionConfig.version
                            }})
                        </RouterLink>
                    </div>
                    <!-- Download app link - only visible in web (not Tauri) -->
                    <div v-if="!isTauri" class="flex-shrink-0 border-t border-gray-200 px-4 py-3">
                        <RouterLink
                            :to="{ name: 'download-app' }"
                            class="flex items-center text-sm text-gray-600 hover:text-gray-900"
                            @click="toggleSidebar"
                        >
                            <ArrowDownTrayIcon class="h-4 w-4 mr-2" />
                            {{ t("downloadApp.linkText") }}
                        </RouterLink>
                    </div>
                    <!-- User info section - fixed at bottom -->
                    <div class="flex-shrink-0 border-t border-gray-200 p-4">
                        <div class="group block w-full flex-shrink-0">
                            <div class="items-center">
                                <div class="ml-3 flex-grow">
                                    <p
                                        class="text-sm font-medium text-gray-700 group-hover:text-gray-900"
                                    >
                                        {{ authStore.user?.firstName }}
                                        {{ authStore.user?.lastName }}
                                    </p>
                                    <p
                                        class="text-xs font-medium text-gray-500 group-hover:text-gray-700"
                                    >
                                        {{ authStore.user?.email }}
                                    </p>
                                </div>
                                <Button @click="handleLogout" variant="ghost-danger" class="mt-2">
                                    {{ t("navigation.logout") }}
                                </Button>
                            </div>
                        </div>
                        <p v-if="appVersion" class="mt-2 text-xs text-gray-400">
                            v{{ appVersion }}
                        </p>
                    </div>
                </div>
            </aside>
        </div>

        <!-- Sidebar overlay - covers entire screen when sidebar is open -->
        <div
            v-if="!isLoginPage && isSidebarOpen"
            @click="toggleSidebar"
            class="fixed inset-0 bg-black/30 z-20"
        ></div>

        <!-- Global Snackbar Container -->
        <div
            aria-live="assertive"
            class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
        >
            <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
                <Snackbar
                    v-for="alert in alerts"
                    :key="alert.id"
                    :visible="alert.visible"
                    :message="alert.message"
                    :type="alert.type"
                    @close="removeAlert(alert.id)"
                />
            </div>
        </div>
    </div>
</template>
