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
import {
    throwNotFound,
    throwForbidden,
    throwValidationError,
    parseZodError,
} from "@src/tools/error-handler"
import type { Variables } from "@src/types/global"
import { roleMiddleware, hasRole } from "@src/tools/role-middleware"
import { z, ZodError } from "zod"
import { normalizeStoredPath, fileBaseName, matchesStoredPath } from "@src/tools/file-utils"
import { storeFile, serveFile } from "@src/services/file-storage.service"
import { audit } from "@src/tools/audit"

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
        } catch {
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

type CollectionKey = "offers" | "adjudications" | "situations" | "documents"
type InvoiceData = Record<string, unknown>

const persistUploadedFiles = async (
    invoiceData: InvoiceCreateInput | InvoiceUpdateInput,
    files: UploadedInvoiceFiles
) => {
    if (!hasUploadedFiles(files)) return

    const data = invoiceData as InvoiceData
    const folderId = crypto.randomUUID()

    if (files.invoiceDocument) {
        data.invoiceDocument = await storeFile(files.invoiceDocument, "invoice", folderId)
    }

    const collections: { key: CollectionKey; filesMap: Record<number, File> }[] = [
        { key: "offers", filesMap: files.offers },
        { key: "adjudications", filesMap: files.adjudications },
        { key: "situations", filesMap: files.situations },
        { key: "documents", filesMap: files.documents },
    ]

    for (const { key, filesMap } of collections) {
        const source = data[key]
        const items = Array.isArray(source) ? [...source] : []
        for (const [indexKey, file] of Object.entries(filesMap)) {
            const index = Number(indexKey)
            if (!file) continue
            const existing: Record<string, unknown> = items[index]
                ? { ...(items[index] as Record<string, unknown>) }
                : {}
            existing.file = await storeFile(file, "invoice", folderId)
            items[index] = existing
        }
        data[key] = items
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
            invoice.offers?.forEach((o) => o.file && invoiceFiles.push(o.file))
            invoice.adjudications?.forEach((a) => a.file && invoiceFiles.push(a.file))
            invoice.situations?.forEach((s) => s.file && invoiceFiles.push(s.file))
            invoice.documents?.forEach((d) => d.file && invoiceFiles.push(d.file))

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
            if (
                ["controle", "vise", "sent"].includes(invoiceData.status || "") &&
                !invoiceData.visaByUserId
            ) {
                throwValidationError("visaByUserId is required for this status", [
                    { field: "visaByUserId", message: "Required for controle/visé/sent status" },
                ])
            }
            await persistUploadedFiles(invoiceData, uploadedFiles)
            const newInvoice = await invoiceRepository.create(invoiceData, user)
            if (!newInvoice) {
                throwNotFound("Invoice")
            }
            audit(user.id, user.initials, "create", "invoice", newInvoice.id, {
                number: newInvoice.invoiceNumber,
                projectId: newInvoice.projectId,
            })
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

            // Block editing of sent/visé invoices
            const existing = await invoiceRepository.findById(id, user)
            if (!existing) throwNotFound("Invoice")
            if (
                (existing.status === "vise" || existing.status === "sent") &&
                !hasRole(user.role, "admin")
            ) {
                throwForbidden("Cannot modify locked invoices (visé or sent)")
            }

            const { invoiceData: parsedInvoice, uploadedFiles } = await parseInvoiceRequestBody(
                c,
                "update"
            )
            const invoiceData = parsedInvoice as InvoiceUpdateInput

            const effectiveStatus = invoiceData.status ?? existing.status
            if (
                ["controle", "vise", "sent"].includes(effectiveStatus || "") &&
                !(invoiceData.visaByUserId ?? existing.visaByUserId)
            ) {
                throwValidationError("visaByUserId is required for this status", [
                    { field: "visaByUserId", message: "Required for controle/visé/sent status" },
                ])
            }

            await persistUploadedFiles(invoiceData, uploadedFiles)
            const updatedInvoice = await invoiceRepository.update(id, invoiceData, user)
            if (!updatedInvoice) {
                throwNotFound("Invoice")
            }
            audit(user.id, user.initials, "update", "invoice", id, {
                number: updatedInvoice.invoiceNumber,
                projectId: updatedInvoice.projectId,
            })
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
            const existing = await invoiceRepository.findById(id, user)
            if (!existing) {
                throwNotFound("Invoice")
            }
            await invoiceRepository.delete(id, user)

            audit(user.id, user.initials, "delete", "invoice", id, {
                number: existing.invoiceNumber,
                projectId: existing.projectId,
            })
            return c.json({ message: "Invoice deleted successfully" }, 200)
        } catch (error) {
            if (error instanceof Error && error.message === "Cannot delete locked invoices") {
                return c.json({ error: "Cannot delete locked invoices" }, 400)
            }
            throw error
        }
    })
