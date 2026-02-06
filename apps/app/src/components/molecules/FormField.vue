<template>
    <div class="form-group">
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
}

const { label, modelValue, type, placeholder, disabled, labelClassName, required } =
    defineProps<FormFieldProps>()

defineEmits<{
    (e: "update:modelValue", value: string): void
}>()
</script>
