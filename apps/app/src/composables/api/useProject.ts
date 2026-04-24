import { z } from "zod"
import {
    idParamSchema,
    projectFilterSchema,
    projectExportFilterSchema,
    projectCreateSchema,
    projectUpdateSchema,
    type ProjectListResponse,
    type ProjectResponse,
    type SubProjectNamesResponse,
} from "@beg/validations"
import { useGet, usePost, usePut, useGetBinary } from "./useAPI"

export function useFetchProject() {
    return useGet<
        ProjectResponse,
        {
            params: typeof idParamSchema
        }
    >("project/:id", {
        params: idParamSchema,
    })
}

export function useFetchProjectList() {
    return useGet<
        ProjectListResponse,
        {
            query: typeof projectFilterSchema
        }
    >("project", {
        query: projectFilterSchema,
    })
}

export function useFetchSubProjectNames() {
    return useGet<SubProjectNamesResponse>("project/sub-project-names")
}

export function useExportProjects() {
    return useGetBinary<{
        query: typeof projectExportFilterSchema
    }>("project/export", {
        query: projectExportFilterSchema,
    })
}

export function useCreateProject() {
    return usePost<
        ProjectResponse,
        {
            body: typeof projectCreateSchema
        }
    >("project", {
        body: projectCreateSchema,
    })
}

export function useUpdateProject() {
    return usePut<
        ProjectResponse,
        {
            params: typeof idParamSchema
            body: typeof projectUpdateSchema
        }
    >("project/:id", {
        params: idParamSchema,
        body: projectUpdateSchema,
    })
}

export interface ProjectFolderMatch {
    projectNumber: string
    fullPath: string
    folderName: string
    parentFolder: string
    source: "mandats" | "photographies" | "sigMandats"
    sourceLabel: string
}

export function useProjectFolder(options?: { silent?: boolean }) {
    return useGet<
        {
            projectId: number
            projectNumber: string
            found: boolean
            matches: ProjectFolderMatch[]
        },
        {
            params: typeof idParamSchema
        }
    >("project/:id/folder", { params: idParamSchema }, options)
}

// Add a user as a member to a project
const addProjectMemberParamsSchema = z.object({ id: z.coerce.number(), userId: z.coerce.number() })

export function useAddProjectMember() {
    return usePost<
        { success: boolean; message: string },
        {
            params: typeof addProjectMemberParamsSchema
        }
    >("project/:id/members/:userId", {
        params: addProjectMemberParamsSchema,
    })
}
