import {
    idParamSchema,
    companyFilterSchema,
    companyCreateSchema,
    companyUpdateSchema,
    type CompanyResponse,
    type PageResponse,
    type Company,
    type SuccessResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useDelete } from "./useAPI"

export function useFetchCompany() {
    return useGet<
        CompanyResponse,
        {
            params: typeof idParamSchema
        }
    >("company/:id", {
        params: idParamSchema,
    })
}

export function useFetchCompanyList() {
    return useGet<
        PageResponse<Company>,
        {
            query: typeof companyFilterSchema
        }
    >("company", {
        query: companyFilterSchema,
    })
}

export function useCreateCompany() {
    return usePost<
        CompanyResponse,
        {
            body: typeof companyCreateSchema
        }
    >("company", {
        body: companyCreateSchema,
    })
}

export function useUpdateCompany() {
    return usePut<
        CompanyResponse,
        {
            params: typeof idParamSchema
            body: typeof companyUpdateSchema
        }
    >("company/:id", {
        params: idParamSchema,
        body: companyUpdateSchema,
    })
}

export function useDeleteCompany() {
    return useDelete<
        SuccessResponse,
        {
            params: typeof idParamSchema
        }
    >("company/:id", {
        params: idParamSchema,
    })
}
