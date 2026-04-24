import {
    idParamSchema,
    collaboratorGroupFilterSchema,
    collaboratorGroupCreateSchema,
    collaboratorGroupUpdateSchema,
    type CollaboratorGroupResponse,
    type PageResponse,
    type CollaboratorGroup,
    type SuccessResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useDelete } from "./useAPI"

export function useFetchCollaboratorGroup() {
    return useGet<
        CollaboratorGroupResponse,
        {
            params: typeof idParamSchema
        }
    >("collaborator-group/:id", {
        params: idParamSchema,
    })
}

export function useFetchCollaboratorGroupList() {
    return useGet<
        PageResponse<CollaboratorGroup>,
        {
            query: typeof collaboratorGroupFilterSchema
        }
    >("collaborator-group", {
        query: collaboratorGroupFilterSchema,
    })
}

export function useCreateCollaboratorGroup() {
    return usePost<
        CollaboratorGroupResponse,
        {
            body: typeof collaboratorGroupCreateSchema
        }
    >("collaborator-group", {
        body: collaboratorGroupCreateSchema,
    })
}

export function useUpdateCollaboratorGroup() {
    return usePut<
        CollaboratorGroupResponse,
        {
            params: typeof idParamSchema
            body: typeof collaboratorGroupUpdateSchema
        }
    >("collaborator-group/:id", {
        params: idParamSchema,
        body: collaboratorGroupUpdateSchema,
    })
}

export function useDeleteCollaboratorGroup() {
    return useDelete<
        SuccessResponse,
        {
            params: typeof idParamSchema
        }
    >("collaborator-group/:id", {
        params: idParamSchema,
    })
}
