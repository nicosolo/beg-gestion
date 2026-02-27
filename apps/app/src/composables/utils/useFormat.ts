const intlNumberFormat = new Intl.NumberFormat("de-CH", {
    notation: "standard",
})
const intlNumberFormatHours = new Intl.NumberFormat("de-CH", {
    notation: "standard",
    minimumFractionDigits: 2,
})
export const useFormat = () => {
    const formatCurrency = (amount: number, showCurrency = true) => {
        return `${new Intl.NumberFormat("ch-FR", {
            currency: "CHF",
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            signDisplay: "never",
        }).format(Math.round(amount * 20) / 20)}${showCurrency ? ".-" : ""}`
    }

    const formatPercentage = (percentage: number) => {
        return new Intl.NumberFormat("de-CH", {
            style: "percent",
            minimumFractionDigits: 2,
        }).format(percentage)
    }

    const formatNumber = (number: number) => {
        return intlNumberFormat.format(number)
    }

    const formatDuration = (duration: number | null | undefined) => {
        if (duration === undefined || duration === null) return "-"

        // Round to nearest 0.25 (quarter hour)
        return intlNumberFormatHours.format(duration)
    }

    const formatDate = (date: Date | null | undefined) => {
        if (!date) return "N/A"
        return new Date(date).toLocaleDateString("fr-CH")
    }

    const nl2br = (text: string | null | undefined) => {
        if (!text) return ""
        // Escape HTML to prevent XSS
        const escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
        return escaped.replace(/\n\n/g, "<br>").replace(/\n/g, "<br>")
    }

    return { formatCurrency, formatPercentage, formatDuration, formatDate, formatNumber, nl2br }
}
