<template>
    <div class="relative">
        <input
            :id="id"
            autocomplete="off"
            v-model="searchTerm"
            :placeholder="placeholder"
            :disabled="disabled"
            :required="required"
            @input="handleInput"
            @focus="handleFocus"
            @blur="handleBlur"
            @keydown="handleKeyDown"
            :ref="(el) => (inputRef = el as HTMLInputElement)"
            :class="[
                'w-full h-9 px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
                className,
            ]"
        />

        <!-- Loading spinner (only for async mode) -->
        <div v-if="loading" class="absolute right-2 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner size="md" color="gray" />
        </div>

        <!-- Dropdown -->
        <div
            v-if="showDropdown"
            class="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-h-30 max-h-60 overflow-auto"
        >
            <!-- Min search length hint (async mode only) -->
            <div
                v-if="
                    mode === 'async' &&
                    minSearchLength &&
                    searchTerm.length > 0 &&
                    searchTerm.length < minSearchLength
                "
                class="px-3 py-2 text-gray-500"
            >
                {{ $t("common.typeMinChars", { count: minSearchLength }) }}
            </div>

            <!-- Loading state in dropdown (including debounce period) -->
            <div
                v-else-if="(loading || isPendingSearch) && filteredItems.length === 0"
                class="px-3 py-2 text-gray-500 flex items-center gap-2"
            >
                <LoadingSpinner size="sm" color="gray" />
                {{ $t("common.loading") }}
            </div>

            <!-- No results (only for async mode, static mode always shows full list when no match) -->
            <div
                v-else-if="filteredItems.length === 0 && searchTerm.length > 0"
                class="px-3 py-2 text-gray-500"
            >
                {{ $t("common.noResults") }}
            </div>

            <!-- Options -->
            <button
                v-for="(item, index) in filteredItems"
                :key="getItemValue(item)"
                @mousedown.prevent="selectItem(item)"
                @mouseenter="focusedIndex = index"
                :class="[
                    'w-full px-3 py-2 text-left focus:outline-none',
                    focusedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-100',
                ]"
            >
                <slot name="item" :item="item">
                    <div class="font-medium">
                        {{ displayField(item) }}
                    </div>
                </slot>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue"
import { useI18n } from "vue-i18n"
import LoadingSpinner from "@/components/atoms/LoadingSpinner.vue"

interface AutocompleteSelectProps {
    modelValue: number | string | undefined | null
    id?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    className?: string
    mode?: "async" | "static"
    // For async mode
    items?: any[]
    loading?: boolean
    fetchFunction?: (searchText: string) => Promise<void>
    minSearchLength?: number
    // For static mode
    options?: any[]
    searchFields?: string[]
    filterFunction?: (item: any, searchText: string) => boolean
    clearOnSelect?: boolean
    // Common display props
    displayField: (item: any) => string
    valueField?: string
    fallback?: string
}

const props = withDefaults(defineProps<AutocompleteSelectProps>(), {
    mode: "static",
    valueField: "id",
    searchFields: () => [],
    fallback: "",
    clearOnSelect: false,
})

const emit = defineEmits<{
    "update:modelValue": [value: number | string | undefined | null]
}>()

const {} = useI18n()

// State
const searchTerm = ref("")
const showDropdown = ref(false)
const selectedItemDisplay = ref("")
const focusedIndex = ref(0)
const inputRef = ref<HTMLInputElement>()
const debouncedSearchTerm = ref("")
const isPendingSearch = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Get item value
const getItemValue = (item: any): number | string => {
    return item[props.valueField!]
}

// Filter items based on mode and search term
const filteredItems = computed(() => {
    if (props.mode === "async") {
        return props.items || []
    } else {
        // Static mode filtering
        if (!props.options) return []

        const item = props.options.find((i) => getItemValue(i) === props.modelValue)

        if (item && searchTerm.value.trim() === props.displayField(item)) {
            return props.options
        }
        if (!debouncedSearchTerm.value.trim()) {
            return props.options
        }

        const search = debouncedSearchTerm.value.toLowerCase().trim()

        let filtered: any[] = []

        // Use custom filter function if provided
        if (props.filterFunction) {
            filtered = props.options.filter((item) => props.filterFunction!(item, search))
        } else {
            // Default filtering using searchFields
            filtered = props.options.filter((item) => {
                // If no search fields specified, search in display field
                if (!props.searchFields || props.searchFields.length === 0) {
                    return props.displayField(item).toLowerCase().includes(search)
                }

                // Search in specified fields
                return props.searchFields.some((field) => {
                    const value = item[field]
                    if (typeof value === "string") {
                        return value.toLowerCase().includes(search)
                    }
                    return false
                })
            })
        }

        return filtered
    }
})

// Handle input with debouncing for async mode
const handleInput = async (e: Event) => {
    const inputEvent = e as InputEvent
    selectedItemDisplay.value = ""
    focusedIndex.value = 0
    showDropdown.value = true

    // Clear the modelValue when user starts typing
    if (props.modelValue) {
        emit("update:modelValue", null)
        await nextTick()
        searchTerm.value = inputEvent.data || ""
    }

    // Clear previous debounce timer
    if (debounceTimer) {
        clearTimeout(debounceTimer)
    }

    // For static mode, update debounced search immediately
    if (props.mode === "static") {
        debouncedSearchTerm.value = searchTerm.value
    } else {
        // For async mode, debounce the search
        const meetsMinLength =
            !props.minSearchLength || searchTerm.value.length >= props.minSearchLength
        isPendingSearch.value = meetsMinLength
        debounceTimer = setTimeout(async () => {
            debouncedSearchTerm.value = searchTerm.value
            if (props.fetchFunction) {
                await props.fetchFunction(searchTerm.value)
                isPendingSearch.value = false
                // Check if we should auto-select after fetch
                await nextTick()
                if (
                    filteredItems.value.length === 1 &&
                    searchTerm.value.trim() &&
                    !props.modelValue &&
                    showDropdown.value
                ) {
                    selectItem(filteredItems.value[0])
                }
            } else {
                isPendingSearch.value = false
            }
        }, 300)
    }
}

// Handle focus
const handleFocus = () => {
    showDropdown.value = true

    // For async mode, fetch initial data if empty
    if (
        props.mode === "async" &&
        props.fetchFunction &&
        (!props.items || props.items.length === 0)
    ) {
        props.fetchFunction("")
    }
}

// Handle keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
        case "ArrowDown":
            event.preventDefault()
            if (!showDropdown.value) {
                showDropdown.value = true
            } else if (filteredItems.value.length > 0) {
                focusedIndex.value = Math.min(
                    focusedIndex.value + 1,
                    filteredItems.value.length - 1
                )
            }
            break
        case "ArrowUp":
            event.preventDefault()
            if (showDropdown.value && filteredItems.value.length > 0) {
                focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
            }
            break
        case "Enter":
            event.preventDefault()
            if (showDropdown.value && filteredItems.value[focusedIndex.value]) {
                selectItem(filteredItems.value[focusedIndex.value])
            }
            break
        case "Escape":
            event.preventDefault()
            if (showDropdown.value) {
                showDropdown.value = false
                focusedIndex.value = 0
            }
            break
    }
}

// Handle blur
const handleBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
        showDropdown.value = false
        focusedIndex.value = 0
    }, 200)
}

// Select item
const selectItem = (item: any) => {
    if (props.clearOnSelect) {
        searchTerm.value = ""
        debouncedSearchTerm.value = ""
    } else {
        selectedItemDisplay.value = props.displayField(item)
        searchTerm.value = selectedItemDisplay.value
        debouncedSearchTerm.value = searchTerm.value
    }
    emit("update:modelValue", getItemValue(item))
    inputRef.value?.blur()
    showDropdown.value = false
    focusedIndex.value = 0
}

// Load initial item if modelValue is set
const loadInitialItem = () => {
    if (!props.modelValue) return

    const items = props.mode === "async" ? props.items : props.options
    if (!items) return

    const item = items.find((i) => getItemValue(i) === props.modelValue)
    if (item) {
        selectedItemDisplay.value = props.displayField(item)
        searchTerm.value = selectedItemDisplay.value
        debouncedSearchTerm.value = searchTerm.value
    } else {
        searchTerm.value = props.fallback || ""
    }
}

// Watch for modelValue changes
watch(
    () => props.modelValue,
    async (newValue) => {
        if (!newValue) {
            selectedItemDisplay.value = ""
            searchTerm.value = ""
            debouncedSearchTerm.value = ""
        } else {
            loadInitialItem()
        }
    }
)

// Watch for items/options changes
watch(
    () => (props.mode === "async" ? props.items : props.options),
    () => {
        loadInitialItem()
    }
)

// Auto-select when only one item is available
watch(filteredItems, (items) => {
    // Only auto-select if:
    // 1. There's exactly one item
    // 2. User has typed something (not on initial load)
    // 3. No item is currently selected
    // 4. Dropdown is shown
    if (items.length === 1 && searchTerm.value.trim() && !props.modelValue && showDropdown.value) {
        // Auto-select the single item
        selectItem(items[0])
    }
})

// Cleanup on unmount
onMounted(() => {
    return () => {
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
    }
})
</script>
