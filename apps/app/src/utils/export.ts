export interface ExportColumn {
    key: string
    label: string
    formatter?: (value: any, row: any) => string
}

export interface ExportOptions {
    filename?: string
    columns: ExportColumn[]
    data: any[]
}

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV(options: ExportOptions): void {
    const { filename = "export.csv", columns, data } = options

    // Create CSV content
    const csvContent = generateCSV(columns, data)

    // Create blob with BOM for Excel UTF-8 compatibility
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })

    // Create download link
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)
}

/**
 * Generate CSV content from data
 */
export function generateCSV(columns: ExportColumn[], data: any[]): string {
    const csvRows: string[] = []

    // Add header row
    const headers = columns.map((col) => escapeCSV(col.label))
    csvRows.push(headers.join(","))

    // Add data rows
    for (const row of data) {
        const values = columns.map((col) => {
            let value = getNestedValue(row, col.key)

            // Apply formatter if provided
            if (col.formatter) {
                value = col.formatter(value, row)
            }

            return escapeCSV(value?.toString() || "")
        })
        csvRows.push(values.join(","))
    }

    return csvRows.join("\n")
}

/**
 * Escape CSV special characters
 */
export function escapeCSV(value: string): string {
    if (value == null) return ""

    // Convert to string if not already
    const str = String(value)

    // Check if escaping is needed
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        // Escape quotes by doubling them
        const escaped = str.replace(/"/g, '""')
        return `"${escaped}"`
    }

    return str
}

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue(obj, 'user.name')
 */
export function getNestedValue(obj: any, path: string): any {
    const keys = path.split(".")
    let value = obj

    for (const key of keys) {
        if (value == null) return null
        value = value[key]
    }

    return value
}

/**
 * Format date for Excel (ISO format)
 */
export function formatDateForExport(date: Date | string | null): string {
    if (!date) return ""

    const d = typeof date === "string" ? new Date(date) : date

    // Return ISO date format that Excel recognizes
    return d.toISOString().split("T")[0]
}

/**
 * Format duration from minutes to hours:minutes format
 */
export function formatDurationForExport(minutes: number): string {
    if (!minutes) return "0:00"

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    return `${hours}:${mins.toString().padStart(2, "0")}`
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number): string {
    if (amount == null) return "0.00"
    return amount.toFixed(2)
}
