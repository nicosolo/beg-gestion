<template>
    <section :class="['rounded-lg border shadow-sm overflow-hidden', highlight ? 'border-yellow-300 bg-white' : 'border-gray-200 bg-white']">
        <div
            v-if="title || $slots.header || $slots.title"
            :class="['flex items-center p-3 border-b border-gray-200', !highlight ? 'bg-gray-200/50' : 'bg-yellow-50 border-yellow-300']"
        >
            <slot name="header">
                <h3 class="text-sm font-medium text-gray-900">
                    <slot name="title">{{ title }}</slot>
                </h3>
            </slot>
        </div>
        <div :class="['p-3', contentClass]">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        title?: string
        contentClass?: string
        highlight?: boolean
    }>(),
    {
        title: "",
        contentClass: "",
    }
)
</script>
