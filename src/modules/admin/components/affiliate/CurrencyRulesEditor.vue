<script setup lang="ts">
import { computed } from 'vue'
import { useSite } from '@/shared/composables/site'
import UiButton from '@/shared/ui/UiButton.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
const rows = defineModel<{ currency: string; amount: string }[]>({ required: true })
defineProps<{ label: string; hint: string }>()
const site = useSite()
const currencies = computed(() => site.currencies.data.value?.currencies ?? [])
</script>
<template>
  <section class="min-w-0">
    <h3 class="text-sm font-medium">{{ label }}</h3>
    <p class="mt-1 mb-3 text-xs text-muted">{{ hint }}</p>
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="mb-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
    >
      <UiField :label="$t('auth.currency')"
        ><template #default="{ id }"
          ><UiSelect
            :id="id"
            v-model="row.currency"
            :options="currencies.map((c) => ({ value: c.code, label: c.code }))" /></template
      ></UiField>
      <UiField :label="$t('affAdmin.amount')"
        ><template #default="{ id }"
          ><UiInput :id="id" v-model="row.amount" inputmode="decimal" required /></template
      ></UiField>
      <UiButton
        variant="ghost"
        :aria-label="$t('affAdmin.removeRow', { row: index + 1 })"
        @click="rows.splice(index, 1)"
        >{{ $t('common.remove') }}</UiButton
      >
    </div>
    <UiButton size="sm" @click="rows.push({ currency: site.currency.value, amount: '' })">{{
      $t('affAdmin.add')
    }}</UiButton>
  </section>
</template>
