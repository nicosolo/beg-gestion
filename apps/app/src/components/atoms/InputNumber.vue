<template>
    <input
        ref="inputRef"
        type="text"
        inputmode="decimal"
        :value="displayValue"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="handleBlur"
        :min="min"
        :class="[computedClass, $attrs.class]"
    />
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

const {
    modelValue,
    type = "number",
    min,
    step,
} = defineProps<{
    modelValue: number | null
    type?: "percentage" | "amount" | "number" | "distance" | "time"
    step?: number
    min?: number | string
}>()

const emit = defineEmits<{
    (e: "update:modelValue", value: number): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

// Raw user text (allows keeping the user's chosen separator while typing)
const rawInput = ref<string | null>(null)

const displayValue = computed(() => {
    if (rawInput.value !== null) return rawInput.value
    return modelValue === null || modelValue === undefined ? "" : String(modelValue)
})

const computedClass = computed(() => {
    if (type === "percentage") {
        return "w-16 p-1 border border-gray-300 rounded"
    }
    if (type === "amount") {
        return "w-24 p-1 border border-gray-300 rounded"
    }
    if (type === "distance") {
        return "w-16 p-1 border border-gray-300 rounded"
    }
    return "w-20 p-1 border border-gray-300 rounded"
})

const stepValue = computed(() => {
    if (step) return step
    if (type === "percentage") return 0.1
    if (type === "amount") return 0.05
    if (type === "distance") return 1
    if (type === "time") return 0.25
    return 0.1
})

function handleInput(event: Event) {
    const target = event.target as HTMLInputElement
    const raw = target.value
    // Accept both '.' and ',' as decimal separators (Swiss fr-CH uses ',')
    const normalized = raw.replace(",", ".")
    rawInput.value = raw
    let value = parseFloat(normalized)
    if (isNaN(value)) {
        value = 0
        if (raw === "") rawInput.value = ""
    }
    if (min !== undefined) {
        const minNum = typeof min === "string" ? parseFloat(min) : min
        if (!isNaN(minNum) && value < minNum) value = minNum
    }
    emit("update:modelValue", value)
}

function handleBlur() {
    // Drop raw text on blur so the input reflects the canonical numeric value
    rawInput.value = null
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault()
        const current = modelValue ?? 0
        const step = stepValue.value
        let newValue = event.key === "ArrowUp" ? current + step : current - step
        if (min !== undefined) {
            const minNum = typeof min === "string" ? parseFloat(min) : min
            if (!isNaN(minNum) && newValue < minNum) newValue = minNum
        }
        const rounded = Math.round(newValue * 1000) / 1000
        rawInput.value = null
        emit("update:modelValue", rounded)
    }
}
</script>
