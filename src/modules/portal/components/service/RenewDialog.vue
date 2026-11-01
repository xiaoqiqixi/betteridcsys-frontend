<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, type BillingCycle } from '@/contract'
import type { Service } from '@/contract/commerce'
import { useApiMutation } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ service: Service }>()
const router = useRouter()
const f = useFormat()
const errors = useErrorText()
const cycle = ref<BillingCycle>(props.service.cycle)
watch(
  open,
  (o) =>
    o &&
    (cycle.value = props.service.renewal_options.some((r) => r.cycle === props.service.cycle)
      ? props.service.cycle
      : (props.service.renewal_options[0]?.cycle ?? props.service.cycle)),
)
const renew = useApiMutation(api.services.renew, {
  invalidates: [api.billing.invoices, api.account.overview],
  onSuccess: (inv) => router.push({ name: 'invoice', params: { id: inv.id } }),
})
</script>

<template>
  <UiDialog v-model:open="open" :title="$t('service.renew')" :description="$t('service.renewBody')">
    <div class="grid gap-2" role="radiogroup">
      <button
        v-for="r in service.renewal_options"
        :key="r.cycle"
        type="button"
        role="radio"
        :aria-checked="cycle === r.cycle"
        :class="[
          'flex items-center justify-between rounded-lg border px-4 py-3 text-left',
          cycle === r.cycle
            ? 'border-primary bg-primary-soft ring-1 ring-primary'
            : 'border-line hover:border-line-strong',
        ]"
        @click="cycle = r.cycle"
      >
        <span class="text-sm font-medium">{{ f.cycle(r.cycle) }}</span>
        <span class="num text-sm font-semibold">{{ f.money(r.amount) }}</span>
      </button>
    </div>
    <p v-if="renew.error.value" class="mt-3 text-[13px] text-danger" role="alert">
      {{ errors.text(renew.error.value) }}
    </p>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
      <UiButton
        variant="primary"
        :loading="renew.isPending.value"
        :disabled="!service.renewal_options.length || renew.uncertain.value"
        @click="renew.mutate({ params: { id: service.id }, body: { cycle } })"
      >
        {{ $t('service.createRenewal') }}
      </UiButton>
    </template>
  </UiDialog>
</template>
