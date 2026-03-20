<template>
    <div :class="['bg-white drop-shadow-md rounded-lg p-2 bg-red-600', highlight && 'bg-yellow-100/80']">
        <slot />
    </div>
</template>

<script setup lang="ts">
defineProps<{
    highlight?: boolean
}>()
</script>
