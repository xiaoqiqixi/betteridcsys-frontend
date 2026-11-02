<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api } from '@/contract/admin-endpoints'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import ReasonDialog from '../components/ReasonDialog.vue'

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const order = useApiQuery(api.admin.order, () => ({ params: { id: String(route.params.id) } }))
const o = computed(() => order.data.value)
const cancelOpen = ref(false)
const cancel = useApiMutation(api.admin.cancelOrder, {
  invalidates: [api.admin.order, api.admin.orders],
  onSuccess: () => {
    cancelOpen.value = false
    toast.success(t('order.cancelled'))
  },
})
</script>

<template>
  <div>
    <UiErrorState v-if="order.isError.value" :error="order.error.value" @retry="order.refetch()" />
    <UiSkeleton v-else-if="!o" :lines="6" />
    <template v-else>
      <UiPageHeader :title="`#${o.number}`" back="/admin/orders" :back-label="$t('admin.nav.orders')">
        <template #badges><UiStatus kind="order" :value="o.status" /></template>
        <template #meta>
          <p class="mt-1 text-[13px] text-muted">
            <RouterLink
              :to="{ name: 'admin-client', params: { id: o.client_id } }"
              class="text-fg-2 underline underline-offset-2 hover:text-primary"
              >{{ o.client_email }}</RouterLink
            >
            · <UiTime :value="o.created_at" mode="datetime" />
          </p>
        </template>
        <template #actions>
          <UiButton v-if="o.invoice_id" :to="{ name: 'admin-invoice', params: { id: o.invoice_id } }">{{
            $t('order.viewInvoice')
          }}</UiButton>
          <UiButton
            v-if="o.status === 'pending_payment' && session.can('orders.write')"
            variant="danger-ghost"
            @click="cancelOpen = true"
            >{{ $t('order.cancel') }}</UiButton
          >
        </template>
      </UiPageHeader>
      <UiCard :padded="false">
        <ul class="divide-y divide-line">
          <li
            v-for="(item, i) in o.items"
            :key="i"
            class="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:justify-between"
          >
            <div>
              <p class="font-medium">
                {{ item.product_name }} <span class="text-muted">× {{ item.quantity }}</span>
              </p>
              <p class="text-[13px] text-muted">
                {{ f.cycle(item.cycle)
                }}<template v-if="item.hostname">
                  · <span class="font-mono">{{ item.hostname }}</span></template
                >
              </p>
              <p v-if="item.options_summary.length" class="text-xs text-faint">
                {{ item.options_summary.join(' · ') }}
              </p>
              <div class="mt-1.5 flex flex-wrap gap-3">
                <RouterLink
                  v-for="sid in item.service_ids"
                  :key="sid"
                  :to="{ name: 'admin-service', params: { id: sid } }"
                  class="text-xs font-medium text-primary hover:underline"
                  >{{ $t('order.openService') }} →</RouterLink
                >
              </div>
            </div>
            <p class="num font-medium">{{ f.money(item.amount) }}</p>
          </li>
        </ul>
        <template #footer>
          <div class="flex w-full justify-between text-sm">
            <span class="text-muted"
              >{{ $t('invoice.total') }}<template v-if="o.coupon_code"> · {{ o.coupon_code }}</template></span
            ><span class="num font-semibold">{{ f.money(o.total) }}</span>
          </div>
        </template>
      </UiCard>
      <ReasonDialog
        v-model:open="cancelOpen"
        :title="$t('order.cancelTitle')"
        :body="$t('order.cancelBody')"
        :confirm-label="$t('order.cancel')"
        tone="danger"
        :loading="cancel.isPending.value"
        :error="cancel.error.value ? errors.text(cancel.error.value) : null"
        @confirm="(reason) => cancel.mutate({ params: { id: o!.id }, body: { reason } })"
      />
    </template>
  </div>
</template>
