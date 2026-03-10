<template>
    <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :min="min"
        :max="max"
        :class="[
            'w-full h-9 px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
            className,
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
</template>

<script setup lang="ts">
defineProps<{
    modelValue?: string | number | null
    type?: string
    placeholder?: string
    disabled?: boolean
    className?: string
    required?: boolean
    min?: string
    max?: string
}>()

defineEmits<{
    (e: "update:modelValue", value: string): void
}>()
</script>
