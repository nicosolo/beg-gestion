import {
    idParamSchema,
    activityFilterSchema,
    activityExportFilterSchema,
    activityCreateSchema,
    activityUpdateSchema,
    userMonthlyStatsFilterSchema,
    type ActivityListResponse,
    type ActivityResponse,
    type OrphanedActivitiesResponse,
    type UserMonthlyStatsResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useDelete, useGetBinary } from "./useAPI"

export function useFetchActivity() {
    return useGet<
        ActivityResponse,
        {
            params: typeof idParamSchema
        }
    >("activity/:id", {
        params: idParamSchema,
    })
}

export function useFetchActivityList() {
    return useGet<
        ActivityListResponse,
        {
            query: typeof activityFilterSchema
        }
    >("activity", {
        query: activityFilterSchema,
    })
}

export function useExportActivities() {
    return useGetBinary<{
        query: typeof activityExportFilterSchema
    }>("activity/export", {
        query: activityExportFilterSchema,
    })
}

export function useCreateActivity() {
    return usePost<
        ActivityResponse,
        {
            body: typeof activityCreateSchema
        }
    >("activity", {
        body: activityCreateSchema,
    })
}

export function useUpdateActivity() {
    return usePut<
        ActivityResponse,
        {
            params: typeof idParamSchema
            body: typeof activityUpdateSchema
        }
    >("activity/:id", {
        params: idParamSchema,
        body: activityUpdateSchema,
    })
}

export function useDeleteActivity() {
    return useDelete<
        void,
        {
            params: typeof idParamSchema
        }
    >("activity/:id", {
        params: idParamSchema,
    })
}

export function useFetchOrphanedActivities() {
    return useGet<OrphanedActivitiesResponse>("activity/orphaned")
}

export function useFetchMyMonthlyStats() {
    return useGet<
        UserMonthlyStatsResponse,
        {
            query: typeof userMonthlyStatsFilterSchema
        }
    >("activity/my-stats", {
        query: userMonthlyStatsFilterSchema,
    })
}
