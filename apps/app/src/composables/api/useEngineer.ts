import {
    idParamSchema,
    engineerFilterSchema,
    engineerCreateSchema,
    engineerUpdateSchema,
    type EngineerResponse,
    type PageResponse,
    type Engineer,
    type SuccessResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useDelete } from "./useAPI"

export function useFetchEngineer() {
    return useGet<
        EngineerResponse,
        {
            params: typeof idParamSchema
        }
    >("engineer/:id", {
        params: idParamSchema,
    })
}

export function useFetchEngineerList() {
    return useGet<
        PageResponse<Engineer>,
        {
            query: typeof engineerFilterSchema
        }
    >("engineer", {
        query: engineerFilterSchema,
    })
}

export function useCreateEngineer() {
    return usePost<
        EngineerResponse,
        {
            body: typeof engineerCreateSchema
        }
    >("engineer", {
        body: engineerCreateSchema,
    })
}

export function useUpdateEngineer() {
    return usePut<
        EngineerResponse,
        {
            params: typeof idParamSchema
            body: typeof engineerUpdateSchema
        }
    >("engineer/:id", {
        params: idParamSchema,
        body: engineerUpdateSchema,
    })
}

export function useDeleteEngineer() {
    return useDelete<
        SuccessResponse,
        {
            params: typeof idParamSchema
        }
    >("engineer/:id", {
        params: idParamSchema,
    })
}
