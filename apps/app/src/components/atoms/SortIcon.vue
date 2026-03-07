<template>
    <svg :class="iconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="pathData" />
    </svg>
</template>

<script setup lang="ts">
import { computed } from "vue"

interface Props {
    direction?: "asc" | "desc" | "none"
    size?: "sm" | "md" | "lg"
}

const props = withDefaults(defineProps<Props>(), {
    direction: "none",
    size: "sm",
})

// Compute icon class based on size and state
const iconClass = computed(() => {
    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-5 h-5",
        lg: "w-6 h-6",
    }

    const colorClass = props.direction === "none" ? "text-gray-400" : "text-gray-700"

    return `${sizeClasses[props.size]} ${colorClass}`
})

// Compute path data based on sort direction
const pathData = computed(() => {
    switch (props.direction) {
        case "asc":
            // Ascending sort icon
            return "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
        case "desc":
            // Descending sort icon
            return "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
        default:
            // Unsorted icon (both arrows)
            return "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
    }
})
</script>
