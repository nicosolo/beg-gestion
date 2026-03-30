<template>
    <component
        :is="props.href ? 'a' : props.to ? 'router-link' : 'button'"
        :type="props.to || props.href ? undefined : props.type"
        :to="props.to"
        :href="props.href"
        :class="[
            'rounded-md font-medium focus:outline-none focus:ring-2 cursor-pointer leading-none text-center flex items-center justify-center',
            props.href ? 'inline-flex' : 'block',
            variantClasses,
            sizeClasses,
            props.disabled ? 'cursor-not-allowed opacity-60' : '',
            props.fullWidth ? 'w-full' : '',
            props.className,
        ]"
        :disabled="props.to || props.href ? undefined : props.disabled || props.loading"
        @click="$emit('click', $event)"
    >
        <LoadingSpinner v-if="props.loading" size="sm" color="white" class="mr-2" />
        <slot></slot>
    </component>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { RouteLocationRaw } from "vue-router"
import LoadingSpinner from "./LoadingSpinner.vue"

interface Props {
    type?: "button" | "submit" | "reset"
    variant?:
        | "primary"
        | "secondary"
        | "danger"
        | "ghost"
        | "custom"
        | "ghost-danger"
        | "ghost-primary"
        | "amber"
    size?: "xxs" | "xs" | "sm" | "md" | "lg"
    disabled?: boolean
    className?: string
    to?: RouteLocationRaw
    href?: string
    loading?: boolean
    fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    type: "button",
})

defineEmits<{
    (e: "click", event: MouseEvent): void
}>()

const variantClasses = computed(() => {
    switch (props.variant) {
        case "primary":
            return "bg-indigo-600 hover:bg-indigo-700 text-white"
        case "secondary":
            return "bg-gray-200 hover:bg-gray-300 text-gray-700"
        case "danger":
            return "bg-red-600 hover:bg-red-700 text-white"
        case "ghost":
            return "bg-transparent hover:bg-gray-100 text-gray-700"
        case "ghost-primary":
            return "hover:bg-indigo-200 text-indigo-700"
        case "ghost-danger":
            return "hover:bg-red-100 text-red-600"
        case "amber":
            return "bg-amber-600 hover:bg-amber-700 text-white"
        case "custom":
            return ""
        default:
            return "bg-gray-200 hover:bg-gray-300 text-gray-700"
    }
})

const sizeClasses = computed(() => {
    switch (props.size) {
        case "xxs":
            return "text-xs px-1 py-0.5"
        case "xs":
            return "text-sm px-1.5 py-1"
        case "sm":
            return "text-sm px-3 py-1.5"
        case "lg":
            return "text-base px-6 py-3"
        default:
            return "text-sm px-4 py-2"
    }
})
</script>
