<script setup lang="ts">
import { ChevronDown, Cloud, Cpu, Globe, Menu, Server, Shield, ShoppingCart, Zap } from '@lucide/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref } from 'vue'
import { useSite } from '@/shared/composables/site'
import { useFormat } from '@/shared/composables/format'
import { useCart } from '@/shared/stores/cart'
import { useSession } from '@/shared/stores/session'
import BrandMark from '@/shared/ui/BrandMark.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiSheet from '@/shared/ui/UiSheet.vue'
import DemoBanner from '../components/DemoBanner.vue'
import LocaleMenu from '../components/LocaleMenu.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import UserMenu from '../components/UserMenu.vue'

const site = useSite()
const session = useSession()
const cart = useCart()
const f = useFormat()
const menuOpen = ref(false)
const mobileOpen = ref(false)
const icons = { cloud: Cloud, zap: Zap, server: Server, globe: Globe, cpu: Cpu, shield: Shield }
const types = computed(() =>
  (site.taxonomy.data.value?.types ?? [])
    .filter((t) => t.visible)
    .sort((a, b) => a.sort_order - b.sort_order),
)
const consoleHome = computed(() => (session.isStaff ? '/admin' : '/dashboard'))
const year = new Date().getFullYear()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-bg">
    <DemoBanner />
    <header class="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5">
        <RouterLink to="/" class="flex items-center gap-2.5">
          <BrandMark :logo="site.settings.data.value?.logo" />
          <span class="text-[15px] font-semibold tracking-tight text-fg">{{ site.name.value }}</span>
        </RouterLink>
        <nav class="hidden items-center gap-1 text-[13.5px] md:flex">
          <PopoverRoot v-model:open="menuOpen">
            <PopoverTrigger
              class="inline-flex h-8 items-center gap-1 rounded-md px-3 font-medium text-fg-2 transition-colors hover:text-fg data-[state=open]:text-fg"
            >
              {{ $t('store.nav.products') }}<ChevronDown class="size-3.5 opacity-60" />
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent
                :side-offset="12"
                align="start"
                class="z-50 w-[520px] rounded-xl border border-line bg-elevated p-2 shadow-lg data-[state=open]:animate-pop"
              >
                <div class="grid grid-cols-2 gap-1">
                  <RouterLink
                    v-for="t in types"
                    :key="t.id"
                    :to="{ path: '/store', query: { type: t.slug } }"
                    class="group flex gap-3 rounded-lg p-3 transition-colors hover:bg-surface-2"
                    @click="menuOpen = false"
                  >
                    <span
                      class="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-primary shadow-xs"
                    >
                      <component :is="icons[t.icon]" class="size-4" />
                    </span>
                    <span class="min-w-0">
                      <span class="block text-sm font-medium text-fg">{{ f.text(t.name) }}</span>
                      <span class="mt-0.5 line-clamp-2 block text-xs text-muted">{{
                        f.text(t.description)
                      }}</span>
                    </span>
                  </RouterLink>
                </div>
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
          <RouterLink
            to="/store"
            class="inline-flex h-8 items-center rounded-md px-3 font-medium text-fg-2 hover:text-fg"
            active-class="!text-fg"
            >{{ $t('store.nav.pricing') }}</RouterLink
          >
          <RouterLink
            to="/announcements"
            class="inline-flex h-8 items-center rounded-md px-3 font-medium text-fg-2 hover:text-fg"
            active-class="!text-fg"
            >{{ $t('store.nav.announcements') }}</RouterLink
          >
        </nav>
        <div class="ml-auto flex items-center gap-1">
          <LocaleMenu />
          <ThemeToggle />
          <RouterLink
            v-if="cart.count"
            to="/checkout"
            class="relative grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
            :aria-label="$t('nav.cart')"
          >
            <ShoppingCart class="size-4" />
            <span
              class="num absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-white"
              >{{ cart.count }}</span
            >
          </RouterLink>
          <template v-if="session.user">
            <span class="ml-2 hidden sm:block"
              ><UiButton :to="consoleHome" variant="secondary" size="sm">{{
                $t('store.nav.console')
              }}</UiButton></span
            >
            <div class="ml-1"><UserMenu /></div>
          </template>
          <template v-else>
            <span class="ml-1 hidden sm:block"
              ><UiButton to="/login" variant="ghost" size="sm">{{ $t('auth.signIn') }}</UiButton></span
            >
            <UiButton to="/register" variant="primary" size="sm">{{ $t('auth.signUp') }}</UiButton>
          </template>
          <button
            class="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 md:hidden"
            :aria-label="$t('nav.menu')"
            @click="mobileOpen = true"
          >
            <Menu class="size-5" />
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1"><RouterView /></main>

    <footer class="border-t border-line bg-bg">
      <div
        class="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
      >
        <div>
          <div class="flex items-center gap-2.5">
            <BrandMark :logo="site.settings.data.value?.logo" :size="24" />
            <span class="font-semibold">{{ site.name.value }}</span>
          </div>
          <p class="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">
            {{ f.text(site.settings.data.value?.tagline) || $t('store.footer.tagline') }}
          </p>
          <p v-if="site.settings.data.value?.support_email" class="mt-4 text-[13px] text-fg-2">
            {{ site.settings.data.value.support_email }}
          </p>
        </div>
        <div>
          <h3 class="text-[13px] font-semibold text-fg">{{ $t('store.nav.products') }}</h3>
          <ul class="mt-3 space-y-2 text-[13px] text-muted">
            <li v-for="t in types" :key="t.id">
              <RouterLink :to="{ path: '/store', query: { type: t.slug } }" class="hover:text-fg">{{
                f.text(t.name)
              }}</RouterLink>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-[13px] font-semibold text-fg">{{ $t('store.footer.account') }}</h3>
          <ul class="mt-3 space-y-2 text-[13px] text-muted">
            <li>
              <RouterLink to="/login" class="hover:text-fg">{{ $t('auth.signIn') }}</RouterLink>
            </li>
            <li>
              <RouterLink to="/register" class="hover:text-fg">{{ $t('auth.signUp') }}</RouterLink>
            </li>
            <li>
              <RouterLink to="/dashboard" class="hover:text-fg">{{ $t('nav.dashboard') }}</RouterLink>
            </li>
            <li>
              <RouterLink to="/tickets" class="hover:text-fg">{{ $t('nav.tickets') }}</RouterLink>
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-[13px] font-semibold text-fg">{{ $t('store.footer.company') }}</h3>
          <ul class="mt-3 space-y-2 text-[13px] text-muted">
            <li>
              <RouterLink to="/announcements" class="hover:text-fg">{{
                $t('store.nav.announcements')
              }}</RouterLink>
            </li>
            <li v-if="site.settings.data.value?.terms_url">
              <a :href="site.settings.data.value.terms_url" class="hover:text-fg" rel="noopener">{{
                $t('store.footer.terms')
              }}</a>
            </li>
            <li v-if="site.settings.data.value?.privacy_url">
              <a :href="site.settings.data.value.privacy_url" class="hover:text-fg" rel="noopener">{{
                $t('store.footer.privacy')
              }}</a>
            </li>
            <li v-if="site.settings.data.value?.social.telegram">
              <a
                :href="site.settings.data.value.social.telegram"
                class="hover:text-fg"
                rel="noopener noreferrer"
                target="_blank"
                >Telegram</a
              >
            </li>
          </ul>
        </div>
      </div>
      <div class="border-t border-line">
        <div
          class="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-5 text-xs text-faint sm:flex-row sm:justify-between"
        >
          <span>© {{ year }} {{ site.settings.data.value?.company_name || site.name.value }}</span>
          <span>{{ site.settings.data.value?.company_address }}</span>
        </div>
      </div>
    </footer>

    <UiSheet v-model:open="mobileOpen" :title="site.name.value">
      <div class="flex flex-col gap-1 p-3 text-sm">
        <RouterLink
          v-for="t in types"
          :key="t.id"
          :to="{ path: '/store', query: { type: t.slug } }"
          class="rounded-md px-3 py-2.5 hover:bg-surface-2"
          @click="mobileOpen = false"
          >{{ f.text(t.name) }}</RouterLink
        >
        <RouterLink
          to="/announcements"
          class="rounded-md px-3 py-2.5 hover:bg-surface-2"
          @click="mobileOpen = false"
          >{{ $t('store.nav.announcements') }}</RouterLink
        >
        <div class="my-2 h-px bg-line" />
        <template v-if="session.user">
          <UiButton :to="consoleHome" variant="primary" block @click="mobileOpen = false">{{
            $t('store.nav.console')
          }}</UiButton>
        </template>
        <template v-else>
          <UiButton to="/register" variant="primary" block @click="mobileOpen = false">{{
            $t('auth.signUp')
          }}</UiButton>
          <UiButton to="/login" variant="secondary" block class="mt-2" @click="mobileOpen = false">{{
            $t('auth.signIn')
          }}</UiButton>
        </template>
      </div>
    </UiSheet>
  </div>
</template>
