<template>
    <div class="bg-white rounded-md shadow">
        <div v-if="items.length === 0" class="p-8 text-center">
            <p class="text-gray-500">{{ emptyMessage }}</p>
        </div>
        <div v-else>
            <!-- Header row (visible only on desktop) -->
            <div
                class="hidden md:grid border-b border-gray-200 sticky top-12 bg-white z-[5]"
                :style="{ gridTemplateColumns }"
            >
                <div
                    v-for="column in columns"
                    :key="column.key"
                    :class="[
                        'px-3 py-3 text-sm font-medium text-gray-500 tracking-wider border-r border-gray-200 last:border-r-0',
                        column.sortKey && 'cursor-pointer hover:bg-gray-100 transition-colors',
                    ]"
                    @click="handleSort(column)"
                >
                    <TruncateWithTooltip
                        :content="column.label"
                        placement="bottom"
                    >
                        <div class="flex items-center space-x-2 min-w-0">
                            <span class="truncate">{{ column.label }}</span>
                            <span v-if="column.sortKey" class="ml-auto flex-shrink-0">
                                <SortIcon :direction="getSortDirection(column)" />
                            </span>
                        </div>
                    </TruncateWithTooltip>
                </div>
            </div>

            <!-- Data rows -->
            <div class="divide-y divide-gray-200 md:divide-y md:divide-gray-200">
                <component
                    v-for="(item, index) in items"
                    :key="getItemKey(item, index)"
                    :is="rowLink && rowLink(item) ? RouterLink : 'div'"
                    :to="rowLink && rowLink(item)"
                    :data-row-link="rowLink && rowLink(item) ? true : undefined"
                    :class="[
                        'block cursor-pointer transition-colors',
                        'border-b-1 border-gray-200 last:border-b-0',
                        selectedRows && selectedRows.has(getItemKey(item, index))
                            ? 'bg-blue-100 hover:bg-blue-200'
                            : 'hover:bg-gray-100',
                        getRowClass(item, index),
                    ]"
                    @click="handleRowClick(item, index, $event)"
                    @mousedown="handleMouseDown($event)"
                >
                    <div class="flex flex-col md:hidden shadow-sm">
                        <!-- Mobile view keeps existing layout -->
                        <div
                            v-for="column in columns"
                            :key="column.key"
                            class="border-b border-gray-100/50 last:border-b-0"
                        >
                            <div class="flex">
                                <div
                                    v-if="!column.actions && !column.fullWidth"
                                    class="px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2"
                                >
                                    {{ column.label }}
                                </div>
                                <div class="px-3 py-2 flex-1">
                                    <div
                                        v-if="column.fullWidth"
                                        class="text-xs font-medium text-gray-500 uppercase tracking-wider -mx-1"
                                    >
                                        {{ column.label }}
                                    </div>
                                    <slot
                                        :name="`cell:${column.key}`"
                                        :item="item"
                                        :column="column"
                                    >
                                        {{ getItemValue(item, column) }}
                                    </slot>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="hidden md:grid" :style="{ gridTemplateColumns }">
                        <div
                            v-for="column in columns"
                            :key="column.key"
                            :class="[
                                'px-2 py-0.5 border-r border-gray-200 last:border-r-0 overflow-hidden',
                            ]"
                        >
                            <slot :name="`cell:${column.key}`" :item="item" :column="column">
                                <TruncateWithTooltip
                                    :content="getItemValue(item, column)"
                                    v-if="column.tooltip"
                                    :placement="column.tooltipPlacement || 'left'"
                                />
                                <span v-else>
                                    {{ getItemValue(item, column) }}
                                </span>
                            </slot>
                        </div>
                    </div>
                </component>
            </div>

            <!-- Footer row with totals -->
            <div v-if="showFooter" class="border-t-3 border-gray-300 bg-gray-50">
                <!-- Mobile footer -->
                <div class="flex flex-col md:hidden">
                    <div
                        v-for="column in columns"
                        :key="`total-mobile-${column.key}`"
                        class="flex border-b border-gray-200 last:border-b-0"
                    >
                        <div
                            class="px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2"
                        >
                            {{ column.label }}
                        </div>
                        <div class="px-3 py-2 font-medium flex-1">
                            <slot :name="`total:${column.key}`" :column="column"> </slot>
                        </div>
                    </div>
                </div>
                <!-- Desktop footer with grid -->
                <div class="hidden md:grid" :style="{ gridTemplateColumns }">
                    <div
                        v-for="column in columns"
                        :key="`total-${column.key}`"
                        class="px-3 py-2 font-medium border-r border-gray-200 last:border-r-0"
                    >
                        <slot :name="`total:${column.key}`" :column="column"> </slot>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" generic="T = unknown">
import { computed, ref, watch } from "vue"
import { RouterLink } from "vue-router"
import SortIcon from "../atoms/SortIcon.vue"
import TruncateWithTooltip from "../atoms/TruncateWithTooltip.vue"
import type { RouteLocationRaw } from "vue-router"
export interface Column {
    key: string
    label: string
    nowrap?: boolean
    width?:
        | "w-1/2"
        | "w-2/3"
        | "w-2/4"
        | "w-1/3"
        | "w-1/4"
        | "w-1/5"
        | "w-1/6"
        | "w-1/12"
        | "w-2/4"
        | "w-2/5"
        | "w-2/6"
        | "w-2/12"
        | string
    minWidth?: string // e.g., "100px", "8rem"
    maxWidth?: string // e.g., "300px", "20rem"
    size?:
        | "2xs"
        | "xs"
        | "sm"
        | "md"
        | "lg"
        | "xl"
        | "2xl"
        | "3xl"
        | "flex-sm"
        | "flex"
        | "flex-lg"
        | "auto"
        | "min"
        | "icon"
        | "action"
        | "id"
        | "date"
        | "status"
        | "number"
        | "amount"
        | "name"
        | "email"
    actions?: boolean
    fullWidth?: boolean
    sortKey?: string
    tooltip?: boolean
    tooltipPlacement?: "top" | "bottom" | "left" | "right"
}

interface Props<T = unknown> {
    items: T[]
    columns: Column[]
    itemKey?: keyof T | string
    emptyMessage?: string
    showFooter?: boolean
    sort?: { key: string; direction: "asc" | "desc" }
    selectedRows?: Set<string | number>
    rowClass?: (item: T, index: number) => string | undefined
    selectable?: boolean
    modelValue?: Set<string | number>
    rowLink?: (item: T) => RouteLocationRaw | undefined
}
const emit = defineEmits<{
    (e: "sort-change", sort: { key: string; direction: "asc" | "desc" }): void
    (e: "row-click", item: T, index: number, event: MouseEvent): void
    (e: "update:modelValue", selection: Set<string | number>): void
    (e: "selection-change", selection: Set<string | number>): void
}>()
const {
    items,
    columns,
    itemKey,
    emptyMessage = "No items found",
    showFooter = false,
    sort,
    selectedRows: externalSelectedRows,
    rowClass,
    selectable = false,
    modelValue,
    rowLink,
} = defineProps<Props<T>>()

// Internal selection state
const internalSelection = ref<Set<string | number>>(new Set())
const lastClickedIndex = ref<number | null>(null)

// Use either v-model or internal state for selection
const selectedRows = computed(() => {
    if (modelValue !== undefined) {
        return modelValue
    }
    if (externalSelectedRows !== undefined) {
        return externalSelectedRows
    }
    return selectable ? internalSelection.value : undefined
})

// Watch for external selection changes
watch(
    () => modelValue,
    (newValue) => {
        if (newValue !== undefined) {
            internalSelection.value = new Set(newValue)
        }
    },
    { immediate: true }
)

// Generate grid template columns based on column widths
const gridTemplateColumns = computed(() => {
    return columns
        .map((col) => {
            // Priority 1: Use size presets if specified
            if (col.size) {
                const sizeMap: Record<string, string> = {
                    // Absolute sizes (progressively larger)
                    "2xs": "minmax(50px, 70px)", // Icons, checkboxes
                    xs: "minmax(70px, 100px)", // Short IDs, codes
                    sm: "minmax(100px, 150px)", // Dates, small badges
                    md: "minmax(150px, 220px)", // Names, medium text
                    lg: "minmax(200px, 300px)", // Emails, longer text
                    xl: "minmax(250px, 400px)", // Descriptions
                    "2xl": "minmax(300px, 500px)", // Long descriptions
                    "3xl": "minmax(400px, 1fr)", // Very long content

                    // Flexible sizes (grow/shrink with available space)
                    "flex-sm": "minmax(120px, 0.8fr)", // Smaller flex
                    flex: "minmax(200px, 1fr)", // Standard flex
                    "flex-lg": "minmax(200px, 1.5fr)", // Larger flex

                    // Content-based
                    auto: "auto", // Fits content exactly
                    min: "min-content", // Minimum content width

                    // Semantic/task-specific sizes
                    icon: "minmax(40px, 50px)", // Icon columns
                    action: "minmax(150px, 180px)", // Action buttons
                    amount: "minmax(80px, 120px)", // Action buttons
                    id: "minmax(60px, 90px)", // ID columns
                    date: "minmax(80px, 110px)", // Date columns
                    status: "minmax(80px, 130px)", // Status badges
                    number: "minmax(70px, 120px)", // Numeric values
                    name: "minmax(150px, 250px)", // Name columns
                    email: "minmax(180px, 280px)", // Email columns
                    checkbox: "minmax(30px, 40px)", // Checkbox columns
                }
                return sizeMap[col.size]
            }

            // Priority 2: Use minWidth/maxWidth if specified
            if (col.minWidth || col.maxWidth) {
                const min = col.minWidth || "0"
                const max = col.maxWidth || "1fr"
                return `minmax(${min}, ${max})`
            }

            // Priority 3: Convert old Tailwind classes to modern equivalents
            if (col.width) {
                const widthMap: Record<string, string> = {
                    "w-1/2": "minmax(200px, 50%)",
                    "w-2/3": "minmax(250px, 66.66%)",
                    "w-2/4": "minmax(200px, 50%)",
                    "w-1/3": "minmax(150px, 33.33%)",
                    "w-1/4": "minmax(120px, 25%)",
                    "w-1/5": "minmax(100px, 20%)",
                    "w-1/6": "minmax(100px, 16.66%)",
                    "w-1/12": "minmax(80px, 8.33%)",
                    "w-2/5": "minmax(150px, 40%)",
                    "w-2/6": "minmax(150px, 33.33%)",
                    "w-2/12": "minmax(100px, 16.66%)",
                    "w-24": "minmax(96px, 96px)",
                    "w-30": "minmax(120px, 120px)",
                    "flex-1": "1fr",
                }
                return widthMap[col.width] || col.width
            }

            // Default: flexible column
            return "minmax(100px, 1fr)"
        })
        .join(" ")
})

// Get a unique key for each item
const getItemKey = (item: T, index: number): string | number => {
    if (itemKey && item[itemKey as keyof T] !== undefined) {
        return item[itemKey as keyof T] as string | number
    }
    return index
}

// Get the value for a cell based on the column key
const getItemValue = (item: T, column: Column): string => {
    const value = item[column.key as keyof T]

    if (value === undefined || value === null) {
        return ""
    }

    return String(value)
}

// Handle column header click for sorting
const handleSort = (column: Column) => {
    if (!sort || !column.sortKey) return

    const sortKey = column.sortKey || column.key
    // Toggle direction if clicking the same column, otherwise default to asc
    if (sort.key === sortKey) {
        emit("sort-change", {
            key: sortKey,
            direction: sort.direction === "asc" ? "desc" : "asc",
        })
    } else {
        emit("sort-change", {
            key: sortKey,
            direction: "asc",
        })
    }
}

// Handle row click
const handleRowClick = (item: T, index: number, event: MouseEvent) => {
    // If clicking on a button or link inside the row, stop propagation
    const target = event.target as HTMLElement
    const interactiveElement = target.closest(
        'button, a[href]:not([data-row-link]), [role="button"]'
    )

    if (interactiveElement) {
        // Allow anchors to keep their default navigation (e.g. external links)
        if (interactiveElement instanceof HTMLAnchorElement) {
            event.stopPropagation()
            return
        }

        // Prevent buttons or other controls from triggering row navigation
        event.preventDefault()
        event.stopPropagation()
        return
    }

    // Ignore click if user has selected text
    if (window.getSelection()?.toString()) {
        event.preventDefault()
        return
    }

    // Handle selection if enabled
    if (selectable || modelValue !== undefined || externalSelectedRows !== undefined) {
        // Prevent navigation when selecting with modifier keys
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
            event.preventDefault()
        }
        handleSelection(item, index, event)
    }

    // If no rowLink, emit row-click event
    if (!rowLink || !rowLink(item)) {
        emit("row-click", item, index, event)
    }
}

// Handle selection logic
const handleSelection = (item: T, index: number, event: MouseEvent) => {
    const itemId = getItemKey(item, index)
    const currentSelection = selectedRows.value || new Set()
    const newSelection = new Set(currentSelection)

    if (event.shiftKey && lastClickedIndex.value !== null) {
        // Shift+click: select range
        const start = Math.min(lastClickedIndex.value, index)
        const end = Math.max(lastClickedIndex.value, index)

        for (let i = start; i <= end; i++) {
            if (items[i]) {
                newSelection.add(getItemKey(items[i], i))
            }
        }
    } else if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd+click: toggle single selection
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId)
        } else {
            newSelection.add(itemId)
        }
    } else {
        // Regular click: select only this row
        newSelection.clear()
        newSelection.add(itemId)
    }

    // Update selection
    if (modelValue !== undefined) {
        emit("update:modelValue", newSelection)
    } else if (selectable) {
        internalSelection.value = newSelection
    }

    emit("selection-change", newSelection)
    lastClickedIndex.value = index
}

// Clear selection
const clearSelection = () => {
    const newSelection = new Set<string | number>()

    if (modelValue !== undefined) {
        emit("update:modelValue", newSelection)
    } else if (selectable) {
        internalSelection.value = newSelection
    }

    emit("selection-change", newSelection)
    lastClickedIndex.value = null
}

// Get selected items
const getSelectedItems = (): T[] => {
    const selection = selectedRows.value
    if (!selection) return []

    return items.filter((item, index) => selection.has(getItemKey(item, index)))
}

// Expose methods for parent components
defineExpose({
    clearSelection,
    getSelectedItems,
    selectedRows: selectedRows,
})

// Handle mousedown to prevent text selection on shift+click
const handleMouseDown = (event: MouseEvent) => {
    // Only prevent text selection when shift key is pressed
    if (event.shiftKey) {
        event.preventDefault()
    }
}

// Get sort direction for a column
const getSortDirection = (column: Column): "asc" | "desc" | "none" => {
    if (!sort || !column.sortKey) return "none"

    const sortKey = column.sortKey || column.key
    if (sort.key !== sortKey) return "none"

    return sort.direction
}

// Get row style based on rowColor function
const getRowClass = (item: T, index: number): string | string[] | undefined => {
    // If row is selected, don't apply custom color (selection takes priority)
    const selection = selectedRows.value
    if (selection && selection.has(getItemKey(item, index))) {
        return
    }

    // Apply custom color if rowColor function is provided
    if (rowClass) {
        return rowClass(item, index)
    }

    return
}
</script>
