<script setup lang="ts">
import {
  Check,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  HardDrive,
  KeyRound,
  MemoryStick,
  Minus,
  Network,
  Plus,
  RefreshCw,
  ShoppingCart,
} from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api, type BillingCycle } from '@/contract'
import type { PricePoint } from '@/contract/commerce'
import { useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useSite } from '@/shared/composables/site'
import { useCart } from '@/shared/stores/cart'
import { useSession } from '@/shared/stores/session'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import OsPicker from '../components/OsPicker.vue'
import { useQuote } from '../components/useQuote'
import { generatePassword, HOSTNAME, passwordStrongEnough } from '../lib/password'
import { asMoney, flag, pricesFor, savingPercent } from '../lib/pricing'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const f = useFormat()
const site = useSite()
const session = useSession()
const cart = useCart()
const errors = useErrorText()

const product = useApiQuery(api.site.product, () => ({ params: { id: String(route.params.id) } }))
const sshKeys = useApiQuery(api.account.sshKeys, () => (session.isClient ? {} : null))
const p = computed(() => product.data.value)
const region = computed(() => site.taxonomy.data.value?.regions.find((r) => r.id === p.value?.region_id))
const node = computed(() => site.taxonomy.data.value?.nodes.find((n) => n.id === p.value?.node_id))
const points = computed(() => (p.value ? pricesFor(p.value, site.currency.value) : []))

const form = reactive({
  cycle: (route.query.cycle as BillingCycle) || 'monthly',
  quantity: 1,
  os: undefined as string | undefined,
  options: {} as Record<string, string | number>,
  hostname: '',
  auth: 'password' as 'password' | 'ssh',
  password: generatePassword(),
  sshKeyIds: [] as string[],
})
const showPassword = ref(false)
const copied = ref(false)

watch(points, (list) => {
  if (list.length && !list.some((x) => x.cycle === form.cycle)) form.cycle = list[0]!.cycle
})
watch(
  p,
  (prod) => {
    if (!prod) return
    for (const o of prod.options) {
      if (o.kind === 'os_image' || o.key in form.options) continue
      if (o.kind === 'quantity') form.options[o.key] = o.min ?? 0
      else if (o.required && o.choices[0]) form.options[o.key] = o.choices[0].id
    }
  },
  { immediate: true },
)

const osOption = computed(() => p.value?.options.find((o) => o.kind === 'os_image'))
const extraOptions = computed(() => p.value?.options.filter((o) => o.kind !== 'os_image') ?? [])
const hostnameError = computed(() =>
  form.hostname && !HOSTNAME.test(form.hostname) ? t('configure.hostnameInvalid') : null,
)
const passwordError = computed(() =>
  form.auth === 'password' && !passwordStrongEnough(form.password) ? t('configure.passwordWeak') : null,
)
const sshError = computed(() =>
  form.auth === 'ssh' && !form.sshKeyIds.length ? t('configure.sshRequired') : null,
)
const valid = computed(
  () =>
    !!p.value &&
    !hostnameError.value &&
    !passwordError.value &&
    !sshError.value &&
    (!p.value.os_images.length || !!form.os),
)

const item = computed(() => {
  if (!p.value) return null
  const options: Record<string, string | number> = { ...form.options }
  if (osOption.value && form.os) options[osOption.value.key] = form.os
  return {
    product_id: p.value.id,
    cycle: form.cycle,
    quantity: form.quantity,
    options,
    ...(form.hostname ? { hostname: form.hostname } : {}),
    ...(form.auth === 'password' ? { root_password: form.password } : { ssh_key_ids: form.sshKeyIds }),
  }
})
const quoteBody = computed(() =>
  item.value && valid.value ? { items: [item.value], currency: site.currency.value } : null,
)
const quote = useQuote(quoteBody)

const specs = computed(() =>
  p.value
    ? [
        { icon: Cpu, label: 'vCPU', value: `${p.value.specs.cpu_cores}` },
        { icon: MemoryStick, label: t('specs.memory'), value: f.memory(p.value.specs.memory_mb) },
        { icon: HardDrive, label: t('specs.disk'), value: `${p.value.specs.disk_gb} GB NVMe` },
        { icon: Gauge, label: t('specs.bandwidth'), value: f.bandwidth(p.value.specs.bandwidth_mbps) },
        { icon: Network, label: t('specs.traffic'), value: f.traffic(p.value.specs.traffic_gb) },
      ]
    : [],
)

function priceAt(list: PricePoint[] | undefined) {
  return list?.find((x) => x.currency === site.currency.value && x.cycle === form.cycle)
}
function choiceLabel(prices: PricePoint[]) {
  const pp = priceAt(prices)
  return pp && pp.recurring_minor ? '+' + f.money(asMoney(pp)) : t('configure.included')
}
function unitLabel(prices: PricePoint[] | undefined) {
  const pp = priceAt(prices)
  return pp ? t('configure.perUnit', { price: f.money(asMoney(pp)) }) : ''
}

async function copyPassword() {
  try {
    await navigator.clipboard.writeText(form.password)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    showPassword.value = true
  }
}
function addToCart(go: boolean) {
  if (!item.value || !valid.value) return
  const { root_password, ...line } = item.value as typeof item.value & { root_password?: string }
  cart.add(line, root_password)
  if (go) void router.push('/checkout')
}
</script>

<template>
  <div class="mx-auto max-w-[1200px] px-5 py-10">
    <RouterLink to="/store" class="text-[13px] text-muted hover:text-fg"
      >← {{ $t('configure.back') }}</RouterLink
    >

    <UiErrorState v-if="product.isError.value" :error="product.error.value" @retry="product.refetch()" />
    <div v-else class="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div class="flex min-w-0 flex-col gap-6">
        <header>
          <UiSkeleton v-if="!p" :lines="2" height="h-6" />
          <template v-else>
            <p class="flex items-center gap-1.5 text-[13px] text-muted">
              <span v-if="region">{{ flag(region.country) }} {{ f.text(region.name) }}</span>
              <span v-if="node" class="text-faint">· {{ node.network_label || f.text(node.name) }}</span>
            </p>
            <h1 class="mt-1 text-[28px] font-semibold tracking-tight">{{ f.text(p.name) }}</h1>
            <p v-if="f.text(p.description)" class="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {{ f.text(p.description) }}
            </p>
            <dl
              class="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5"
            >
              <div v-for="s in specs" :key="s.label" class="bg-surface px-4 py-3">
                <dt class="flex items-center gap-1.5 text-xs text-muted">
                  <component :is="s.icon" class="size-3.5" />{{ s.label }}
                </dt>
                <dd class="num mt-1 text-[15px] font-semibold text-fg">{{ s.value }}</dd>
              </div>
            </dl>
          </template>
        </header>

        <section v-if="p" class="rounded-xl border border-line bg-surface p-5">
          <h2 class="text-[15px] font-semibold">{{ $t('configure.cycle') }}</h2>
          <div class="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup">
            <button
              v-for="pt in points"
              :key="pt.cycle"
              type="button"
              role="radio"
              :aria-checked="form.cycle === pt.cycle"
              :class="[
                'relative flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors',
                form.cycle === pt.cycle
                  ? 'border-primary bg-primary-soft ring-1 ring-primary'
                  : 'border-line hover:border-line-strong',
              ]"
              @click="form.cycle = pt.cycle"
            >
              <span class="text-[13px] font-medium text-fg-2">{{ f.cycle(pt.cycle) }}</span>
              <span class="num mt-1 text-lg font-semibold text-fg">{{ f.money(asMoney(pt)) }}</span>
              <span v-if="pt.setup_minor" class="text-xs text-muted"
                >+ {{ f.money(asMoney(pt, 'setup_minor')) }} {{ $t('configure.setupFee') }}</span
              >
              <UiBadge
                v-if="savingPercent(p, site.currency.value, pt.cycle)"
                tone="success"
                class="absolute top-2.5 right-2.5"
              >
                −{{ savingPercent(p, site.currency.value, pt.cycle) }}%
              </UiBadge>
            </button>
          </div>
          <p v-if="!points.length" class="mt-3 text-[13px] text-warning">{{ $t('store.notInCurrency') }}</p>
        </section>

        <section v-if="p?.os_images.length" class="rounded-xl border border-line bg-surface p-5">
          <h2 class="text-[15px] font-semibold">{{ $t('configure.os') }}</h2>
          <div class="mt-4"><OsPicker v-model="form.os" :images="p.os_images" /></div>
        </section>

        <section v-if="extraOptions.length" class="rounded-xl border border-line bg-surface p-5">
          <h2 class="text-[15px] font-semibold">{{ $t('configure.options') }}</h2>
          <div class="mt-4 flex flex-col gap-5">
            <UiField v-for="o in extraOptions" :key="o.id" :label="f.text(o.label)" :required="o.required">
              <div v-if="o.kind === 'select'" class="grid gap-2 sm:grid-cols-2" role="radiogroup">
                <button
                  v-for="c in o.choices"
                  :key="c.id"
                  type="button"
                  role="radio"
                  :aria-checked="form.options[o.key] === c.id"
                  :class="[
                    'flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-[13px] transition-colors',
                    form.options[o.key] === c.id
                      ? 'border-primary bg-primary-soft'
                      : 'border-line hover:border-line-strong',
                  ]"
                  @click="form.options[o.key] = c.id"
                >
                  <span class="font-medium text-fg">{{ f.text(c.label) }}</span>
                  <span class="num text-muted">{{ choiceLabel(c.prices) }}</span>
                </button>
              </div>
              <div v-else class="flex items-center gap-3">
                <div class="inline-flex items-center rounded-md border border-line">
                  <button
                    type="button"
                    class="grid size-9 place-items-center text-muted hover:text-fg disabled:opacity-40"
                    :disabled="Number(form.options[o.key] ?? 0) <= (o.min ?? 0)"
                    :aria-label="$t('common.decrease')"
                    @click="form.options[o.key] = Number(form.options[o.key] ?? 0) - 1"
                  >
                    <Minus class="size-3.5" />
                  </button>
                  <span class="num w-10 text-center text-sm font-medium">{{ form.options[o.key] ?? 0 }}</span>
                  <button
                    type="button"
                    class="grid size-9 place-items-center text-muted hover:text-fg disabled:opacity-40"
                    :disabled="Number(form.options[o.key] ?? 0) >= (o.max ?? 0)"
                    :aria-label="$t('common.increase')"
                    @click="form.options[o.key] = Number(form.options[o.key] ?? 0) + 1"
                  >
                    <Plus class="size-3.5" />
                  </button>
                </div>
                <span class="num text-[13px] text-muted">{{ unitLabel(o.unit_prices) }}</span>
              </div>
            </UiField>
          </div>
        </section>

        <section v-if="p" class="rounded-xl border border-line bg-surface p-5">
          <h2 class="text-[15px] font-semibold">{{ $t('configure.access') }}</h2>
          <div class="mt-4 flex flex-col gap-5">
            <UiField
              :label="$t('configure.hostname')"
              :hint="$t('configure.hostnameHint')"
              :error="hostnameError"
              optional
            >
              <template #default="{ id }">
                <UiInput
                  :id="id"
                  v-model="form.hostname"
                  placeholder="web-01.example.com"
                  mono
                  autocomplete="off"
                  spellcheck="false"
                  @update:model-value="form.hostname = String($event ?? '').toLowerCase()"
                />
              </template>
            </UiField>
            <UiSegmented
              v-model="form.auth"
              :options="[
                { value: 'password', label: $t('configure.authPassword') },
                { value: 'ssh', label: $t('configure.authSsh') },
              ]"
            />
            <UiField
              v-if="form.auth === 'password'"
              :label="$t('configure.rootPassword')"
              :error="passwordError"
              :hint="$t('configure.passwordHint')"
            >
              <template #default="{ id }">
                <UiInput
                  :id="id"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  mono
                  autocomplete="new-password"
                >
                  <template #suffix>
                    <button
                      type="button"
                      class="grid size-7 place-items-center rounded hover:text-fg"
                      :aria-label="$t('configure.togglePassword')"
                      @click="showPassword = !showPassword"
                    >
                      <EyeOff v-if="showPassword" class="size-4" /><Eye v-else class="size-4" />
                    </button>
                    <button
                      type="button"
                      class="grid size-7 place-items-center rounded hover:text-fg"
                      :aria-label="$t('common.copy')"
                      @click="copyPassword"
                    >
                      <Check v-if="copied" class="size-4 text-success" /><Copy v-else class="size-4" />
                    </button>
                    <button
                      type="button"
                      class="grid size-7 place-items-center rounded hover:text-fg"
                      :aria-label="$t('configure.regenerate')"
                      @click="form.password = generatePassword()"
                    >
                      <RefreshCw class="size-4" />
                    </button>
                  </template>
                </UiInput>
              </template>
            </UiField>
            <div v-else>
              <p
                v-if="!session.isClient"
                class="rounded-lg border border-dashed border-line px-4 py-3 text-[13px] text-muted"
              >
                {{ $t('configure.sshSignIn') }}
                <RouterLink
                  :to="{ name: 'login', query: { redirect: route.fullPath } }"
                  class="font-medium text-primary hover:underline"
                  >{{ $t('auth.signIn') }}</RouterLink
                >
              </p>
              <template v-else>
                <div v-if="sshKeys.data.value?.length" class="flex flex-col gap-2">
                  <UiCheckbox
                    v-for="k in sshKeys.data.value"
                    :key="k.id"
                    :model-value="form.sshKeyIds.includes(k.id)"
                    @update:model-value="
                      (on: boolean) =>
                        (form.sshKeyIds = on
                          ? [...form.sshKeyIds, k.id]
                          : form.sshKeyIds.filter((x) => x !== k.id))
                    "
                  >
                    <span class="font-medium text-fg">{{ k.name }}</span>
                    <span class="ml-2 font-mono text-xs text-faint">{{ k.fingerprint }}</span>
                  </UiCheckbox>
                </div>
                <p v-else class="text-[13px] text-muted">
                  {{ $t('configure.noSshKeys') }}
                  <RouterLink to="/account/ssh-keys" class="font-medium text-primary hover:underline"
                    ><KeyRound class="mr-0.5 inline size-3.5" />{{ $t('configure.addSshKey') }}</RouterLink
                  >
                </p>
                <p v-if="sshError" class="mt-2 text-xs text-danger">{{ sshError }}</p>
              </template>
            </div>
          </div>
        </section>
      </div>

      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="rounded-xl border border-line bg-surface shadow-sm">
          <div class="border-b border-line px-5 py-4">
            <h2 class="text-[15px] font-semibold">{{ $t('configure.summary') }}</h2>
          </div>
          <div class="px-5 py-4">
            <div class="flex items-center justify-between">
              <span class="text-[13px] text-muted">{{ $t('configure.quantity') }}</span>
              <div class="inline-flex items-center rounded-md border border-line">
                <button
                  type="button"
                  class="grid size-8 place-items-center text-muted hover:text-fg disabled:opacity-40"
                  :disabled="form.quantity <= 1"
                  :aria-label="$t('common.decrease')"
                  @click="form.quantity--"
                >
                  <Minus class="size-3.5" />
                </button>
                <span class="num w-8 text-center text-sm font-medium">{{ form.quantity }}</span>
                <button
                  type="button"
                  class="grid size-8 place-items-center text-muted hover:text-fg disabled:opacity-40"
                  :disabled="form.quantity >= 10 || (p?.stock != null && form.quantity >= p.stock)"
                  :aria-label="$t('common.increase')"
                  @click="form.quantity++"
                >
                  <Plus class="size-3.5" />
                </button>
              </div>
            </div>
            <div class="mt-4 min-h-24">
              <UiSkeleton v-if="quote.isPending.value && quoteBody" :lines="3" />
              <p v-else-if="quote.isError.value" class="text-[13px] text-danger">
                {{ errors.text(quote.error.value) }}
              </p>
              <ul v-else-if="quote.data.value" class="space-y-2 text-[13px]">
                <li v-for="(l, i) in quote.data.value.lines" :key="i" class="flex justify-between gap-3">
                  <span :class="l.kind === 'discount' ? 'text-success' : 'text-fg-2'">{{
                    l.description
                  }}</span>
                  <span class="num shrink-0" :class="l.kind === 'discount' ? 'text-success' : 'text-fg'">{{
                    f.money(l.amount)
                  }}</span>
                </li>
              </ul>
              <p v-else class="text-[13px] text-muted">{{ $t('configure.completeForm') }}</p>
            </div>
          </div>
          <div class="border-t border-line px-5 py-4">
            <div class="flex items-baseline justify-between">
              <span class="text-sm font-medium">{{ $t('checkout.dueToday') }}</span>
              <span class="num text-2xl font-semibold tracking-tight">{{
                quote.data.value ? f.money(quote.data.value.total) : '—'
              }}</span>
            </div>
            <p v-if="quote.data.value?.renewals[0]" class="mt-1 text-right text-xs text-muted">
              {{
                $t('checkout.renewsAt', {
                  amount: f.money(quote.data.value.renewals[0].amount),
                  cycle: f.per(quote.data.value.renewals[0].cycle),
                })
              }}
            </p>
            <div class="mt-5 flex flex-col gap-2">
              <UiButton
                variant="primary"
                size="lg"
                block
                :disabled="!valid || !quote.data.value"
                @click="addToCart(true)"
                >{{ $t('configure.buyNow') }}</UiButton
              >
              <UiButton
                variant="secondary"
                block
                :disabled="!valid || !quote.data.value"
                @click="addToCart(false)"
                ><ShoppingCart class="size-4" />{{ $t('configure.addToCart') }}</UiButton
              >
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
