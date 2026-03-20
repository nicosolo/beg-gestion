<template>
    <div :class="['shadow-md rounded-lg p-4', highlight && 'bg-yellow-100/80']">
        <slot />
    </div>
</template>

<script setup lang="ts">
defineProps<{
    highlight?: boolean
}>()
</script>
