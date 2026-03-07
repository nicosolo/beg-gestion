import {
    idParamSchema,
    vatRateCreateSchema,
    vatRateUpdateSchema,
    type VatRate,
    type VatRateListResponse,
    type SuccessResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useDelete } from "./useAPI"

export function useFetchVatRate() {
    return useGet<
        VatRate,
        {
            params: typeof idParamSchema
        }
    >("vat-rate/:id", {
        params: idParamSchema,
    })
}

export function useFetchVatRates() {
    return useGet<VatRateListResponse>("vat-rate")
}

export function useCreateVatRate() {
    return usePost<
        VatRate,
        {
            body: typeof vatRateCreateSchema
        }
    >("vat-rate", {
        body: vatRateCreateSchema,
    })
}

export function useUpdateVatRate() {
    return usePut<
        VatRate,
        {
            params: typeof idParamSchema
            body: typeof vatRateUpdateSchema
        }
    >("vat-rate/:id", {
        params: idParamSchema,
        body: vatRateUpdateSchema,
    })
}

export function useDeleteVatRate() {
    return useDelete<
        SuccessResponse,
        {
            params: typeof idParamSchema
        }
    >("vat-rate/:id", {
        params: idParamSchema,
    })
}
