<template>
    <div class="flex flex-wrap gap-1.5" role="radiogroup">
        <button
            v-for="opt in options"
            :key="String(opt.value)"
            type="button"
            role="radio"
            :aria-checked="modelValue === opt.value"
            :disabled="opt.disabled"
            @click="!opt.disabled && select(opt.value)"
            :class="[
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors duration-100 select-none',
                opt.disabled
                    ? modelValue === opt.value
                        ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                        : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                    : modelValue === opt.value
                        ? opt.activeClass || 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400 cursor-pointer',
            ]"
        >
            {{ opt.label }}
        </button>
    </div>
</template>

<script setup lang="ts">
export interface ToggleGroupOption {
    label: string
    value: string
    /** Classes applied when this option is selected (bg + text + border) */
    activeClass?: string
    /** Prevent selecting this option */
    disabled?: boolean
}

interface Props {
    modelValue: string | undefined
    options: ToggleGroupOption[]
    /** Allow deselecting (click active option to clear). Default: false */
    allowDeselect?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    allowDeselect: false,
})

const emit = defineEmits<{
    "update:modelValue": [value: string | undefined]
}>()

const select = (value: string) => {
    if (props.allowDeselect && props.modelValue === value) {
        emit("update:modelValue", undefined)
    } else {
        emit("update:modelValue", value)
    }
}
</script>
