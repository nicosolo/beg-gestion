import {
    idParamSchema,
    invoiceFilterSchema,
    invoiceExportFilterSchema,
    invoiceCreateSchema,
    invoiceUpdateSchema,
    type InvoiceResponse,
    type InvoiceListResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useDelete, useGetBinary } from "./useAPI"

export function useFetchInvoice() {
    return useGet<
        InvoiceResponse,
        {
            params: typeof idParamSchema
        }
    >("invoice/:id", {
        params: idParamSchema,
    })
}

export function useFetchInvoiceList() {
    return useGet<
        InvoiceListResponse,
        {
            query: typeof invoiceFilterSchema
        }
    >("invoice", {
        query: invoiceFilterSchema,
    })
}

export function useExportInvoices() {
    return useGetBinary<{
        query: typeof invoiceExportFilterSchema
    }>("invoice/export", {
        query: invoiceExportFilterSchema,
    })
}

export function useCreateInvoice() {
    return usePost<
        InvoiceResponse,
        {
            body: typeof invoiceCreateSchema
        }
    >("invoice", {
        body: invoiceCreateSchema,
    })
}

export function useUpdateInvoice() {
    return usePut<
        InvoiceResponse,
        {
            body: typeof invoiceUpdateSchema
            params: typeof idParamSchema
        }
    >("invoice/:id", {
        body: invoiceUpdateSchema,
        params: idParamSchema,
    })
}

export function useDeleteInvoice() {
    return useDelete<
        { success: boolean },
        {
            params: typeof idParamSchema
        }
    >("invoice/:id", {
        params: idParamSchema,
    })
}

export function useVisaInvoice() {
    return usePost<
        InvoiceResponse,
        {
            params: typeof idParamSchema
        }
    >("invoice/:id/visa", {
        params: idParamSchema,
    })
}
