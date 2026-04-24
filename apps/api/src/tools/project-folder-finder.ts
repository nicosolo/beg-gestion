import { readdir } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import { PROJECT_BASE_DIR, PROJECT_ROOTS, type ProjectRootKey } from "@src/config"

export interface ProjectFolderResult {
    projectNumber: string
    fullPath: string
    folderName: string
    parentFolder: string
}

export interface ProjectFolderMatch extends ProjectFolderResult {
    source: ProjectRootKey
    sourceLabel: string
}

/**
 * Smart search for project folders by finding the range folder first
 * @param baseDir Base directory to search in
 * @param projectNumber Project number to search for
 * @returns Array of matching project folders
 */
export async function findProjectFolder(
    baseDir: string,
    projectNumber: string | number
): Promise<ProjectFolderResult[]> {
    const results: ProjectFolderResult[] = []
    const projectNum = parseInt(projectNumber.toString())

    if (!existsSync(baseDir)) {
        throw new Error(`Base directory does not exist: ${baseDir}`)
    }

    try {
        // Step 1: Find the range folder that contains this project number
        const entries = await readdir(baseDir, { withFileTypes: true })

        let rangeFolder: string | null = null

        for (const entry of entries) {
            if (!entry.isDirectory()) continue

            // Check if this is a range folder (e.g., "1000 - 1200", "1000-1200", "1000_1200")
            const rangeMatch = entry.name.match(/^(\d+)\s*[-_]\s*(\d+)/)

            if (rangeMatch) {
                const rangeStart = parseInt(rangeMatch[1])
                const rangeEnd = parseInt(rangeMatch[2])

                // Check if our project number falls within this range
                if (projectNum >= rangeStart && projectNum <= rangeEnd) {
                    rangeFolder = path.join(baseDir, entry.name)
                    break
                }
            }
        }

        // Step 2: Search within the range folder (or baseDir if no range folder found)
        const searchDir = rangeFolder || baseDir

        // Only search one level deep in the range folder
        const searchEntries = await readdir(searchDir, { withFileTypes: true })

        for (const entry of searchEntries) {
            if (!entry.isDirectory()) continue

            const fullPath = path.join(searchDir, entry.name)

            // Check if folder name starts with the project number
            // Patterns: "1001 name" or "1001-name" or "1001_name" or just "1001"
            const folderNameMatch = entry.name.match(/^(\d+)([\s\-_]|$)/)

            if (folderNameMatch && parseInt(folderNameMatch[1]) === projectNum) {
                results.push({
                    projectNumber: projectNumber.toString(),
                    fullPath,
                    folderName: entry.name,
                    parentFolder: path.basename(searchDir),
                })
            }
        }
    } catch (error) {
        console.error(`Error searching for project ${projectNumber}:`, error)
    }

    return results
}

/**
 * Find a single project folder by project number (returns first match from /mandats)
 * @param projectNumber Project number to search for
 * @returns First matching project folder or null
 */
export async function findProjectFolderSingle(
    projectNumber: string | number
): Promise<ProjectFolderResult | null> {
    const results = await findProjectFolder(PROJECT_BASE_DIR, projectNumber)
    return results.length > 0 ? results[0] : null
}

/**
 * Search for a project folder across all configured PROJECT_ROOTS
 * (Mandats, Photographies, SIG Mandats). Roots that don't exist are skipped.
 */
export async function findProjectFoldersAcrossRoots(
    projectNumber: string | number
): Promise<ProjectFolderMatch[]> {
    const matches: ProjectFolderMatch[] = []

    for (const root of PROJECT_ROOTS) {
        if (!existsSync(root.path)) continue

        const results = await findProjectFolder(root.path, projectNumber)
        for (const result of results) {
            matches.push({
                ...result,
                fullPath: result.fullPath.replace(root.path, ""),
                source: root.key,
                sourceLabel: root.label,
            })
        }
    }

    return matches
}

export interface ProjectInvoiceFolderResult {
    project: ProjectFolderResult
    folderName: string
    fullPath: string
}

export async function findProjectInvoiceFolder(
    projectNumber: string | number
): Promise<ProjectInvoiceFolderResult | null> {
    const projectFolder = await findProjectFolderSingle(projectNumber)
    if (!projectFolder) {
        return null
    }

    const entries = await readdir(projectFolder.fullPath, { withFileTypes: true })
    const invoiceFolder = entries.find((entry) => {
        if (!entry.isDirectory()) return false
        const normalized = entry.name.trim().toLowerCase()
        return normalized.startsWith("9")
    })
    if (!invoiceFolder) {
        return null
    }

    const folderName = invoiceFolder.name
    return {
        project: projectFolder,
        folderName,
        fullPath: path.join(projectFolder.fullPath, folderName),
    }
}
