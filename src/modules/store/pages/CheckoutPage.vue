<script setup lang="ts">
import { AlertTriangle, ShoppingCart, Tag, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/contract'
import { isApiError } from '@/shared/api'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useSite } from '@/shared/composables/site'
import { useToast } from '@/shared/composables/toast'
import { useCart } from '@/shared/stores/cart'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import { useQuote } from '../components/useQuote'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const f = useFormat()
const site = useSite()
const cart = useCart()
const session = useSession()
const toast = useToast()
const errors = useErrorText()

const products = useApiQuery(api.site.products, () => ({ query: { currency: site.currency.value } }), {
  staleTime: 60_000,
})
const credit = useApiQuery(api.billing.credit, () => (session.isClient ? {} : null))
const productOf = (id: string) => products.data.value?.find((p) => p.id === id)

const couponInput = ref('')
const coupon = ref('')
const applyCredit = ref(true)
const quoteBody = computed(() =>
  cart.lines.length
    ? {
        items: cart.inputs(),
        currency: site.currency.value,
        ...(coupon.value ? { coupon: coupon.value } : {}),
      }
    : null,
)
const quote = useQuote(quoteBody)
const needsCredentials = computed(() =>
  cart.lines.filter((l) => !cart.hasPassword(l.key) && !l.ssh_key_ids?.length),
)

const place = useApiMutation(api.orders.create, {
  invalidates: [api.orders.list, api.billing.invoices, api.account.overview, api.billing.credit],
  onSuccess: async ({ order, invoice }) => {
    cart.clear()
    if (invoice.status === 'paid') {
      toast.success(t('checkout.paidTitle'), t('checkout.paidBody'))
      await router.push({ name: 'order', params: { id: order.id } })
    } else {
      await router.push({ name: 'invoice', params: { id: invoice.id } })
    }
  },
})
const placeError = computed(() => {
  const e = place.error.value
  if (!e) return null
  if (isApiError(e) && e.code === 'QUOTE_CHANGED') return t('checkout.quoteChanged')
  return errors.text(e)
})

function submit() {
  const q = quote.data.value
  if (!q || !session.isClient || needsCredentials.value.length) return
  if (isApiError(place.error.value) && place.error.value.code === 'QUOTE_CHANGED') place.newAttempt()
  place.mutate({
    body: {
      items: cart.inputs(),
      currency: site.currency.value,
      quote_digest: q.quote_digest,
      apply_credit: applyCredit.value,
      ...(coupon.value ? { coupon: coupon.value } : {}),
    },
  })
}
function linePrice(index: number) {
  const line = quote.data.value?.lines.find((l) => l.item_index === index && l.kind === 'product')
  return line ? f.money(line.amount) : '—'
}
function applyCoupon() {
  coupon.value = couponInput.value.trim().toUpperCase()
}
</script>

<template>
  <div class="mx-auto max-w-[1200px] px-5 py-10">
    <h1 class="text-[28px] font-semibold tracking-tight">{{ $t('checkout.title') }}</h1>

    <UiEmpty
      v-if="!cart.lines.length"
      class="mt-8 rounded-xl border border-dashed border-line"
      :icon="ShoppingCart"
      :title="$t('checkout.emptyTitle')"
      :description="$t('checkout.emptyBody')"
    >
      <UiButton to="/store" variant="primary">{{ $t('home.ctaPrimary') }}</UiButton>
    </UiEmpty>

    <div v-else class="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div class="flex flex-col gap-3">
        <article
          v-for="(line, i) in cart.lines"
          :key="line.key"
          class="flex items-start gap-4 rounded-xl border border-line bg-surface p-5"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium text-fg">
              {{
                productOf(line.product_id)
                  ? f.text(productOf(line.product_id)!.name)
                  : $t('checkout.unavailable')
              }}
            </p>
            <p class="mt-1 text-[13px] text-muted">
              {{ f.cycle(line.cycle) }} · × {{ line.quantity
              }}<template v-if="line.hostname">
                · <span class="font-mono">{{ line.hostname }}</span></template
              >
            </p>
            <p
              v-if="needsCredentials.some((l) => l.key === line.key)"
              class="mt-2 flex items-center gap-1.5 text-xs text-warning"
            >
              <AlertTriangle class="size-3.5" />{{ $t('checkout.passwordLost') }}
              <RouterLink
                :to="{ name: 'configure', params: { id: line.product_id }, query: { cycle: line.cycle } }"
                class="font-medium underline"
                @click="cart.remove(line.key)"
                >{{ $t('checkout.reconfigure') }}</RouterLink
              >
            </p>
          </div>
          <div class="text-right">
            <p class="num font-medium">{{ linePrice(i) }}</p>
            <button
              class="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
              @click="cart.remove(line.key)"
            >
              <Trash2 class="size-3.5" />{{ $t('common.remove') }}
            </button>
          </div>
        </article>
      </div>

      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="rounded-xl border border-line bg-surface shadow-sm">
          <div class="border-b border-line px-5 py-4">
            <h2 class="text-[15px] font-semibold">{{ $t('configure.summary') }}</h2>
          </div>
          <div class="flex flex-col gap-4 px-5 py-4">
            <form class="flex gap-2" @submit.prevent="applyCoupon">
              <UiInput
                v-model="couponInput"
                :placeholder="$t('checkout.coupon')"
                size="sm"
                autocomplete="off"
              >
                <template #prefix><Tag class="size-3.5" /></template>
              </UiInput>
              <UiButton type="submit" size="sm" :disabled="!couponInput.trim()">{{
                $t('checkout.apply')
              }}</UiButton>
            </form>
            <p
              v-if="quote.data.value?.coupon"
              :class="['-mt-2 text-xs', quote.data.value.coupon.valid ? 'text-success' : 'text-danger']"
            >
              {{
                quote.data.value.coupon.valid
                  ? $t('checkout.couponApplied', { code: quote.data.value.coupon.code })
                  : quote.data.value.coupon.message || $t('checkout.couponInvalid')
              }}
            </p>
            <UiSkeleton v-if="quote.isPending.value" :lines="3" />
            <p v-else-if="quote.isError.value" class="text-[13px] text-danger">
              {{ errors.text(quote.error.value) }}
            </p>
            <dl v-else-if="quote.data.value" class="space-y-2 text-[13px]">
              <div class="flex justify-between">
                <dt class="text-muted">{{ $t('checkout.subtotal') }}</dt>
                <dd class="num">{{ f.money(quote.data.value.subtotal) }}</dd>
              </div>
              <div v-if="quote.data.value.discount.amount_minor" class="flex justify-between text-success">
                <dt>{{ $t('checkout.discount') }}</dt>
                <dd class="num">−{{ f.money(quote.data.value.discount) }}</dd>
              </div>
            </dl>
          </div>
          <div class="border-t border-line px-5 py-4">
            <div class="flex items-baseline justify-between">
              <span class="text-sm font-medium">{{ $t('checkout.dueToday') }}</span>
              <span class="num text-2xl font-semibold tracking-tight">{{
                quote.data.value ? f.money(quote.data.value.total) : '—'
              }}</span>
            </div>

            <template v-if="session.isClient">
              <div
                v-if="credit.data.value && credit.data.value.balance.amount_minor > 0"
                class="mt-4 rounded-lg border border-line bg-surface-2 p-3"
              >
                <UiSwitch
                  v-model="applyCredit"
                  :label="$t('checkout.useCredit')"
                  :description="
                    $t('checkout.creditAvailable', { amount: f.money(credit.data.value.balance) })
                  "
                />
              </div>
              <div
                v-if="place.uncertain.value"
                class="mt-4 rounded-lg border border-warning/40 bg-warning-soft p-3 text-[13px] text-warning"
                role="alert"
              >
                {{ $t('checkout.uncertain') }}
                <RouterLink to="/orders" class="font-medium underline">{{ $t('nav.orders') }}</RouterLink>
              </div>
              <p v-else-if="placeError" class="mt-4 text-[13px] text-danger" role="alert">{{ placeError }}</p>
              <UiButton
                class="mt-4"
                variant="primary"
                size="lg"
                block
                :loading="place.isPending.value"
                :disabled="!quote.data.value || !!needsCredentials.length || place.uncertain.value"
                @click="submit"
              >
                {{ $t('checkout.placeOrder') }}
              </UiButton>
              <p class="mt-3 text-center text-xs text-faint">{{ $t('checkout.terms') }}</p>
            </template>
            <div v-else class="mt-5 flex flex-col gap-2">
              <p class="text-[13px] text-muted">{{ $t('checkout.signInToOrder') }}</p>
              <UiButton
                :to="{ name: 'login', query: { redirect: route.fullPath } }"
                variant="primary"
                block
                >{{ $t('auth.signIn') }}</UiButton
              >
              <UiButton
                :to="{ name: 'register', query: { redirect: route.fullPath } }"
                variant="secondary"
                block
                >{{ $t('auth.signUp') }}</UiButton
              >
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
