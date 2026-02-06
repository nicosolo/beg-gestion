import { sqliteTable, text, integer, index, real } from "drizzle-orm/sqlite-core"

import { timestamps } from "./column.helper"
import type {
    ActivityRateUser,
    ClassSchema,
    UserRole,
    ProjectUserRole,
    ProjectStatus,
    COUNTRIES,
    SWISS_CANTONS,
    BillingMode,
    InvoiceType,
    InvoiceStatus,
} from "@beg/validations"
// User table
export const users = sqliteTable(
    "users",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        email: text("email").notNull().unique(),
        lastName: text("lastName").notNull(),
        firstName: text("firstName").notNull(),
        initials: text("initials").notNull(),
        archived: integer("archived", { mode: "boolean" }).notNull().default(false),
        password: text("password").notNull(),
        role: text("role").$type<UserRole>().notNull(),
        activityRates: text("activityRates", { mode: "json" })
            .$type<ActivityRateUser[]>()
            .default([]),
        ...timestamps,
    },
    (table) => [
        // Index for email lookups (authentication)
        index("users_email_idx").on(table.email),
        // Index for filtering by archived status
        index("users_archived_idx").on(table.archived),
        // Index for role-based queries
        index("users_role_idx").on(table.role),
        // Composite index for name searches
        index("users_name_idx").on(table.lastName, table.firstName),
    ]
)

// Location table
export const locations = sqliteTable(
    "locations",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        country: text("country", { length: 2 }).$type<keyof typeof COUNTRIES>(),
        canton: text("canton", { length: 2 }).$type<keyof typeof SWISS_CANTONS>(),
        region: text("region"),
        address: text("address"),
        ...timestamps,
    },
    () => []
)

// Company table
export const companies = sqliteTable(
    "companies",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        ...timestamps,
    },
    () => []
)

// Client table
export const clients = sqliteTable(
    "clients",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        ...timestamps,
    },
    () => []
)

// ProjectType table
export const projectTypes = sqliteTable(
    "project_types",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        ...timestamps,
    },
    () => []
)

// Engineer table
export const engineers = sqliteTable(
    "engineers",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        ...timestamps,
    },
    () => []
)

// MonthlyHours table
export const monthlyHours = sqliteTable(
    "monthly_hours",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        year: integer("year").notNull(),
        month: integer("month").notNull(), // 1-12
        amountOfHours: real("amountOfHours").notNull(),
        ...timestamps,
    },
    (table) => [
        // Unique constraint on year and month combination
        index("monthly_hours_year_month_unique").on(table.year, table.month),
    ]
)

// RateClass table
export const rateClasses = sqliteTable(
    "rate_classes",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        class: text("class").$type<ClassSchema>().notNull(),
        year: integer("year").notNull(),
        amount: integer("amount").notNull(),
    },
    () => []
)

// Project table
export const projects = sqliteTable(
    "projects",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        projectNumber: text("projectNumber"),
        subProjectName: text("subProjectName"),
        name: text("name").notNull(),
        startDate: integer("startDate", { mode: "timestamp" }).notNull(),
        locationId: integer("locationId").references(() => locations.id, {
            onDelete: "set null",
        }),
        clientId: integer("clientId").references(() => clients.id, { onDelete: "set null" }),
        engineerId: integer("engineerId").references(() => engineers.id, { onDelete: "set null" }),
        companyId: integer("companyId").references(() => companies.id, { onDelete: "set null" }),
        remark: text("remark"),
        invoicingAddress: text("invoicingAddress"),
        latitude: real("latitude"),
        longitude: real("longitude"),
        firstActivityDate: integer("firstActivityDate", { mode: "timestamp" }),
        lastActivityDate: integer("lastActivityDate", { mode: "timestamp" }),
        totalDuration: real("totalDuration").default(0),
        unBilledDuration: real("unBilledDuration").default(0),
        unBilledDisbursementDuration: real("unBilledDisbursementDuration").default(0),
        offerAmount: real("offerAmount"),
        status: text("status").$type<ProjectStatus>().notNull().default("active"),
        ended: integer("ended", { mode: "boolean" }).default(false),
        archived: integer("archived", { mode: "boolean" }).default(false),
        ...timestamps,
    },
    (table) => [
        // Index for project name searches (case-insensitive LIKE queries)
        index("projects_name_idx").on(table.name),
        // Index for project number searches (prefix LIKE queries)
        index("projects_project_number_idx").on(table.projectNumber),
        // Index for date range queries (filtering by startDate)
        index("projects_start_date_idx").on(table.startDate),
        // Composite index for sorting by updatedAt (last activity approximation)
        index("projects_updated_at_idx").on(table.updatedAt),
        // Foreign key indexes for JOIN performance
        index("projects_location_idx").on(table.locationId),
        index("projects_client_idx").on(table.clientId),
        index("projects_engineer_idx").on(table.engineerId),
        index("projects_company_idx").on(table.companyId),
        index("projects_first_activity_date_idx").on(table.firstActivityDate),
        index("projects_last_activity_date_idx").on(table.lastActivityDate),
        index("projects_total_duration_idx").on(table.totalDuration),
        index("projects_status_idx").on(table.status),
        index("projects_archived_idx").on(table.archived),
        index("projects_ended_idx").on(table.ended),
        index("projects_un_billed_duration_idx").on(table.unBilledDuration),
        index("projects_un_billed_disbursement_duration_idx").on(
            table.unBilledDisbursementDuration
        ),
    ]
)

// ProjectUsers junction table (many-to-many relationship between projects and users with roles)
export const projectUsers = sqliteTable(
    "project_users",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        projectId: integer("projectId")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        userId: integer("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: text("role").$type<ProjectUserRole>().notNull(),
        ...timestamps,
    },
    (table) => [
        // Unique constraint on project-user combination
        index("project_users_project_user_unique").on(table.projectId, table.userId),
        // Index for finding all projects a user has access to
        index("project_users_user_idx").on(table.userId),
        // Index for finding all users of a project
        index("project_users_project_idx").on(table.projectId),
        // Index for role-based queries
        index("project_users_role_idx").on(table.role),
        // Composite index for finding managers of a specific project
        index("project_users_project_role_idx").on(table.projectId, table.role),
    ]
)

// ProjectProjectTypes junction table (many-to-many relationship between projects and project types)
export const projectProjectTypes = sqliteTable(
    "project_project_types",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        projectId: integer("projectId")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        projectTypeId: integer("projectTypeId")
            .notNull()
            .references(() => projectTypes.id, { onDelete: "cascade" }),
        ...timestamps,
    },
    (table) => [
        // Unique constraint on project-type combination
        index("project_project_types_unique").on(table.projectId, table.projectTypeId),
        // Index for finding all types of a project
        index("project_project_types_project_idx").on(table.projectId),
        // Index for finding all projects of a type
        index("project_project_types_type_idx").on(table.projectTypeId),
    ]
)

// ActivityType table
export const activityTypes = sqliteTable(
    "activity_types",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        code: text("code").notNull(),
        billable: integer("billable", { mode: "boolean" }).notNull(),
        adminOnly: integer("adminOnly", { mode: "boolean" }).notNull().default(false),
        ...timestamps,
    },
    () => []
)

// Activity table
export const activities = sqliteTable(
    "activities",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("userId")
            .notNull()
            .references(() => users.id, { onDelete: "set null" }),
        date: integer("date", { mode: "timestamp" }).notNull(),
        duration: real("duration").notNull(),
        kilometers: real("kilometers").notNull(),
        expenses: real("expenses").notNull(),
        rate: real("rate").notNull(),
        projectId: integer("projectId")
            .notNull()
            .references(() => projects.id, { onDelete: "set null" }),
        activityTypeId: integer("activityTypeId")
            .notNull()
            .references(() => activityTypes.id, { onDelete: "set null" }),
        description: text("description"),
        billed: integer("billed", { mode: "boolean" }).notNull().default(false),
        invoiceId: integer("invoiceId").references(() => invoices.id, {
            onDelete: "set null",
        }),
        // Disbursement flag (if this activity is a disbursement)
        disbursement: integer("disbursement", { mode: "boolean" }).notNull().default(false),
        rateClass: text("rateClass").$type<ClassSchema>(),
        ...timestamps,
    },
    (table) => [
        // Index for user-project combinations (optimizes access control queries)
        index("activities_user_project_idx").on(table.userId, table.projectId),
        // Index for date-based queries
        index("activities_date_idx").on(table.date),
        // Index for billing queries
        index("activities_billed_idx").on(table.billed),
        // Composite index for project billing queries (optimizes hasUnbilledTime filter)
        index("activities_project_billed_idx").on(table.projectId, table.billed),
        // Index for invoice queries
        index("activities_invoice_idx").on(table.invoiceId),
    ]
)

// Invoice table
export const invoices = sqliteTable(
    "invoices",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        projectId: integer("projectId")
            .notNull()
            .references(() => projects.id, { onDelete: "set null" }),
        invoiceNumber: text("invoiceNumber"),
        reference: text("reference"),
        type: text("type").$type<InvoiceType>().notNull().default("invoice"),
        billingMode: text("billingMode").$type<BillingMode>().notNull().default("accordingToData"),
        status: text("status").$type<InvoiceStatus>().notNull().default("draft"),
        issueDate: integer("issueDate", { mode: "timestamp" }).notNull(),
        dueDate: integer("dueDate", { mode: "timestamp" }),
        periodStart: integer("periodStart", { mode: "timestamp" }).notNull(),
        periodEnd: integer("periodEnd", { mode: "timestamp" }).notNull(),
        period: text("period"),
        clientAddress: text("clientAddress"),
        recipientAddress: text("recipientAddress"),
        description: text("description"),
        note: text("note"),
        invoiceDocument: text("invoiceDocument"),
        visaByUserId: integer("visaByUserId").references(() => users.id, { onDelete: "set null" }),
        visaBy: text("visaBy"),
        visaDate: integer("visaDate", { mode: "timestamp" }),
        inChargeUserId: integer("inChargeUserId").references(() => users.id, {
            onDelete: "set null",
        }),
        // Legacy import path (read-only, set during import)
        legacyInvoicePath: text("legacyInvoicePath"),
        // Fee totals
        feesBase: real("feesBase").notNull().default(0),
        feesAdjusted: real("feesAdjusted").notNull().default(0),
        feesTotal: real("feesTotal").notNull().default(0),
        feesOthers: real("feesOthers").notNull().default(0),
        feesFinalTotal: real("feesFinalTotal").notNull().default(0),
        feesMultiplicationFactor: real("feesMultiplicationFactor").notNull().default(1), // stored as percentage
        feesDiscountPercentage: real("feesDiscountPercentage"),
        feesDiscountAmount: real("feesDiscountAmount"),
        // Expense totals
        expensesTravelBase: real("expensesTravelBase").notNull().default(0),
        expensesTravelAdjusted: real("expensesTravelAdjusted").notNull().default(0),
        expensesTravelRate: real("expensesTravelRate").notNull().default(0.65), // stored as percentage
        expensesTravelAmount: real("expensesTravelAmount").notNull().default(0),
        expensesOtherBase: real("expensesOtherBase").notNull().default(0),
        expensesOtherAmount: real("expensesOtherAmount").notNull().default(0),
        expensesThirdPartyAmount: real("expensesThirdPartyAmount").notNull().default(0),
        expensesPackagePercentage: real("expensesPackagePercentage"),
        expensesPackageAmount: real("expensesPackageAmount"),
        expensesTotalExpenses: real("expensesTotalExpenses").notNull().default(0),
        // Final totals
        totalHT: real("totalHT").notNull().default(0),
        vatRate: real("vatRate").notNull().default(8), // stored as basis points (8.00% = 800)
        vatAmount: real("vatAmount").notNull().default(0),
        totalTTC: real("totalTTC").notNull().default(0),
        // Remarks
        otherServices: text("otherServices").default(""),
        remarksOtherServices: text("remarksOtherServices").default(""),
        remarksTravelExpenses: text("remarksTravelExpenses").default(""),
        remarksExpenses: text("remarksExpenses").default(""),
        remarksThirdPartyExpenses: text("remarksThirdPartyExpenses").default(""),
        ...timestamps,
    },
    (table) => [
        // Index for invoice number lookups
        index("invoices_invoice_number_idx").on(table.invoiceNumber),
        // Index for project queries
        index("invoices_project_idx").on(table.projectId),
        // Index for status queries
        index("invoices_status_idx").on(table.status),
        // Index for date queries
        index("invoices_issue_date_idx").on(table.issueDate),
        // Composite index for listing invoices by project and status
        index("invoices_project_status_idx").on(table.projectId, table.status),
    ]
)

// Invoice rate details table
export const invoiceRates = sqliteTable(
    "invoice_rates",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        invoiceId: integer("invoiceId")
            .notNull()
            .references(() => invoices.id, { onDelete: "cascade" }),
        rateClass: text("rateClass").notNull(),
        baseMinutes: integer("baseMinutes").notNull().default(0),
        adjustedMinutes: integer("adjustedMinutes").notNull().default(0),
        hourlyRate: integer("hourlyRate").notNull().default(0),
        amount: integer("amount").notNull().default(0),
        ...timestamps,
    },
    (table) => [
        // Index for invoice queries
        index("invoice_rates_invoice_idx").on(table.invoiceId),
    ]
)

// Invoice offers table
export const invoiceOffers = sqliteTable(
    "invoice_offers",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        invoiceId: integer("invoiceId")
            .notNull()
            .references(() => invoices.id, { onDelete: "cascade" }),
        file: text("file").notNull().default(""),
        date: integer("date", { mode: "timestamp" }).notNull(),
        amount: integer("amount").notNull().default(0),
        remark: text("remark").default(""),
        ...timestamps,
    },
    (table) => [
        // Index for invoice queries
        index("invoice_offers_invoice_idx").on(table.invoiceId),
    ]
)

// Invoice adjudications table
export const invoiceAdjudications = sqliteTable(
    "invoice_adjudications",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        invoiceId: integer("invoiceId")
            .notNull()
            .references(() => invoices.id, { onDelete: "cascade" }),
        file: text("file").notNull().default(""),
        date: integer("date", { mode: "timestamp" }).notNull(),
        amount: integer("amount").notNull().default(0),
        remark: text("remark").default(""),
        ...timestamps,
    },
    (table) => [
        // Index for invoice queries
        index("invoice_adjudications_invoice_idx").on(table.invoiceId),
    ]
)

// Invoice situations table
export const invoiceSituations = sqliteTable(
    "invoice_situations",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        invoiceId: integer("invoiceId")
            .notNull()
            .references(() => invoices.id, { onDelete: "cascade" }),
        file: text("file").notNull().default(""),
        date: integer("date", { mode: "timestamp" }).notNull(),
        amount: integer("amount").notNull().default(0),
        remark: text("remark").default(""),
        ...timestamps,
    },
    (table) => [
        // Index for invoice queries
        index("invoice_situations_invoice_idx").on(table.invoiceId),
    ]
)

// Invoice documents table
export const invoiceDocuments = sqliteTable(
    "invoice_documents",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        invoiceId: integer("invoiceId")
            .notNull()
            .references(() => invoices.id, { onDelete: "cascade" }),
        file: text("file").notNull().default(""),
        date: integer("date", { mode: "timestamp" }).notNull(),
        remark: text("remark").default(""),
        ...timestamps,
    },
    (table) => [
        // Index for invoice queries
        index("invoice_documents_invoice_idx").on(table.invoiceId),
    ]
)

// VAT rates table
export const vatRates = sqliteTable(
    "vat_rates",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        year: integer("year").notNull(),
        rate: real("rate").notNull(), // Store as percentage (e.g., 8.0 for 8%)
        ...timestamps,
    },
    (table) => [
        // Index for year queries
        index("vat_rates_year_idx").on(table.year),
        // Unique constraint on year
        index("vat_rates_year_unique").on(table.year),
    ]
)

// Workloads table
export const workloads = sqliteTable(
    "workloads",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        year: integer("year").notNull(),
        month: integer("month").notNull(),
        workload: integer("workload").notNull(), // Percentage (0-100)
        ...timestamps,
    },
    (table) => [
        // Composite index for user-year-month queries
        index("workloads_user_year_month_idx").on(table.userId, table.year, table.month),
        // Index for user queries
        index("workloads_user_idx").on(table.userId),
        // Index for year queries
        index("workloads_year_idx").on(table.year),
    ]
)
