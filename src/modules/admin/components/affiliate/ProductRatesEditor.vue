<script setup lang="ts">
import { computed } from 'vue'
import { api } from '@/contract/admin-endpoints'
import { useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
const rows = defineModel<{ product_id: string; percent: string }[]>({ required: true })
const session = useSession()
const products = useApiQuery(api.admin.products, {}, { enabled: () => session.can('products.read') })
const f = useFormat()
const options = computed(
  () => products.data.value?.map((p) => ({ value: p.id, label: f.text(p.name) })) ?? [],
)
</script>
<template>
  <div>
    <p class="mb-4 text-xs text-muted">{{ $t('affAdmin.precedence') }}</p>
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
    >
      <UiField :label="$t('affAdmin.product')"
        ><template #default="{ id }">
          <UiSelect v-if="options.length" :id="id" v-model="row.product_id" :options="options" />
          <UiInput v-else :id="id" v-model="row.product_id" required /> </template
      ></UiField>
      <UiField :label="$t('affAdmin.rate')"
        ><template #default="{ id }"
          ><UiInput :id="id" v-model="row.percent" inputmode="decimal" required
            ><template #suffix>%</template></UiInput
          ></template
        ></UiField
      >
      <UiButton
        variant="ghost"
        :aria-label="$t('affAdmin.removeRow', { row: index + 1 })"
        @click="rows.splice(index, 1)"
        >{{ $t('common.remove') }}</UiButton
      >
    </div>
    <UiButton size="sm" @click="rows.push({ product_id: '', percent: '' })">{{
      $t('affAdmin.add')
    }}</UiButton>
  </div>
</template>
