/* eslint-disable */
// @ts-nocheck
import { exec } from "child_process"
import { promisify } from "util"
import { mkdir, rm, writeFile } from "fs/promises"
import path from "path"

const execAsync = promisify(exec)

export async function exportMdbToJson(mdbPath: string, outputDir: string): Promise<void> {
    console.log(`Starting MDB export from ${mdbPath} to ${outputDir}`)

    // Ensure output directory exists and is clean
    try {
        await rm(outputDir, { recursive: true, force: true })
    } catch (error) {
        // Directory might not exist, that's ok
    }
    await mkdir(outputDir, { recursive: true })

    // Set locale to handle accented characters properly
    const execOptions = {
        env: {
            ...process.env,
            LANG: "C.UTF-8",
            LC_ALL: "C.UTF-8",
            LC_CTYPE: "C.UTF-8",
        },
    }

    // Get list of tables with proper encoding
    const { stdout: tablesOutput } = await execAsync(
        `LANG=C.UTF-8 LC_ALL=C.UTF-8 mdb-tables -1 "${mdbPath}"`,
        execOptions
    )
    const tables = tablesOutput
        .trim()
        .split("\n")
        .filter((t) => t.length > 0)

    console.log(`Found ${tables.length} tables to export`)

    // Export each table to JSON
    const failedTables: string[] = []

    for (const table of tables) {
        try {
            // Sanitize filename - replace special characters
            const safeTableName = table
                .replace(/[éèêë]/g, "e")
                .replace(/[àâä]/g, "a")
                .replace(/[îï]/g, "i")
                .replace(/[ôö]/g, "o")
                .replace(/[ùûü]/g, "u")
                .replace(/[ç]/g, "c")
                .replace(/[ÉÈÊË]/g, "E")
                .replace(/[ÀÂÄ]/g, "A")
                .replace(/[ÎÏ]/g, "I")
                .replace(/[ÔÖ]/g, "O")
                .replace(/[ÙÛÜ]/g, "U")
                .replace(/[Ç]/g, "C")
                .replace(/[^a-zA-Z0-9_-]/g, "_")

            const outputFile = path.join(outputDir, `${safeTableName}.json`)
            console.log(`Exporting table: ${table} -> ${safeTableName}.json`)

            // Try to export with UTF-8 encoding
            let exportSuccess = false
            let stdout = ""

            try {
                // Try multiple encoding approaches
                const attempts = [
                    {
                        name: "UTF-8 with quotes",
                        cmd: `LANG=C.UTF-8 LC_ALL=C.UTF-8 mdb-json "${mdbPath}" "${table}"`,
                        encoding: "utf8",
                    },
                    {
                        name: "UTF-8 with single quotes",
                        cmd: `LANG=C.UTF-8 LC_ALL=C.UTF-8 mdb-json '${mdbPath}' '${table}'`,
                        encoding: "utf8",
                    },
                    {
                        name: "Latin1",
                        cmd: `LANG=C LC_ALL=C mdb-json "${mdbPath}" "${table}"`,
                        encoding: "latin1",
                    },
                    {
                        name: "No locale with buffer",
                        cmd: `mdb-json "${mdbPath}" "${table}"`,
                        encoding: "buffer",
                    },
                ]

                for (const attempt of attempts) {
                    try {
                        const result = await execAsync(attempt.cmd, {
                            encoding: attempt.encoding as any,
                            maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large tables
                            timeout: 30000, // 30 second timeout
                        })

                        if (attempt.encoding === "buffer") {
                            // Try to decode buffer with different encodings
                            const buffer = result.stdout as any as Buffer
                            try {
                                stdout = buffer.toString("utf8")
                            } catch {
                                try {
                                    stdout = buffer.toString("latin1")
                                } catch {
                                    stdout = buffer.toString("ascii")
                                }
                            }
                        } else {
                            stdout = result.stdout as string
                        }

                        // Check if we got valid JSON
                        if (stdout && stdout.trim().length > 0) {
                            // Validate it's JSON by trying to parse first line
                            const firstLine = stdout.split("\n")[0]
                            if (firstLine) {
                                try {
                                    JSON.parse(firstLine)
                                    exportSuccess = true
                                    console.log(
                                        `✓ Export succeeded for ${table} using ${attempt.name}`
                                    )
                                    break
                                } catch {
                                    // Not valid JSON, try next method
                                }
                            }
                        }
                    } catch (error: any) {
                        // Try next method
                        continue
                    }
                }

                if (!exportSuccess) {
                    console.error(`All export methods failed for table ${table}`)
                    failedTables.push(table)
                }
            } catch (error: any) {
                console.error(`Failed to export table ${table}:`, error.message)
                failedTables.push(table)
            }

            if (exportSuccess && stdout) {
                // Write the JSON output to file
                await writeFile(outputFile, stdout, "utf8")
                console.log(`✓ Exported ${table} to ${outputFile}`)
            }
        } catch (error) {
            console.error(`Failed to export table ${table}:`, error)
            failedTables.push(table)
            // Continue with other tables instead of throwing
        }
    }

    if (failedTables.length > 0) {
        console.warn(
            `⚠️  Failed to export ${failedTables.length} tables: ${failedTables.join(", ")}`
        )
    }

    console.log(
        `✓ Export completed. Successfully exported ${tables.length - failedTables.length} out of ${tables.length} tables`
    )
}
