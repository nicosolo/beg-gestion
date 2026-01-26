<template>
    <span
        :class="[
            'inline-flex items-center font-semibold rounded-full',
            sizeClasses,
            variantClasses,
            className,
        ]"
    >
        <slot></slot>
    </span>
</template>

<script setup lang="ts">
const props = defineProps<{
    variant?: "success" | "error" | "warning" | "info" | "amber" | "indigo" | "blue" | "muted"
    size?: "sm" | "md"
    className?: string
}>()

// Size classes
const sizeClasses = (() => {
    switch (props.size) {
        case "md":
            return "px-3 py-1 text-sm"
        case "sm":
        default:
            return "px-2 text-xs leading-5"
    }
})()

// Variant classes
const variantClasses = (() => {
    switch (props.variant) {
        case "success":
            return "bg-green-100 text-green-800"
        case "error":
            return "bg-red-100 text-red-800"
        case "warning":
            return "bg-yellow-100 text-yellow-800"
        case "info":
            return "bg-blue-100 text-blue-800"
        case "amber":
            return "bg-amber-200 text-amber-900"
        case "indigo":
            return "bg-indigo-100 text-indigo-800"
        case "blue":
            return "bg-blue-100 text-blue-800"
        case "muted":
            return "bg-gray-200 text-gray-500"
        default:
            return "bg-gray-100 text-gray-800"
    }
})()
</script>
