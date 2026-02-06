import { z } from "zod"
import { createPageResponseSchema, paginationSchema } from "./pagination"
import { dateSchema, timestampsSchema } from "./base"

// ============================================================================
// Enums and Constants
// ============================================================================

// Invoice type enum
export const InvoiceTypeEnum = z.enum(["invoice", "final_invoice", "situation", "deposit"])

export type InvoiceType = z.infer<typeof InvoiceTypeEnum>

// Billing mode enum
export const BillingModeEnum = z.enum([
    "accordingToData",
    "accordingToOffer",
    "accordingToInvoice",
    "fixedPrice",
])

export type BillingMode = z.infer<typeof BillingModeEnum>

// Invoice status enum - added "controle"
export const InvoiceStatusEnum = z.enum(["draft", "controle", "vise", "sent"])
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>

// ============================================================================
// Reusable schemas for arrays only (since they're separate tables)
// ============================================================================

// Fee item schema for rates array
export const RateItemSchema = z.object({
    rateClass: z.string(),
    base: z.number().default(0),
    adjusted: z.number().default(0),
    hourlyRate: z.number().default(0),
    amount: z.number().default(0),
})

// Offer schema
export const OfferSchema = z.object({
    file: z.string().default(""),
    date: z
        .date()
        .optional()
        .or(z.string().transform((str) => (str ? new Date(str) : new Date()))),
    amount: z.number().default(0),
    remark: z.string().default(""),
})

// Adjudication schema
export const AdjudicationSchema = z.object({
    file: z.string().default(""),
    date: z
        .date()
        .optional()
        .or(z.string().transform((str) => (str ? new Date(str) : new Date()))),
    amount: z.number().default(0),
    remark: z.string().default(""),
})

// Situation schema (same as Adjudication)
export const SituationSchema = z.object({
    file: z.string().default(""),
    date: z
        .date()
        .optional()
        .or(z.string().transform((str) => (str ? new Date(str) : new Date()))),
    amount: z.number().default(0),
    remark: z.string().default(""),
})

// Document schema (same as Adjudication but without amount)
export const DocumentSchema = z.object({
    file: z.string().default(""),
    date: z
        .date()
        .optional()
        .or(z.string().transform((str) => (str ? new Date(str) : new Date()))),
    remark: z.string().default(""),
})

// ============================================================================
// Frontend Invoice Schema (with flat structure matching DB)
// ============================================================================

export const InvoiceSchema = z.object({
    id: z.string().default(""),
    projectId: z.number().optional(),
    status: InvoiceStatusEnum.default("draft"),

    // Basic fields
    invoiceNumber: z.string().default(""),
    reference: z.string().default(""),
    type: InvoiceTypeEnum.default("invoice"),
    billingMode: BillingModeEnum.default("accordingToData"),
    description: z.string().default(""),
    note: z.string().default(""),
    invoiceDocument: z.string().default(""),

    // Dates
    issueDate: dateSchema.optional(),
    dueDate: dateSchema.nullable().optional(),
    periodStart: dateSchema.optional(),
    periodEnd: dateSchema.optional(),
    period: z.string().default(""),

    clientAddress: z.string().default(""),
    recipientAddress: z.string().default(""),

    // Fees - flat structure
    feesBase: z.number().default(0),
    feesAdjusted: z.number().default(0),
    feesTotal: z.number().default(0),
    feesOthers: z.number().default(0),
    feesFinalTotal: z.number().default(0),
    feesMultiplicationFactor: z.number().default(1),
    feesDiscountPercentage: z.number().nullable().default(null),
    feesDiscountAmount: z.number().nullable().default(null),

    // Expenses - flat structure
    expensesTravelBase: z.number().default(0),
    expensesTravelAdjusted: z.number().default(0),
    expensesTravelRate: z.number().default(0.65),
    expensesTravelAmount: z.number().default(0),
    expensesOtherBase: z.number().default(0),
    expensesOtherAmount: z.number().default(0),
    expensesThirdPartyAmount: z.number().default(0),
    expensesPackagePercentage: z.number().nullable().default(null),
    expensesPackageAmount: z.number().nullable().default(null),
    expensesTotalExpenses: z.number().default(0),

    // Totals - flat structure
    totalHT: z.number().default(0),
    vatRate: z.number().default(8.0),
    vatAmount: z.number().default(0),
    totalTTC: z.number().default(0),

    // Other services and remarks
    otherServices: z.string().default(""),
    remarksOtherServices: z.string().default(""),
    remarksTravelExpenses: z.string().default(""),
    remarksExpenses: z.string().default(""),
    remarksThirdPartyExpenses: z.string().default(""),

    // Visa
    visaByUserId: z.number().nullable().default(null),
    visaBy: z.string().nullable().default(null),
    visaDate: dateSchema.nullable().default(null),

    // User in charge
    inChargeUserId: z.number().nullable().default(null),

    // Related arrays (kept as arrays since they're separate tables)
    rates: z.array(RateItemSchema).default([]),
    offers: z.array(OfferSchema).default([]),
    adjudications: z.array(AdjudicationSchema).default([]),
    situations: z.array(SituationSchema).default([]),
    documents: z.array(DocumentSchema).default([]),

    // Activity IDs for marking as billed after invoice creation
    activityIds: z.array(z.number()).optional(),
})

// Export TypeScript type
export type Invoice = z.infer<typeof InvoiceSchema>

// Helper function to create empty invoice with default values
export const createEmptyInvoice = (invoice: Partial<Invoice>): Invoice => {
    return InvoiceSchema.parse(invoice)
}

// ============================================================================
// API Create Schema
// ============================================================================

export const invoiceCreateSchema = z.object({
    projectId: z.number(),
    invoiceNumber: z.string().optional(),
    reference: z.string().optional(),
    type: InvoiceTypeEnum.default("invoice"),
    billingMode: BillingModeEnum.default("accordingToData"),
    status: InvoiceStatusEnum.default("draft"),
    description: z.string(),
    note: z.string().optional(),
    invoiceDocument: z.string().optional(),

    // Dates
    issueDate: dateSchema,
    dueDate: dateSchema.optional(),
    periodStart: dateSchema,
    periodEnd: dateSchema,
    period: z.string().optional(),

    clientAddress: z.string().optional(),
    recipientAddress: z.string().optional(),

    // All flat fields with defaults
    feesBase: z.number().default(0),
    feesAdjusted: z.number().default(0),
    feesTotal: z.number().default(0),
    feesOthers: z.number().default(0),
    feesFinalTotal: z.number().default(0),
    feesMultiplicationFactor: z.number().default(1),
    feesDiscountPercentage: z.number().nullable().optional(),
    feesDiscountAmount: z.number().nullable().optional(),

    expensesTravelBase: z.number().default(0),
    expensesTravelAdjusted: z.number().default(0),
    expensesTravelRate: z.number().default(0.65),
    expensesTravelAmount: z.number().default(0),
    expensesOtherBase: z.number().default(0),
    expensesOtherAmount: z.number().default(0),
    expensesThirdPartyAmount: z.number().default(0),
    expensesPackagePercentage: z.number().nullable().optional(),
    expensesPackageAmount: z.number().nullable().optional(),
    expensesTotalExpenses: z.number().default(0),

    totalHT: z.number().default(0),
    vatRate: z.number().default(8.0),
    vatAmount: z.number().default(0),
    totalTTC: z.number().default(0),

    otherServices: z.string().default(""),
    remarksOtherServices: z.string().default(""),
    remarksTravelExpenses: z.string().default(""),
    remarksExpenses: z.string().default(""),
    remarksThirdPartyExpenses: z.string().default(""),

    visaByUserId: z.number().nullable().optional(),
    visaBy: z.string().nullable().optional(),
    visaDate: dateSchema.optional(),

    // User in charge (defaults to current user on creation)
    inChargeUserId: z.number().nullable().optional(),

    // Arrays
    rates: z.array(RateItemSchema).default([]),
    offers: z.array(OfferSchema).default([]),
    adjudications: z.array(AdjudicationSchema).default([]),
    situations: z.array(SituationSchema).default([]),
    documents: z.array(DocumentSchema).default([]),

    // Activity IDs to mark as billed after invoice creation
    activityIds: z.array(z.number()).optional(),
})

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>

// ============================================================================
// API Update Schema
// ============================================================================

export const invoiceUpdateSchema = invoiceCreateSchema.partial()

export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>

// ============================================================================
// API Response Schema (fully flattened)
// ============================================================================

export const invoiceResponseSchema = z
    .object({
        id: z.number(),
        projectId: z.number(),
        invoiceNumber: z.string(),
        reference: z.string(),
        type: InvoiceTypeEnum,
        billingMode: BillingModeEnum,
        status: InvoiceStatusEnum,
        description: z.string(),
        note: z.string().optional(),
        invoiceDocument: z.string().nullable().optional(),

        // Dates - flat
        issueDate: z.date().nullable(),
        dueDate: z.date().nullable(),
        periodStart: z.date().nullable(),
        periodEnd: z.date().nullable(),
        period: z.string().optional(),

        // Client - flat
        clientAddress: z.string(),

        // Recipient - flat
        recipientAddress: z.string(),

        // Fees - flat
        feesBase: z.number(),
        feesAdjusted: z.number(),
        feesTotal: z.number(),
        feesOthers: z.number(),
        feesFinalTotal: z.number(),
        feesMultiplicationFactor: z.number(),
        feesDiscountPercentage: z.number().nullable(),
        feesDiscountAmount: z.number().nullable(),

        // Expenses - flat
        expensesTravelBase: z.number(),
        expensesTravelAdjusted: z.number(),
        expensesTravelRate: z.number(),
        expensesTravelAmount: z.number(),
        expensesOtherBase: z.number(),
        expensesOtherAmount: z.number(),
        expensesThirdPartyAmount: z.number(),
        expensesPackagePercentage: z.number().nullable(),
        expensesPackageAmount: z.number().nullable(),
        expensesTotalExpenses: z.number(),

        // Totals - flat
        totalHT: z.number(),
        vatRate: z.number(),
        vatAmount: z.number(),
        totalTTC: z.number(),

        // Other services and remarks - flat
        otherServices: z.string(),
        remarksOtherServices: z.string(),
        remarksTravelExpenses: z.string(),
        remarksExpenses: z.string(),
        remarksThirdPartyExpenses: z.string(),

        visaByUserId: z.number().nullable(),
        visaBy: z.string().nullable(),
        visaDate: z.date().nullable(),
        visaByUser: z
            .object({
                id: z.number(),
                firstName: z.string(),
                lastName: z.string(),
                initials: z.string(),
            })
            .nullable(),

        // User in charge
        inChargeUserId: z.number().nullable(),
        inChargeUser: z
            .object({
                id: z.number(),
                firstName: z.string(),
                lastName: z.string(),
                initials: z.string(),
            })
            .nullable(),

        // Legacy import (read-only)
        legacyInvoicePath: z.string().nullable(),

        // Arrays (kept as arrays since they're separate tables)
        rates: z.array(RateItemSchema),
        offers: z.array(OfferSchema),
        adjudications: z.array(AdjudicationSchema),
        situations: z.array(SituationSchema),
        documents: z.array(DocumentSchema),

        project: z
            .object({
                id: z.number(),
                name: z.string(),
                projectNumber: z.string(),
                subProjectName: z.string().nullable(),
                client: z
                    .object({
                        id: z.number(),
                        name: z.string(),
                    })
                    .nullable(),
            })
            .nullable(),
    })
    .merge(timestampsSchema)

export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>

// ============================================================================
// API Filter Schema
// ============================================================================

export const invoiceFilterSchema = z
    .object({
        projectId: z.coerce.number().optional(),
        status: InvoiceStatusEnum.optional(),
        visaByUserId: z.coerce.number().optional(),
        fromDate: z.coerce.date().optional(),
        toDate: z.coerce.date().optional(),
        sortBy: z.enum(["date", "reference", "total", "status", "inChargeUser"]).optional().default("date"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    })
    .merge(paginationSchema)

export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>
export type InvoiceFilterInput = z.input<typeof invoiceFilterSchema>

// ============================================================================
// List Response Schema
// ============================================================================

export const invoiceListResponse = createPageResponseSchema(invoiceResponseSchema)

export type InvoiceListResponse = z.infer<typeof invoiceListResponse>
