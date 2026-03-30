<template>
    <DateField
        v-if="colKey === 'date'"
        class="w-full"
        input-class-name="!px-1"
        v-model="quickAdd.date"
    />
    <ProjectSelect
        v-else-if="colKey === 'project'"
        v-model="quickAdd.projectId"
        :class-name="'w-full' + (qaInvalid('project') ? ' !border-red-500' : '')"
    />
    <ActivityTypeSelect
        v-else-if="colKey === 'activityType'"
        v-model="quickAdd.activityTypeId"
        :class-name="'w-full !px-1' + (qaInvalid('activityType') ? ' !border-red-500' : '')"
    />
    <InputNumber
        v-else-if="colKey === 'duration'"
        v-model.number="quickAdd.duration"
        type="time"
        :min="0"
        :class="'w-full bg-white' + (qaInvalid('duration') ? ' !border-red-500' : '')"
    />
    <InputNumber
        v-else-if="colKey === 'kilometers'"
        v-model.number="quickAdd.kilometers"
        type="distance"
        :min="0"
        class="w-full bg-white"
    />
    <InputNumber
        v-else-if="colKey === 'expenses'"
        v-model.number="quickAdd.expenses"
        type="amount"
        :min="0"
        class="w-full bg-white"
    />
    <input
        v-else-if="colKey === 'description'"
        v-model="quickAdd.description"
        type="text"
        :placeholder="$t('time.columns.description')"
        :class="[
            'w-full h-9 pl-3 pr-8 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white',
            qaInvalid('description') ? 'border-red-500' : 'border-gray-300',
        ]"
    />
    <div v-else-if="colKey === 'actions'" class="flex justify-end w-full">
        <Button
            full-width
            type="submit"
            variant="primary"
            size="sm"
            :loading="quickAddSaving"
            :disabled="!quickAddValid"
        >
            {{ $t("common.create") }}
        </Button>
    </div>
</template>

<script setup lang="ts">
import DateField from "@/components/molecules/DateField.vue"
import ProjectSelect from "@/components/organisms/project/ProjectSelect.vue"
import ActivityTypeSelect from "@/components/organisms/activityType/ActivityTypeSelect.vue"
import InputNumber from "@/components/atoms/InputNumber.vue"
import Button from "@/components/atoms/Button.vue"
import type { ActivityCreateInput } from "@beg/validations"

defineProps<{
    colKey: string
    qaInvalid: (field: string) => boolean
    quickAddSaving?: boolean
    quickAddValid?: boolean
}>()

const quickAdd = defineModel<ActivityCreateInput>("quickAdd", { required: true })
</script>
