import { useTauri } from "@/composables/useTauri"

interface SendMailOptions {
    to?: string
    cc?: string
    bcc?: string
    subject: string
    htmlBody: string
    plainBody: string
}

export function useSendMail() {
    const { isTauri, openFile } = useTauri()

    const sendMail = async ({ to, cc, bcc, subject, htmlBody, plainBody }: SendMailOptions) => {
        if (isTauri.value) {
            const headers = [`To: ${to || ""}`, `Subject: ${subject}`]
            if (cc) headers.push(`Cc: ${cc}`)
            if (bcc) headers.push(`Bcc: ${bcc}`)
            headers.push(
                `X-Unsent: 1`,
                `MIME-Version: 1.0`,
                `Content-Type: text/html; charset=utf-8`
            )

            const eml = [...headers, ``, `<html><body>${htmlBody}</body></html>`].join("\r\n")

            const { writeFile } = await import("@tauri-apps/plugin-fs")
            const { tempDir } = await import("@tauri-apps/api/path")
            const fileName = `mail-${Date.now()}.eml`
            const tmpPath = `${await tempDir()}${fileName}`
            await writeFile(tmpPath, new TextEncoder().encode(eml))
            await openFile(tmpPath)
        } else {
            const params = [
                `subject=${encodeURIComponent(subject)}`,
                `body=${encodeURIComponent(plainBody)}`,
            ]
            if (cc) params.push(`cc=${encodeURIComponent(cc)}`)
            if (bcc) params.push(`bcc=${encodeURIComponent(bcc)}`)
            window.location.href = `mailto:${to || ""}?${params.join("&")}`
        }
    }

    return { sendMail }
}
