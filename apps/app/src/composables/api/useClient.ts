import {
    idParamSchema,
    clientFilterSchema,
    clientCreateSchema,
    clientUpdateSchema,
    type ClientResponse,
    type PageResponse,
    type Client,
    type SuccessResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useDelete } from "./useAPI"

export function useFetchClient() {
    return useGet<
        ClientResponse,
        {
            params: typeof idParamSchema
        }
    >("client/:id", {
        params: idParamSchema,
    })
}

export function useFetchClientList() {
    return useGet<
        PageResponse<Client>,
        {
            query: typeof clientFilterSchema
        }
    >("client", {
        query: clientFilterSchema,
    })
}

export function useCreateClient() {
    return usePost<
        ClientResponse,
        {
            body: typeof clientCreateSchema
        }
    >("client", {
        body: clientCreateSchema,
    })
}

export function useUpdateClient() {
    return usePut<
        ClientResponse,
        {
            params: typeof idParamSchema
            body: typeof clientUpdateSchema
        }
    >("client/:id", {
        params: idParamSchema,
        body: clientUpdateSchema,
    })
}

export function useDeleteClient() {
    return useDelete<
        SuccessResponse,
        {
            params: typeof idParamSchema
        }
    >("client/:id", {
        params: idParamSchema,
    })
}
