<template>
    <div class="form-group">
        <Label :className="labelClassName" v-if="label">{{ label }}</Label>
        <Input
            type="date"
            :model-value="dateString"
            :disabled="disabled"
            :min="minString"
            :max="maxString"
            :class="inputClassName"
            @update:model-value="handleDateChange"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import Label from "../atoms/Label.vue"
import Input from "../atoms/Input.vue"

interface DateFieldProps {
    label?: string
    modelValue?: Date
    disabled?: boolean
    labelClassName?: string
    min?: Date
    max?: Date
    inputClassName?: string
}

const { label, modelValue, disabled, labelClassName, min, max, inputClassName } =
    defineProps<DateFieldProps>()

const emit = defineEmits<{
    (e: "update:modelValue", value?: Date): void
}>()

function toLocalDateString(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

const dateString = computed(() => {
    if (!modelValue) return ""
    return toLocalDateString(modelValue)
})

const minString = computed(() => (min ? toLocalDateString(min) : undefined))
const maxString = computed(() => (max ? toLocalDateString(max) : undefined))

function handleDateChange(value: string) {
    if (!value) {
        emit("update:modelValue", undefined)
        return
    }
    const year = parseInt(value.split("-")[0])
    if (year < 1900) return
    emit("update:modelValue", new Date(value))
}
</script>
