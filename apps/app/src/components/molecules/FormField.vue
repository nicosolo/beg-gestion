<template>
    <div :class="['form-group', highlight && 'bg-yellow-50 border border-yellow-300 rounded-md px-2.5 py-2']">

        <Label :className="labelClassName" v-if="label">
            {{ label }}
            <span v-if="required" class="text-red-500 ml-0.5">*</span>
        </Label>
        <slot name="input"> </slot>
        <slot name="help">
            <p class="text-sm text-gray-500 mt-1">
                <slot name="help-text"> </slot>
            </p>
        </slot>
    </div>
</template>

<script setup lang="ts">
import Label from "../atoms/Label.vue"

interface FormFieldProps {
    label?: string
    modelValue?: string
    type?: string
    placeholder?: string
    disabled?: boolean
    labelClassName?: string
    required?: boolean
    highlight?: boolean
}

const { label, labelClassName, required, highlight } = defineProps<FormFieldProps>()

defineEmits<{
    (e: "update:modelValue", value: string): void
}>()
</script>
