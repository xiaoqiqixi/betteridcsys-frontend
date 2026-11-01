<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api } from '@/contract'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const order = useApiQuery(api.orders.get, () => ({ params: { id: String(route.params.id) } }))
const o = computed(() => order.data.value)
const cancel = useApiMutation(api.orders.cancel, {
  invalidates: [api.orders.get, api.orders.list, api.billing.invoices],
})
async function doCancel() {
  if (!o.value) return
  if (
    await confirm({
      title: t('order.cancelTitle'),
      body: t('order.cancelBody'),
      tone: 'danger',
      confirmLabel: t('order.cancel'),
    })
  ) {
    cancel.mutate(
      { params: { id: o.value.id }, body: { reason: 'customer_request' } },
      { onSuccess: () => toast.success(t('order.cancelled')), onError: (e) => toast.error(errors.text(e)) },
    )
  }
}
</script>

<template>
  <div>
    <UiErrorState v-if="order.isError.value" :error="order.error.value" @retry="order.refetch()" />
    <UiSkeleton v-else-if="!o" :lines="6" />
    <template v-else>
      <UiPageHeader :title="`#${o.number}`" back="/orders" :back-label="$t('nav.orders')">
        <template #badges><UiStatus kind="order" :value="o.status" /></template>
        <template #meta
          ><p class="mt-1 text-[13px] text-muted">
            {{ $t('common.created') }} <UiTime :value="o.created_at" mode="datetime" /></p
        ></template>
        <template #actions>
          <UiButton
            v-if="o.invoice_id"
            :to="{ name: 'invoice', params: { id: o.invoice_id } }"
            :variant="o.status === 'pending_payment' ? 'primary' : 'secondary'"
          >
            {{ o.status === 'pending_payment' ? $t('order.payNow') : $t('order.viewInvoice') }}
          </UiButton>
          <UiButton
            v-if="o.status === 'pending_payment'"
            variant="danger-ghost"
            :loading="cancel.isPending.value"
            @click="doCancel"
            >{{ $t('order.cancel') }}</UiButton
          >
        </template>
      </UiPageHeader>
      <UiCard :padded="false">
        <ul class="divide-y divide-line">
          <li
            v-for="(item, i) in o.items"
            :key="i"
            class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium">
                {{ item.product_name }} <span class="text-muted">× {{ item.quantity }}</span>
              </p>
              <p class="mt-0.5 text-[13px] text-muted">
                {{ f.cycle(item.cycle)
                }}<template v-if="item.hostname">
                  · <span class="font-mono">{{ item.hostname }}</span></template
                >
              </p>
              <p v-if="item.options_summary.length" class="mt-1 text-xs text-faint">
                {{ item.options_summary.join(' · ') }}
              </p>
              <div v-if="item.service_ids.length" class="mt-2 flex flex-wrap gap-2">
                <RouterLink
                  v-for="sid in item.service_ids"
                  :key="sid"
                  :to="{ name: 'service', params: { id: sid } }"
                  class="text-xs font-medium text-primary hover:underline"
                  >{{ $t('order.openService') }} →</RouterLink
                >
              </div>
            </div>
            <p class="num font-medium">{{ f.money(item.amount) }}</p>
          </li>
        </ul>
        <template #footer>
          <div class="flex w-full items-center justify-between text-sm">
            <span class="text-muted"
              >{{ $t('invoice.total')
              }}<template v-if="o.coupon_code">
                · {{ $t('checkout.couponApplied', { code: o.coupon_code }) }}</template
              ></span
            >
            <span class="num text-base font-semibold">{{ f.money(o.total) }}</span>
          </div>
        </template>
      </UiCard>
    </template>
  </div>
</template>
