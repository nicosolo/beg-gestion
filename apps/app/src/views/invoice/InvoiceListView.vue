<template>
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">{{ $t("invoice.title") }}</h1>
    </div>

    <InvoiceListManager :hide-header="true" :show-delete="false" />
</template>

<script setup lang="ts">
defineOptions({ name: "InvoiceListView" })

import { onMounted } from "vue"
import InvoiceListManager from "@/components/organisms/invoice/InvoiceListManager.vue"

onMounted(() => {
    document.title = "BEG - Factures"
})
</script>
