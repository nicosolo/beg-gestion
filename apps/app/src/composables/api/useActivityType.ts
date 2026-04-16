import {
    idParamSchema,
    activityTypeCreateSchema,
    activityTypeUpdateSchema,
    classPresetPreviewRequestSchema,
    type ActivityTypeResponse,
    type ClassPresetPreviewResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useDelete } from "./useAPI"

export function useFetchActivityType() {
    return useGet<ActivityTypeResponse>("activity-type/:id", {
        params: idParamSchema,
    })
}

export function useFetchActivityTypes() {
    return useGet<ActivityTypeResponse[]>("activity-type")
}

export function useFetchActivityTypeFiltered() {
    return useGet<ActivityTypeResponse[]>("activity-type/filtered")
}

export function useCreateActivityType() {
    return usePost<
        ActivityTypeResponse,
        {
            body: typeof activityTypeCreateSchema
        }
    >("activity-type", {
        body: activityTypeCreateSchema,
    })
}

export function useUpdateActivityType() {
    return usePut<
        ActivityTypeResponse,
        {
            params: typeof idParamSchema
            body: typeof activityTypeUpdateSchema
        }
    >("activity-type/:id", {
        params: idParamSchema,
        body: activityTypeUpdateSchema,
    })
}

export function usePreviewClassPresets() {
    return usePost<
        ClassPresetPreviewResponse,
        {
            body: typeof classPresetPreviewRequestSchema
        }
    >("activity-type/preview-classes", {
        body: classPresetPreviewRequestSchema,
    })
}

export function useDeleteActivityType() {
    return useDelete<
        { message: string },
        {
            params: typeof idParamSchema
        }
    >("activity-type/:id", {
        params: idParamSchema,
    })
}
