<template>
    <div :class="wrapperClass">
        <div class="border-b border-gray-200">
            <nav class="flex flex-wrap gap-2 -mb-px" :class="navClass">
                <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    type="button"
                    :class="[
                        'py-4 px-6 font-medium text-sm cursor-pointer shrink-0',
                        modelValue === tab.value
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]"
                    @click="emit('update:modelValue', tab.value)"
                >
                    {{ tab.label }}
                </button>
            </nav>
        </div>
    </div>
</template>

<script setup lang="ts">
export interface Tab {
    value: string
    label: string
}

withDefaults(
    defineProps<{
        modelValue: string
        tabs: Tab[]
        wrapperClass?: string
        navClass?: string
    }>(),
    {
        wrapperClass: "",
        navClass: "",
    }
)

const emit = defineEmits<{
    "update:modelValue": [value: string]
}>()
</script>
