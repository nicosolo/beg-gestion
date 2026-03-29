import { createRouter, createWebHistory } from "vue-router"
import HomeView from "@/views/HomeView.vue"
import ProjectListView from "@/views/project/ProjectListView.vue"
import ProjectMapView from "@/views/project/ProjectMapView.vue"
import InvoiceListView from "@/views/invoice/InvoiceListView.vue"
import EditInvoiceView from "@/views/invoice/EditInvoiceView.vue"
import PreviewInvoiceView from "@/views/invoice/PreviewInvoiceView.vue"
import CollaboratorListView from "../views/collaborator/CollaboratorListView.vue"
import CollaboratorEditView from "../views/collaborator/CollaboratorEditView.vue"
import TimeListView from "../views/time/TimeListView.vue"
import TariffListView from "../views/tariff/TariffListView.vue"
import ProjectEditView from "../views/project/ProjectEditView.vue"
import ProjectTypeListView from "../views/projectType/ProjectTypeListView.vue"
import ProjectPreviewView from "../views/project/ProjectPreviewView.vue"
import ActivityTypeListView from "../views/activityType/ActivityTypeListView.vue"
import LocationListView from "../views/location/LocationListView.vue"
import ClientListView from "../views/client/ClientListView.vue"
import CompanyListView from "../views/company/CompanyListView.vue"
import EngineerListView from "../views/engineer/EngineerListView.vue"
import VatRateListView from "../views/vatRate/VatRateListView.vue"
import MonthlyHoursListView from "../views/monthlyHours/MonthlyHoursListView.vue"
import LoginView from "../views/LoginView.vue"
import AuditLogListView from "../views/auditLog/AuditLogListView.vue"
import AppSettingsView from "../views/settings/AppSettingsView.vue"
import DownloadAppView from "../views/download/DownloadAppView.vue"
import { useAuthStore } from "../stores/auth"

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/login",
            name: "login",
            component: LoginView,
            meta: { requiresAuth: false },
        },
        {
            path: "/",
            name: "home",
            component: HomeView,
            meta: { requiresAuth: true },
        },
        {
            path: "/project",
            name: "project-list",
            component: ProjectListView,
            meta: { requiresAuth: true, keepAlive: true },
        },
        {
            path: "/project/map",
            name: "project-map",
            component: ProjectMapView,
            meta: { requiresAuth: true, keepAlive: true },
        },
        {
            path: "/project/:id/edit",
            name: "project-edit",
            component: ProjectEditView,
            meta: { requiresAuth: true },
        },
        {
            path: "/project/new",
            name: "project-new",
            component: ProjectEditView,
            meta: { requiresAuth: true },
        },
        {
            path: "/project/:id/view",
            name: "project-view",
            component: ProjectPreviewView,
            meta: { requiresAuth: true },
        },
        // Project Type routes
        {
            path: "/project-type",
            name: "project-type-list",
            component: ProjectTypeListView,
            meta: { requiresAuth: true },
        },
        // Invoice routes
        {
            path: "/invoice/new",
            name: "invoice-new",
            component: EditInvoiceView,
            meta: { requiresAuth: true },
        },
        {
            path: "/invoice/:id/edit",
            name: "invoice-edit",
            component: EditInvoiceView,
            meta: { requiresAuth: true },
        },
        {
            path: "/invoice",
            name: "invoice-list",
            component: InvoiceListView,
            meta: { requiresAuth: true, keepAlive: true },
        },
        {
            path: "/invoice/:id/preview",
            name: "invoice-preview",
            component: PreviewInvoiceView,
            meta: { requiresAuth: true },
        },
        // Collaborator routes
        {
            path: "/collaborator/new",
            name: "collaborator-new",
            component: CollaboratorEditView,
            meta: { requiresAuth: true },
        },
        {
            path: "/collaborator/:id/edit",
            name: "collaborator-edit",
            component: CollaboratorEditView,
            meta: { requiresAuth: true },
        },
        {
            path: "/collaborator",
            name: "collaborator-list",
            component: CollaboratorListView,
            meta: { requiresAuth: true },
        },
        // Activity routes
        {
            path: "/activity-type",
            name: "activity-type-list",
            component: ActivityTypeListView,
            meta: { requiresAuth: true },
        },

        {
            path: "/time",
            name: "time-list",
            component: TimeListView,
            meta: { requiresAuth: true, keepAlive: true },
        },
        // Tariff routes
        {
            path: "/tariff",
            name: "tariff-list",
            component: TariffListView,
            meta: { requiresAuth: true },
        },
        // Location routes
        {
            path: "/location",
            name: "location-list",
            component: LocationListView,
            meta: { requiresAuth: false }, // Public access
        },
        {
            path: "/client",
            name: "client-list",
            component: ClientListView,
            meta: { requiresAuth: true },
        },
        {
            path: "/company",
            name: "company-list",
            component: CompanyListView,
            meta: { requiresAuth: true },
        },
        {
            path: "/engineer",
            name: "engineer-list",
            component: EngineerListView,
            meta: { requiresAuth: true },
        },
        {
            path: "/vat-rate",
            name: "vat-rate-list",
            component: VatRateListView,
            meta: { requiresAuth: true },
        },
        {
            path: "/monthly-hours",
            name: "monthly-hours-list",
            component: MonthlyHoursListView,
            meta: { requiresAuth: true, requiresAdmin: true },
        },
        // Audit log
        {
            path: "/audit-log",
            name: "audit-log-list",
            component: AuditLogListView,
            meta: { requiresAuth: true, requiresAdmin: true },
        },
        // App settings (Tauri only)
        {
            path: "/app-settings",
            name: "app-settings",
            component: AppSettingsView,
            meta: { requiresAuth: true },
        },
        // Download desktop app (web only)
        {
            path: "/download",
            name: "download-app",
            component: DownloadAppView,
            meta: { requiresAuth: true },
        },
    ],
})

// Navigation guard
router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.meta.requiresAuth !== false // Default to requiring auth
    const requiresAdmin = to.meta.requiresAdmin === true

    if (requiresAuth && !authStore.isAuthenticated) {
        // Redirect to login if authentication is required but user is not authenticated
        next({ name: "login" })
    } else if (requiresAdmin && !authStore.isRole("admin")) {
        // Redirect to home if admin role is required but user is not admin
        next({ name: "home" })
    } else {
        // Continue to the requested route
        next()
    }
})

export default router
