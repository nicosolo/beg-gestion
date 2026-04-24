import { and, eq, inArray, lt } from "drizzle-orm"
import { db as defaultDb } from "../db"
import { invoices } from "../db/schema"

export type Mode = { kind: "pre-2025" } | { kind: "csv"; csvText: string }

export interface BulkSetResult {
    flipped: number
    unmatched: string[]
}

export function parseCsv(csvText: string): string[] {
    const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)

    if (lines.length === 0) return []

    // Detect header row by checking if first row contains "invoiceNumber"
    const first = lines[0].toLowerCase()
    const dataLines = first.includes("invoicenumber") ? lines.slice(1) : lines

    const matches: string[] = []
    for (const line of dataLines) {
        const cols = line.split(",").map((c) => c.trim())
        const invoiceNumber = cols[0]
        const sent = (cols[1] ?? "").toLowerCase()
        if (!invoiceNumber) continue
        if (sent === "1" || sent === "true" || sent === "yes") {
            matches.push(invoiceNumber)
        }
    }
    return matches
}

type Db = typeof defaultDb

export async function bulkSetInvoiceStatus(mode: Mode, db: Db = defaultDb): Promise<BulkSetResult> {
    if (mode.kind === "pre-2025") {
        const cutoff = new Date("2025-01-01T00:00:00Z")
        const rows = await db
            .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
            .from(invoices)
            .where(and(eq(invoices.status, "draft"), lt(invoices.issueDate, cutoff)))
            .execute()

        if (rows.length === 0) return { flipped: 0, unmatched: [] }

        await db
            .update(invoices)
            .set({ status: "sent" })
            .where(
                inArray(
                    invoices.id,
                    rows.map((r) => r.id)
                )
            )
            .execute()

        for (const r of rows) {
            console.log(`flipped ${r.invoiceNumber ?? `#${r.id}`} -> sent`)
        }

        return { flipped: rows.length, unmatched: [] }
    }

    const requested = parseCsv(mode.csvText)
    if (requested.length === 0) return { flipped: 0, unmatched: [] }

    const found = await db
        .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(inArray(invoices.invoiceNumber, requested))
        .execute()

    const foundNumbers = new Set(found.map((r) => r.invoiceNumber).filter((n): n is string => !!n))
    const unmatched = requested.filter((n) => !foundNumbers.has(n))

    if (found.length > 0) {
        await db
            .update(invoices)
            .set({ status: "sent" })
            .where(
                inArray(
                    invoices.id,
                    found.map((r) => r.id)
                )
            )
            .execute()

        for (const r of found) {
            console.log(`flipped ${r.invoiceNumber ?? `#${r.id}`} -> sent`)
        }
    }

    return { flipped: found.length, unmatched }
}

async function main() {
    const isPre2025 = process.argv.includes("--pre-2025")

    let mode: Mode
    if (isPre2025) {
        mode = { kind: "pre-2025" }
    } else {
        const csvText = await new Response(Bun.stdin.stream()).text()
        mode = { kind: "csv", csvText }
    }

    const result = await bulkSetInvoiceStatus(mode)
    console.log(`flipped: ${result.flipped}, unmatched: [${result.unmatched.join(", ")}]`)
}

if (import.meta.main) {
    main()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("bulk-set-invoice-status failed", err)
            process.exit(1)
        })
}
