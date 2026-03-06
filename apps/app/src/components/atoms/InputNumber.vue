<template>
    <input
        ref="inputRef"
        type="number"
        :value="modelValue"
        @input="handleInput"
        @keydown="handleKeydown"
        step="any"
        :class="[computedClass, $attrs.class]"
    />
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

const {
    modelValue,
    type = "number",
    step = 1,
} = defineProps<{
    modelValue: number | null
    type?: "percentage" | "amount" | "number" | "distance" | "time"
    step?: number
}>()

const emit = defineEmits<{
    (e: "update:modelValue", value: number): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

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
    const value = parseFloat((event.target as HTMLInputElement).value)
    emit("update:modelValue", value)
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault()
        const current = modelValue ?? 0
        const step = stepValue.value
        const newValue = event.key === "ArrowUp" ? current + step : current - step
        const rounded = Math.round(newValue * 1000) / 1000
        emit("update:modelValue", rounded)
    }
}
</script>
