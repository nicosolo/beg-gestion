import { Hono } from "hono"
import type { Context } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
    invoiceFilterSchema,
    invoiceResponseSchema,
    invoiceCreateSchema,
    invoiceUpdateSchema,
    idParamSchema,
    invoiceListResponse,
    type InvoiceCreateInput,
    type InvoiceUpdateInput,
} from "@beg/validations"
import { invoiceRepository } from "../db/repositories/invoice.repository"
import { authMiddleware } from "@src/tools/auth-middleware"
import { responseValidator } from "@src/tools/response-validator"
import { throwNotFound, throwValidationError, parseZodError } from "@src/tools/error-handler"
import type { Variables } from "@src/types/global"
import { roleMiddleware } from "@src/tools/role-middleware"
import { z, ZodError } from "zod"
import { normalizeStoredPath, fileBaseName, matchesStoredPath } from "@src/tools/file-utils"
import { storeFile, serveFile } from "@src/services/file-storage.service"

type UploadedInvoiceFiles = {
    invoiceDocument?: File
    offers: Record<number, File>
    adjudications: Record<number, File>
    situations: Record<number, File>
    documents: Record<number, File>
}

const isMultipartRequest = (contentType: string | undefined) =>
    Boolean(contentType && contentType.includes("multipart/form-data"))

const collectUploadedFiles = (formData: FormData): UploadedInvoiceFiles => {
    const files: UploadedInvoiceFiles = {
        offers: {},
        adjudications: {},
        situations: {},
        documents: {},
    }

    const invoiceDocument = formData.get("invoiceDocument")
    if (invoiceDocument instanceof File) {
        files.invoiceDocument = invoiceDocument
    }

    formData.forEach((value, key) => {
        if (!(value instanceof File)) return

        const offerMatch = key.match(/^offerFiles\[(\d+)\]$/)
        if (offerMatch) {
            files.offers[Number(offerMatch[1])] = value
            return
        }

        const adjudicationMatch = key.match(/^adjudicationFiles\[(\d+)\]$/)
        if (adjudicationMatch) {
            files.adjudications[Number(adjudicationMatch[1])] = value
            return
        }

        const situationMatch = key.match(/^situationFiles\[(\d+)\]$/)
        if (situationMatch) {
            files.situations[Number(situationMatch[1])] = value
            return
        }

        const documentMatch = key.match(/^documentFiles\[(\d+)\]$/)
        if (documentMatch) {
            files.documents[Number(documentMatch[1])] = value
        }
    })

    return files
}

const parseInvoicePayload = async (
    payload: unknown,
    mode: "create" | "update"
): Promise<InvoiceCreateInput | InvoiceUpdateInput> => {
    try {
        return mode === "create"
            ? invoiceCreateSchema.parse(payload)
            : invoiceUpdateSchema.parse(payload)
    } catch (error) {
        if (error instanceof ZodError) {
            throwValidationError("Invalid invoice payload", parseZodError(error))
        }
        throw error
    }
}

const parseInvoiceRequestBody = async (
    c: Context<{ Variables: Variables }>,
    mode: "create" | "update"
): Promise<{
    invoiceData: InvoiceCreateInput | InvoiceUpdateInput
    uploadedFiles: UploadedInvoiceFiles
}> => {
    const contentType = c.req.header("content-type")

    if (isMultipartRequest(contentType)) {
        const formData = await c.req.formData()
        const payloadRaw = formData.get("payload")
        if (typeof payloadRaw !== "string") {
            throwValidationError("Missing invoice payload")
        }

        let parsedPayload: unknown
        try {
            parsedPayload = JSON.parse(payloadRaw)
        } catch (error) {
            throwValidationError("Invalid invoice payload format")
        }

        const invoiceData = await parseInvoicePayload(parsedPayload, mode)
        const uploadedFiles = collectUploadedFiles(formData)

        return { invoiceData, uploadedFiles }
    }

    try {
        const jsonPayload = await c.req.json()
        const invoiceData = await parseInvoicePayload(jsonPayload, mode)
        return {
            invoiceData,
            uploadedFiles: { offers: {}, adjudications: {}, situations: {}, documents: {} },
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            throwValidationError("Invalid invoice payload")
        }
        throw error
    }
}

const hasUploadedFiles = (files: UploadedInvoiceFiles) => {
    return (
        Boolean(files.invoiceDocument) ||
        Object.keys(files.offers).length > 0 ||
        Object.keys(files.adjudications).length > 0 ||
        Object.keys(files.situations).length > 0 ||
        Object.keys(files.documents).length > 0
    )
}

const persistUploadedFiles = async (
    invoiceData: InvoiceCreateInput | InvoiceUpdateInput,
    files: UploadedInvoiceFiles
) => {
    if (!hasUploadedFiles(files)) return

    const folderId = crypto.randomUUID()

    if (files.invoiceDocument) {
        const dbPath = await storeFile(files.invoiceDocument, "invoice", folderId)
        ;(invoiceData as any).invoiceDocument = dbPath
    }

    const collections = [
        { key: "offers" as const, filesMap: files.offers },
        { key: "adjudications" as const, filesMap: files.adjudications },
        { key: "situations" as const, filesMap: files.situations },
        { key: "documents" as const, filesMap: files.documents },
    ] as const

    for (const { key, filesMap } of collections) {
        const items = Array.isArray(invoiceData[key]) ? [...invoiceData[key]!] : []
        for (const [indexKey, file] of Object.entries(filesMap)) {
            const index = Number(indexKey)
            if (!file) continue
            const existing = items[index] ? { ...items[index] } : ({} as any)
            const dbPath = await storeFile(file, "invoice", folderId)
            existing.file = dbPath
            items[index] = existing
        }
        ;(invoiceData as any)[key] = items
    }
}

export const invoiceRoutes = new Hono<{ Variables: Variables }>()
    .use("/*", authMiddleware)
    .get(
        "/",
        zValidator("query", invoiceFilterSchema),
        responseValidator({
            200: invoiceListResponse,
        }),
        async (c) => {
            const filter = c.req.valid("query")
            const user = c.get("user")
            const result = await invoiceRepository.findAll(user, filter)
            return c.render(result, 200)
        }
    )
    .get(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: invoiceResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const user = c.get("user")
            const invoice = await invoiceRepository.findById(id, user)
            if (!invoice) {
                throwNotFound("Invoice")
            }
            return c.render(invoice, 200)
        }
    )
    .get(
        "/:id/files",
        zValidator("param", idParamSchema),
        zValidator(
            "query",
            z.object({
                path: z.string(),
            })
        ),
        async (c) => {
            const { id } = c.req.valid("param")
            const { path: requestedPath } = c.req.valid("query")
            const user = c.get("user")
            const invoice = await invoiceRepository.findById(id, user)
            if (!invoice) {
                throwNotFound("Invoice")
            }

            let decodedPath = requestedPath
            try {
                decodedPath = decodeURIComponent(requestedPath)
            } catch {
                // keep original if decoding fails
            }
            const normalizedRequested = normalizeStoredPath(decodedPath)
            if (!normalizedRequested) {
                throwNotFound("Invoice document")
            }

            // Collect all file paths from the invoice
            const invoiceFiles: string[] = []
            if (invoice.invoiceDocument) invoiceFiles.push(invoice.invoiceDocument)
            if (invoice.legacyInvoicePath) {
                invoiceFiles.push(invoice.legacyInvoicePath)
                invoiceFiles.push(invoice.legacyInvoicePath.replace("fab", "html"))
            }
            invoice.offers?.forEach((o: any) => o.file && invoiceFiles.push(o.file))
            invoice.adjudications?.forEach((a: any) => a.file && invoiceFiles.push(a.file))
            invoice.situations?.forEach((s: any) => s.file && invoiceFiles.push(s.file))
            invoice.documents?.forEach((d: any) => d.file && invoiceFiles.push(d.file))

            // Find matching file path
            const matchedFile = invoiceFiles.find((f) => matchesStoredPath(f, normalizedRequested))
            if (!matchedFile) {
                throwNotFound("Invoice document")
            }

            return serveFile(matchedFile, fileBaseName(normalizedRequested))
        }
    )
    .post(
        "/",
        responseValidator({
            201: invoiceResponseSchema,
        }),
        async (c) => {
            const user = c.get("user")
            const { invoiceData: parsedInvoice, uploadedFiles } = await parseInvoiceRequestBody(
                c,
                "create"
            )
            const invoiceData = parsedInvoice as InvoiceCreateInput

            if (!invoiceData.projectId) {
                throwValidationError("Project ID is required for invoice creation", [
                    { field: "projectId", message: "Missing project reference" },
                ])
            }
            await persistUploadedFiles(invoiceData, uploadedFiles)
            const newInvoice = await invoiceRepository.create(invoiceData, user)
            return c.render(newInvoice, 201)
        }
    )
    .put(
        "/:id",
        zValidator("param", idParamSchema),
        responseValidator({
            200: invoiceResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const user = c.get("user")
            const { invoiceData: parsedInvoice, uploadedFiles } = await parseInvoiceRequestBody(
                c,
                "update"
            )
            const invoiceData = parsedInvoice as InvoiceUpdateInput

            await persistUploadedFiles(invoiceData, uploadedFiles)
            const updatedInvoice = await invoiceRepository.update(id, invoiceData, user)
            if (!updatedInvoice) {
                throwNotFound("Invoice")
            }
            return c.render(updatedInvoice, 200)
        }
    )
    .post(
        "/:id/visa",
        roleMiddleware("super_admin"),
        zValidator("param", idParamSchema),
        responseValidator({
            200: invoiceResponseSchema,
        }),
        async (c) => {
            const { id } = c.req.valid("param")
            const user = c.get("user")
            const updatedInvoice = await invoiceRepository.setVisa(id, user)
            if (!updatedInvoice) {
                throwNotFound("Invoice")
            }
            return c.render(updatedInvoice, 200)
        }
    )
    .delete("/:id", zValidator("param", idParamSchema), async (c) => {
        const { id } = c.req.valid("param")
        const user = c.get("user")
        try {
            const deleted = await invoiceRepository.delete(id, user)
            if (!deleted) {
                throwNotFound("Invoice")
            }
            return c.json({ message: "Invoice deleted successfully" }, 200)
        } catch (error) {
            if (error instanceof Error && error.message === "Cannot delete sent invoices") {
                return c.json({ error: "Cannot delete sent invoices" }, 400)
            }
            throw error
        }
    })
