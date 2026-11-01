<script setup lang="ts">
import { computed } from 'vue'
import type { BillingCycle } from '@/contract'
import type { PricePoint } from '@/contract/commerce'
import type { Currency } from '@/contract/site'
import { useFormat } from '@/shared/composables/format'
import { parseDecimal } from '@/shared/lib/money'

/**
 * Edits prices as a (cycle × currency) grid. An empty cell means "not sold"; every filled cell
 * becomes one PricePoint. Values are exact decimal strings converted to minor units.
 */
const model = defineModel<PricePoint[]>({ required: true })
const props = withDefaults(
  defineProps<{ currencies: Currency[]; cycles?: BillingCycle[]; setup?: boolean }>(),
  {
    cycles: () => ['monthly', 'quarterly', 'semiannually', 'annually', 'biennially', 'triennially'],
    setup: true,
  },
)
const f = useFormat()
const find = (cycle: BillingCycle, currency: string) =>
  model.value.find((p) => p.cycle === cycle && p.currency === currency)
const show = (minor: number | undefined, dec: number) =>
  minor == null ? '' : (minor / 10 ** dec).toFixed(dec)
function edit(cycle: BillingCycle, cur: Currency, field: 'recurring_minor' | 'setup_minor', raw: string) {
  const others = model.value.filter((p) => !(p.cycle === cycle && p.currency === cur.code))
  const existing = find(cycle, cur.code)
  if (field === 'recurring_minor' && raw.trim() === '') return void (model.value = others)
  const minor = raw.trim() === '' ? 0 : parseDecimal(raw, cur.decimal_places)
  if (minor === null) return
  const base: PricePoint = existing ?? {
    cycle,
    currency: cur.code,
    recurring_minor: 0,
    setup_minor: 0,
    decimal_places: cur.decimal_places,
  }
  model.value = [...others, { ...base, [field]: minor, decimal_places: cur.decimal_places }]
}
const invalid = computed(
  () =>
    new Set(
      model.value.filter((p) => !props.currencies.some((c) => c.code === p.currency)).map((p) => p.currency),
    ),
)
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-line">
    <table class="w-full min-w-[520px] text-[13px]">
      <thead>
        <tr class="border-b border-line bg-surface-2 text-xs text-muted">
          <th class="px-3 py-2 text-left font-medium">{{ $t('service.cycle') }}</th>
          <th v-for="c in currencies" :key="c.code" class="px-3 py-2 text-left font-medium">
            {{ c.code
            }}<span v-if="!c.enabled" class="ml-1 text-faint">({{ $t('admin.product.disabled') }})</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cy in cycles" :key="cy" class="border-b border-line last:border-0">
          <td class="px-3 py-2 font-medium whitespace-nowrap">{{ f.cycle(cy) }}</td>
          <td v-for="c in currencies" :key="c.code" class="px-2 py-1.5">
            <div class="flex flex-col gap-1">
              <input
                :value="show(find(cy, c.code)?.recurring_minor, c.decimal_places)"
                inputmode="decimal"
                :placeholder="$t('admin.product.notSold')"
                class="num h-8 w-full min-w-24 rounded-md border border-line bg-surface px-2 outline-none placeholder:text-faint focus:border-primary"
                :aria-label="`${f.cycle(cy)} ${c.code}`"
                @change="edit(cy, c, 'recurring_minor', ($event.target as HTMLInputElement).value)"
              />
              <input
                v-if="setup && find(cy, c.code)"
                :value="show(find(cy, c.code)?.setup_minor, c.decimal_places)"
                inputmode="decimal"
                :placeholder="$t('admin.product.setupFee')"
                class="num h-7 w-full rounded-md border border-dashed border-line bg-transparent px-2 text-xs outline-none placeholder:text-faint focus:border-primary"
                :aria-label="`${f.cycle(cy)} ${c.code} setup`"
                @change="edit(cy, c, 'setup_minor', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="invalid.size" class="border-t border-line px-3 py-2 text-xs text-warning">
      {{ $t('admin.product.unknownCurrency', { list: [...invalid].join(', ') }) }}
    </p>
  </div>
</template>
