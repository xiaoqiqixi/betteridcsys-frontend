<script setup lang="ts">
import { ArrowDown, ArrowUp } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@/contract/client-endpoints'
import type { Service } from '@/contract/commerce'
import { api as client } from '@/shared/api'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ service: Service }>()
const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const f = useFormat()
const errors = useErrorText()
const options = useApiQuery(api.services.upgradeOptions, () =>
  open.value ? { params: { id: props.service.id } } : null,
)
const target = ref<string | null>(null)
watch(open, (o) => o && (target.value = null))
const quote = useQuery({
  queryKey: computed(() => ['upgrade-quote', props.service.id, target.value]),
  queryFn: ({ signal }) =>
    client().call(api.services.upgradeQuote, {
      params: { id: props.service.id },
      body: { target_product_id: target.value! },
      signal,
    }),
  enabled: computed(() => open.value && !!target.value),
  retry: false,
})
const upgrade = useApiMutation(api.services.upgrade, {
  invalidates: [api.services.get, api.services.list, api.billing.invoices, api.billing.credit],
  onSuccess: async (r) => {
    open.value = false
    if (r.status === 'invoice') await router.push({ name: 'invoice', params: { id: r.invoice.id } })
    else toast.success(t('service.upgradeScheduled'))
  },
})
function submit() {
  if (!target.value || !quote.data.value) return
  upgrade.mutate({
    params: { id: props.service.id },
    body: { target_product_id: target.value, quote_digest: quote.data.value.quote_digest },
  })
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    :title="$t('service.changePlan')"
    :description="$t('service.changePlanBody')"
    size="lg"
  >
    <UiSkeleton v-if="options.isPending.value" :lines="4" />
    <p v-else-if="options.isError.value" class="text-[13px] text-danger">
      {{ errors.text(options.error.value) }}
    </p>
    <p v-else-if="!options.data.value?.length" class="py-6 text-center text-[13px] text-muted">
      {{ $t('service.noPlanChanges') }}
    </p>
    <div v-else class="grid gap-2" role="radiogroup">
      <button
        v-for="o in options.data.value"
        :key="o.product_id"
        type="button"
        role="radio"
        :disabled="!o.available"
        :aria-checked="target === o.product_id"
        :class="[
          'flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-50',
          target === o.product_id
            ? 'border-primary bg-primary-soft ring-1 ring-primary'
            : 'border-line hover:border-line-strong',
        ]"
        @click="target = o.product_id"
      >
        <span
          :class="[
            'grid size-8 shrink-0 place-items-center rounded-md',
            o.direction === 'upgrade' ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-muted',
          ]"
        >
          <ArrowUp v-if="o.direction === 'upgrade'" class="size-4" /><ArrowDown v-else class="size-4" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium">{{ o.product_name }}</span>
          <span class="block text-xs text-muted"
            >{{ o.specs.cpu_cores }} vCPU · {{ f.memory(o.specs.memory_mb) }} · {{ o.specs.disk_gb }} GB ·
            {{ f.bandwidth(o.specs.bandwidth_mbps) }}</span
          >
        </span>
        <span class="text-right">
          <span class="num block text-sm font-semibold"
            >{{ f.money(o.recurring)
            }}<span class="text-xs font-normal text-muted"> / {{ f.per(service.cycle) }}</span></span
          >
        </span>
      </button>
    </div>
    <div v-if="target" class="mt-4 rounded-lg border border-line bg-surface-2 p-4 text-[13px]">
      <UiSkeleton v-if="quote.isPending.value" :lines="2" />
      <p v-else-if="quote.isError.value" class="text-danger">{{ errors.text(quote.error.value) }}</p>
      <template v-else-if="quote.data.value">
        <div class="flex items-center justify-between">
          <span class="text-muted">{{
            quote.data.value.prorated.amount_minor >= 0 ? $t('service.payNow') : $t('service.creditBack')
          }}</span>
          <span class="num text-base font-semibold">{{
            f.money({
              ...quote.data.value.prorated,
              amount_minor: Math.abs(quote.data.value.prorated.amount_minor),
            })
          }}</span>
        </div>
        <p class="mt-1 text-xs text-muted">
          {{ $t('service.proratedHint', { days: quote.data.value.days_remaining }) }}
        </p>
        <p v-if="quote.data.value.requires_restart" class="mt-2 text-xs text-warning">
          {{ $t('service.requiresRestart') }}
        </p>
      </template>
    </div>
    <p v-if="upgrade.error.value" class="mt-3 text-[13px] text-danger" role="alert">
      {{ errors.text(upgrade.error.value) }}
    </p>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
      <UiButton
        variant="primary"
        :disabled="!quote.data.value || upgrade.uncertain.value"
        :loading="upgrade.isPending.value"
        @click="submit"
        >{{ $t('service.confirmChange') }}</UiButton
      >
    </template>
  </UiDialog>
</template>
