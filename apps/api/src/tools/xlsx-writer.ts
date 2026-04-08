/**
 * Minimal XLSX writer using raw XML + fflate for fast compression.
 * Supports: column widths, numFmt, bold, alignment, frozen panes, formulas, multiple sheets.
 */
import { zipSync, strToU8 } from "fflate"

// Excel epoch: dates are stored as days since 1899-12-30
const EXCEL_EPOCH = new Date(1899, 11, 30).getTime()
const MS_PER_DAY = 86400000

function dateToExcelSerial(date: Date): number {
    // Add timezone offset to get local date
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return (local.getTime() - EXCEL_EPOCH) / MS_PER_DAY
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function getColumnLetter(index: number): string {
    let letter = ""
    let num = index + 1
    while (num > 0) {
        const remainder = (num - 1) % 26
        letter = String.fromCharCode(65 + remainder) + letter
        num = Math.floor((num - 1) / 26)
    }
    return letter
}

export interface XlsxColumn {
    width: number
    numFmt?: string
}

export interface XlsxCellValue {
    value: string | number | Date | boolean | null | undefined
    formula?: string
    bold?: boolean
    horizontalAlignment?: "left" | "center" | "right"
    verticalAlignment?: "top" | "center" | "bottom"
    wrapText?: boolean
    numFmtOverride?: string
}

export interface XlsxSheetData {
    name: string
    columns: XlsxColumn[]
    rows: XlsxCellValue[][]
    freezeRow?: number
}

interface StyleEntry {
    numFmtId: number
    bold: boolean
    horizontalAlignment?: string
    verticalAlignment?: string
    wrapText: boolean
}

export function buildXlsx(sheets: XlsxSheetData[]): Buffer {
    // Collect all unique numFmt strings
    const builtinFmts: Record<string, number> = {
        General: 0,
        "0": 1,
        "0.00": 2,
        "#,##0": 3,
        "#,##0.00": 4,
    }

    const customFmts: Map<string, number> = new Map()
    let nextFmtId = 164 // Custom numFmt IDs start at 164

    function getNumFmtId(fmt?: string): number {
        if (!fmt) return 0
        if (builtinFmts[fmt] !== undefined) return builtinFmts[fmt]
        if (customFmts.has(fmt)) return customFmts.get(fmt)!
        const id = nextFmtId++
        customFmts.set(fmt, id)
        return id
    }

    // Pre-scan all sheets for numFmts
    for (const sheet of sheets) {
        for (const col of sheet.columns) {
            if (col.numFmt) getNumFmtId(col.numFmt)
        }
        for (const row of sheet.rows) {
            for (const cell of row) {
                if (cell.numFmtOverride) getNumFmtId(cell.numFmtOverride)
            }
        }
    }

    // Build style combinations
    const styleMap: Map<string, number> = new Map()
    const styles: StyleEntry[] = []

    // Default style (index 0)
    styles.push({ numFmtId: 0, bold: false, wrapText: false })
    styleMap.set("0|false|||false", 0)

    function getStyleIndex(entry: StyleEntry): number {
        const key = `${entry.numFmtId}|${entry.bold}|${entry.horizontalAlignment || ""}|${entry.verticalAlignment || ""}|${entry.wrapText}`
        if (styleMap.has(key)) return styleMap.get(key)!
        const idx = styles.length
        styles.push(entry)
        styleMap.set(key, idx)
        return idx
    }

    // Pre-scan for styles
    for (const sheet of sheets) {
        for (let r = 0; r < sheet.rows.length; r++) {
            const row = sheet.rows[r]
            for (let c = 0; c < row.length; c++) {
                const cell = row[c]
                const col = sheet.columns[c]
                const numFmtId = getNumFmtId(cell.numFmtOverride || col?.numFmt)
                getStyleIndex({
                    numFmtId,
                    bold: cell.bold ?? false,
                    horizontalAlignment: cell.horizontalAlignment,
                    verticalAlignment: cell.verticalAlignment,
                    wrapText: cell.wrapText ?? false,
                })
            }
        }
    }

    // Generate styles.xml
    const stylesXml = generateStylesXml(customFmts, styles)

    // Generate sheet XMLs
    const sheetXmls: string[] = []
    for (const sheet of sheets) {
        sheetXmls.push(generateSheetXml(sheet, getNumFmtId, getStyleIndex))
    }

    // Generate workbook.xml
    const workbookXml = generateWorkbookXml(sheets)

    // Generate rels
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

    const workbookRelsXml = generateWorkbookRelsXml(sheets.length)

    const contentTypesXml = generateContentTypesXml(sheets.length)

    // Build ZIP
    const files: Record<string, Uint8Array> = {
        "[Content_Types].xml": strToU8(contentTypesXml),
        "_rels/.rels": strToU8(relsXml),
        "xl/workbook.xml": strToU8(workbookXml),
        "xl/_rels/workbook.xml.rels": strToU8(workbookRelsXml),
        "xl/styles.xml": strToU8(stylesXml),
    }

    for (let i = 0; i < sheetXmls.length; i++) {
        files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXmls[i])
    }

    const zipped = zipSync(files, { level: 1 }) // Fast compression
    return Buffer.from(zipped)
}

function generateSheetXml(
    sheet: XlsxSheetData,
    getNumFmtId: (fmt?: string) => number,
    getStyleIndex: (entry: StyleEntry) => number
): string {
    const parts: string[] = []
    parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
    parts.push(
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    )

    // Frozen panes
    if (sheet.freezeRow) {
        parts.push("<sheetViews><sheetView tabSelected=\"1\" workbookViewId=\"0\">")
        parts.push(
            `<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/>`
        )
        parts.push("</sheetView></sheetViews>")
    }

    // Default row format
    parts.push('<sheetFormatPr defaultRowHeight="15"/>')

    // Column widths
    if (sheet.columns.length > 0) {
        parts.push("<cols>")
        for (let c = 0; c < sheet.columns.length; c++) {
            const col = sheet.columns[c]
            parts.push(
                `<col min="${c + 1}" max="${c + 1}" width="${col.width}" customWidth="1"/>`
            )
        }
        parts.push("</cols>")
    }

    // Rows
    parts.push("<sheetData>")
    for (let r = 0; r < sheet.rows.length; r++) {
        const row = sheet.rows[r]
        const rowNum = r + 1
        parts.push(`<row r="${rowNum}">`)
        for (let c = 0; c < row.length; c++) {
            const cell = row[c]
            const col = sheet.columns[c]
            const ref = `${getColumnLetter(c)}${rowNum}`

            const numFmtId = getNumFmtId(cell.numFmtOverride || col?.numFmt)
            const styleIdx = getStyleIndex({
                numFmtId,
                bold: cell.bold ?? false,
                horizontalAlignment: cell.horizontalAlignment,
                verticalAlignment: cell.verticalAlignment,
                wrapText: cell.wrapText ?? false,
            })

            if (cell.formula) {
                parts.push(
                    `<c r="${ref}" s="${styleIdx}"><f>${escapeXml(cell.formula)}</f></c>`
                )
            } else if (cell.value instanceof Date) {
                const serial = dateToExcelSerial(cell.value)
                parts.push(`<c r="${ref}" s="${styleIdx}"><v>${serial}</v></c>`)
            } else if (typeof cell.value === "number") {
                parts.push(`<c r="${ref}" s="${styleIdx}"><v>${cell.value}</v></c>`)
            } else if (typeof cell.value === "string" && cell.value.length > 0) {
                parts.push(
                    `<c r="${ref}" s="${styleIdx}" t="inlineStr"><is><t>${escapeXml(cell.value)}</t></is></c>`
                )
            } else {
                // Empty cell — skip or write empty
                parts.push(`<c r="${ref}" s="${styleIdx}"/>`)
            }
        }
        parts.push("</row>")
    }
    parts.push("</sheetData>")
    parts.push("</worksheet>")
    return parts.join("")
}

function generateStylesXml(customFmts: Map<string, number>, styles: StyleEntry[]): string {
    const parts: string[] = []
    parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
    parts.push(
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    )

    // Custom numFmts
    if (customFmts.size > 0) {
        parts.push(`<numFmts count="${customFmts.size}">`)
        for (const [fmt, id] of customFmts) {
            parts.push(`<numFmt numFmtId="${id}" formatCode="${escapeXml(fmt)}"/>`)
        }
        parts.push("</numFmts>")
    }

    // Fonts
    const hasBold = styles.some((s) => s.bold)
    const fontCount = hasBold ? 2 : 1
    parts.push(`<fonts count="${fontCount}">`)
    parts.push("<font><sz val=\"11\"/><name val=\"Calibri\"/></font>")
    if (hasBold) {
        parts.push("<font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font>")
    }
    parts.push("</fonts>")

    // Fills (required minimum 2)
    parts.push('<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>')

    // Borders (required minimum 1)
    parts.push('<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>')

    // Cell xfs (style combinations)
    parts.push(`<cellXfs count="${styles.length}">`)
    for (const style of styles) {
        const fontId = style.bold ? 1 : 0
        const hasAlignment =
            style.horizontalAlignment || style.verticalAlignment || style.wrapText
        const applyNumberFormat = style.numFmtId !== 0 ? ' applyNumberFormat="1"' : ""
        const applyFont = style.bold ? ' applyFont="1"' : ""
        const applyAlignment = hasAlignment ? ' applyAlignment="1"' : ""

        if (hasAlignment) {
            let align = "<alignment"
            if (style.horizontalAlignment) align += ` horizontal="${style.horizontalAlignment}"`
            if (style.verticalAlignment) align += ` vertical="${style.verticalAlignment}"`
            if (style.wrapText) align += ' wrapText="1"'
            align += "/>"
            parts.push(
                `<xf numFmtId="${style.numFmtId}" fontId="${fontId}" fillId="0" borderId="0"${applyNumberFormat}${applyFont}${applyAlignment}>${align}</xf>`
            )
        } else {
            parts.push(
                `<xf numFmtId="${style.numFmtId}" fontId="${fontId}" fillId="0" borderId="0"${applyNumberFormat}${applyFont}/>`
            )
        }
    }
    parts.push("</cellXfs>")

    parts.push("</styleSheet>")
    return parts.join("")
}

function generateWorkbookXml(sheets: XlsxSheetData[]): string {
    const parts: string[] = []
    parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
    parts.push(
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    )
    parts.push("<sheets>")
    for (let i = 0; i < sheets.length; i++) {
        parts.push(
            `<sheet name="${escapeXml(sheets[i].name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
        )
    }
    parts.push("</sheets></workbook>")
    return parts.join("")
}

function generateWorkbookRelsXml(sheetCount: number): string {
    const parts: string[] = []
    parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
    parts.push(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    )
    for (let i = 0; i < sheetCount; i++) {
        parts.push(
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        )
    }
    parts.push(
        `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
    )
    parts.push("</Relationships>")
    return parts.join("")
}

function generateContentTypesXml(sheetCount: number): string {
    const parts: string[] = []
    parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
    parts.push('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">')
    parts.push(
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    )
    parts.push('<Default Extension="xml" ContentType="application/xml"/>')
    parts.push(
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    )
    parts.push(
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    )
    for (let i = 0; i < sheetCount; i++) {
        parts.push(
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
    }
    parts.push("</Types>")
    return parts.join("")
}
