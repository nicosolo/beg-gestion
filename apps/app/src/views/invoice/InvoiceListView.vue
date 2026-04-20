<template>
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">{{ $t("invoice.title") }}</h1>
        <div class="flex gap-2">
            <DropdownMenu>
                <template #trigger="{ toggle }">
                    <Button variant="secondary" size="md" :disabled="exportLoading" @click="toggle">
                        {{
                            exportLoading
                                ? $t("invoice.export.exporting")
                                : $t("invoice.export.button")
                        }}
                    </Button>
                </template>
                <template #items="{ close }">
                    <button
                        @click="
                            () => {
                                triggerExport(false)
                                close()
                            }
                        "
                        class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                        role="menuitem"
                        type="button"
                    >
                        {{ $t("invoice.export.all") }}
                    </button>
                    <button
                        @click="
                            () => {
                                triggerExport(true)
                                close()
                            }
                        "
                        class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                        role="menuitem"
                        type="button"
                    >
                        {{ $t("invoice.export.perUser") }}
                    </button>
                </template>
            </DropdownMenu>
        </div>
    </div>

    <InvoiceListManager ref="managerRef" :hide-header="true" :show-delete="false" />
</template>

<script setup lang="ts">
defineOptions({ name: "InvoiceListView" })

import { onMounted, ref, computed } from "vue"
import InvoiceListManager from "@/components/organisms/invoice/InvoiceListManager.vue"
import Button from "@/components/atoms/Button.vue"
import DropdownMenu from "@/components/atoms/DropdownMenu.vue"

const managerRef = ref<InstanceType<typeof InvoiceListManager> | null>(null)

const exportLoading = computed(() => managerRef.value?.exportLoading ?? false)

const triggerExport = (perUser: boolean) => {
    managerRef.value?.handleExport(perUser)
}

onMounted(() => {
    document.title = "BEG - Factures"
})
</script>
