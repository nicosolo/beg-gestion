import { useAlert } from "@/composables/utils/useAlert"
import { useFileDownload } from "@/composables/utils/useFileDownload"

export function useExcelExport() {
    const { successAlert, errorAlert } = useAlert()
    const { downloadBlob } = useFileDownload()

    const exportToExcel = async (
        arrayBuffer: ArrayBuffer | null,
        filename: string
    ): Promise<void> => {
        try {
            if (!arrayBuffer) {
                errorAlert("Échec de l'export")
                return
            }

            const blob = new Blob([arrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            })

            await downloadBlob(blob, filename, [{ name: "Excel", extensions: ["xlsx"] }])
            successAlert("Export réussi")
        } catch (error) {
            console.error("Failed to export to Excel:", error)
            errorAlert("Erreur lors de l'export")
        }
    }

    return { exportToExcel }
}
