<script setup lang="ts">
import {
  ArrowRight,
  Camera,
  Code2,
  Globe2,
  MonitorPlay,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { api } from '@/contract'
import { useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCopy from '@/shared/ui/UiCopy.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import PlanCard from '../components/PlanCard.vue'
import HeroVisual from '../components/HeroVisual.vue'
import PlanCardSkeleton from '../components/PlanCardSkeleton.vue'
import { useCatalog } from '../components/useCatalog'
import { flag } from '../lib/pricing'

const f = useFormat()
const session = useSession()
const { site, products, regionOf, nodeOf, visibleRegions } = useCatalog()
const news = useApiQuery(api.site.announcements, { query: { limit: 1 } }, { staleTime: 5 * 60_000 })

const region = ref('all')
const regionTabs = computed(() => [
  { value: 'all', label: f.text({ 'zh-CN': '全部地区', en: 'All regions' }) },
  ...visibleRegions.value
    .filter((r) => products.data.value?.some((p) => p.region_id === r.id))
    .map((r) => ({ value: r.id, label: `${flag(r.country)} ${f.text(r.name)}` })),
])
const featured = computed(() =>
  (products.data.value ?? [])
    .filter((p) => region.value === 'all' || p.region_id === region.value)
    .sort((a, b) => Number(b.badges.length > 0) - Number(a.badges.length > 0) || a.sort_order - b.sort_order)
    .slice(0, 6),
)
const nodes = computed(() => (site.taxonomy.data.value?.nodes ?? []).filter((n) => n.visible))
const stats = computed(() => [
  { value: visibleRegions.value.length, key: 'regions' },
  { value: nodes.value.length, key: 'nodes' },
  { value: products.data.value?.length ?? 0, key: 'plans' },
])
const features = [
  { icon: Zap, key: 'instant' },
  { icon: Globe2, key: 'network' },
  { icon: MonitorPlay, key: 'console' },
  { icon: Camera, key: 'snapshots' },
  { icon: ShieldCheck, key: 'isolation' },
  { icon: Code2, key: 'api' },
]
const regionCards = computed(() =>
  visibleRegions.value
    .map((r) => ({ region: r, nodes: nodes.value.filter((n) => n.region_id === r.id) }))
    .filter((x) => x.nodes.length),
)
const faq = ['cycles', 'payment', 'upgrade', 'cancel']
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden border-b border-line">
      <div class="glow pointer-events-none absolute inset-0" />
      <div class="bg-grid mask-fade-b pointer-events-none absolute inset-0" />
      <div
        class="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 pt-16 pb-20 sm:pt-24 sm:pb-28 lg:grid-cols-[1.15fr_1fr] lg:pt-28 lg:pb-32"
      >
        <div class="min-w-0">
          <RouterLink
            v-if="news.data.value?.items[0]"
            to="/announcements"
            class="group mb-8 inline-flex max-w-full animate-rise items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pr-3 pl-1 text-[13px] text-fg-2 shadow-xs backdrop-blur hover:border-line-strong"
          >
            <span class="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{{
              $t('home.news')
            }}</span>
            <span class="truncate">{{ f.text(news.data.value.items[0].title) }}</span>
            <ArrowRight
              class="size-3.5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
            />
          </RouterLink>
          <h1
            class="text-gradient max-w-3xl animate-rise text-[36px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[52px] xl:text-[60px]"
          >
            {{ f.text(site.settings.data.value?.tagline) || $t('home.title') }}
          </h1>
          <p class="mt-6 max-w-xl animate-rise text-[17px] leading-relaxed text-muted [animation-delay:60ms]">
            {{ $t('home.subtitle') }}
          </p>
          <div class="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:120ms]">
            <UiButton to="/store" variant="primary" size="lg"
              >{{ $t('home.ctaPrimary') }}<ArrowRight class="size-4"
            /></UiButton>
            <UiButton
              :to="session.user ? (session.isStaff ? '/admin' : '/dashboard') : '/register'"
              variant="secondary"
              size="lg"
            >
              {{ session.user ? $t('store.nav.console') : $t('home.ctaSecondary') }}
            </UiButton>
          </div>
          <dl class="mt-14 grid max-w-lg animate-rise grid-cols-3 gap-4 [animation-delay:180ms] sm:gap-6">
            <div v-for="s in stats" :key="s.key" class="border-l border-line pl-3 sm:pl-4">
              <dt class="text-xs text-muted">{{ $t(`home.stats.${s.key}`) }}</dt>
              <dd class="num mt-1 text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                {{ s.value || '—' }}
              </dd>
            </div>
          </dl>
        </div>
        <HeroVisual
          class="mx-auto hidden w-full max-w-[460px] animate-rise [animation-delay:200ms] md:block"
        />
      </div>
    </section>

    <!-- Plans -->
    <section class="mx-auto max-w-[1200px] px-5 py-20">
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-[13px] font-medium text-primary">{{ $t('home.plans.eyebrow') }}</p>
          <h2 class="mt-2 text-[28px] font-semibold tracking-tight">{{ $t('home.plans.title') }}</h2>
          <p class="mt-2 max-w-lg text-[15px] text-muted">{{ $t('home.plans.body') }}</p>
        </div>
        <UiSegmented v-if="regionTabs.length > 2" v-model="region" :options="regionTabs" />
      </div>
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <template v-if="products.isPending.value"><PlanCardSkeleton v-for="i in 6" :key="i" /></template>
        <UiErrorState
          v-else-if="products.isError.value"
          class="sm:col-span-2 lg:col-span-3"
          :error="products.error.value"
          @retry="products.refetch()"
        />
        <PlanCard
          v-for="p in featured"
          v-else
          :key="p.id"
          :product="p"
          :currency="site.currency.value"
          :region="regionOf(p)"
          :node="nodeOf(p)"
        />
      </div>
      <div class="mt-8 flex justify-center">
        <UiButton to="/store" variant="ghost"
          >{{ $t('home.plans.all') }}<ArrowRight class="size-4"
        /></UiButton>
      </div>
    </section>

    <!-- Features -->
    <section class="border-y border-line bg-surface-2/50">
      <div class="mx-auto max-w-[1200px] px-5 py-20">
        <div class="max-w-2xl">
          <p class="text-[13px] font-medium text-primary">{{ $t('home.features.eyebrow') }}</p>
          <h2 class="mt-2 text-[28px] font-semibold tracking-tight">{{ $t('home.features.title') }}</h2>
        </div>
        <div
          class="mt-12 grid overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
          style="gap: 1px"
        >
          <div v-for="feat in features" :key="feat.key" class="bg-surface p-7">
            <span
              class="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 text-primary"
            >
              <component :is="feat.icon" class="size-4.5" />
            </span>
            <h3 class="mt-5 text-[15px] font-semibold">{{ $t(`home.features.${feat.key}.title`) }}</h3>
            <p class="mt-2 text-[13.5px] leading-relaxed text-muted">
              {{ $t(`home.features.${feat.key}.body`) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Network -->
    <section v-if="regionCards.length" class="mx-auto max-w-[1200px] px-5 py-20">
      <div class="max-w-2xl">
        <p class="text-[13px] font-medium text-primary">{{ $t('home.network.eyebrow') }}</p>
        <h2 class="mt-2 text-[28px] font-semibold tracking-tight">
          {{ $t('home.network.title', { n: regionCards.length }) }}
        </h2>
        <p class="mt-2 text-[15px] text-muted">{{ $t('home.network.body') }}</p>
      </div>
      <div class="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="rc in regionCards"
          :key="rc.region.id"
          class="rounded-xl border border-line bg-surface p-5"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl leading-none" aria-hidden="true">{{ flag(rc.region.country) }}</span>
            <div>
              <p class="text-[15px] font-semibold">{{ f.text(rc.region.name) }}</p>
              <p class="text-xs text-muted">{{ rc.region.city }}</p>
            </div>
          </div>
          <ul class="mt-4 space-y-2 border-t border-line pt-4">
            <li v-for="n in rc.nodes" :key="n.id" class="flex items-center justify-between gap-3 text-[13px]">
              <span class="flex items-center gap-2 text-fg-2"
                ><span class="size-1.5 rounded-full bg-success" />{{
                  n.network_label || f.text(n.name)
                }}</span
              >
              <UiCopy v-if="n.test_ip" :text="n.test_ip" mono class="text-muted" />
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mx-auto max-w-[1200px] px-5 pb-20">
      <div class="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p class="text-[13px] font-medium text-primary">FAQ</p>
          <h2 class="mt-2 text-[28px] font-semibold tracking-tight">{{ $t('home.faq.title') }}</h2>
        </div>
        <div class="divide-y divide-line rounded-xl border border-line bg-surface">
          <details
            v-for="q in faq"
            :key="q"
            class="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium"
            >
              {{ $t(`home.faq.${q}.q`) }}
              <span class="text-faint transition-transform group-open:rotate-45">+</span>
            </summary>
            <p class="mt-3 text-[13.5px] leading-relaxed text-muted">{{ $t(`home.faq.${q}.a`) }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="px-5 pb-24">
      <div
        class="relative mx-auto max-w-[1200px] overflow-hidden rounded-2xl border border-line bg-surface px-8 py-14 text-center shadow-sm"
      >
        <div class="glow pointer-events-none absolute inset-0 opacity-80" />
        <div class="bg-grid mask-radial pointer-events-none absolute inset-0" />
        <div class="relative">
          <Sparkles class="mx-auto size-6 text-primary" />
          <h2 class="mt-4 text-[26px] font-semibold tracking-tight">{{ $t('home.cta.title') }}</h2>
          <p class="mx-auto mt-2 max-w-md text-[15px] text-muted">{{ $t('home.cta.body') }}</p>
          <div class="mt-7 flex justify-center gap-3">
            <UiButton to="/store" variant="primary" size="lg"
              ><Rocket class="size-4" />{{ $t('home.ctaPrimary') }}</UiButton
            >
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
