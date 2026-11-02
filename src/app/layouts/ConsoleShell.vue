<script setup lang="ts">
import { Menu, PanelLeftClose, PanelLeftOpen } from '@lucide/vue'
import { ref } from 'vue'
import { useSite } from '@/shared/composables/site'
import { usePrefs } from '@/shared/stores/prefs'
import BrandMark from '@/shared/ui/BrandMark.vue'
import UiSheet from '@/shared/ui/UiSheet.vue'
import DemoBanner from '../components/DemoBanner.vue'
import LocaleMenu from '../components/LocaleMenu.vue'
import SidebarNav, { type NavGroup } from '../components/SidebarNav.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import UserMenu from '../components/UserMenu.vue'

/** Shared chrome for the client portal and the admin console. */
defineProps<{ groups: NavGroup[]; home: string; badge?: string }>()
const prefs = usePrefs()
const site = useSite()
const mobileOpen = ref(false)
</script>

<template>
  <div class="min-h-dvh bg-bg">
    <DemoBanner />
    <div class="flex">
      <aside
        :class="[
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-bg transition-[width] duration-200 lg:flex',
          prefs.sidebarCollapsed ? 'w-[68px]' : 'w-[248px]',
        ]"
      >
        <div :class="['flex h-14 items-center gap-2.5', prefs.sidebarCollapsed ? 'justify-center' : 'px-4']">
          <RouterLink :to="home" :aria-label="site.name.value" class="flex min-w-0 items-center gap-2.5">
            <BrandMark :logo="site.settings.data.value?.logo" />
            <span
              v-if="!prefs.sidebarCollapsed"
              class="truncate text-[15px] font-semibold tracking-tight text-fg"
              >{{ site.name.value }}</span
            >
          </RouterLink>
          <span
            v-if="badge && !prefs.sidebarCollapsed"
            class="ml-auto rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase"
            >{{ badge }}</span
          >
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <slot name="sidebar-top" :collapsed="prefs.sidebarCollapsed" />
          <SidebarNav :groups="groups" :collapsed="prefs.sidebarCollapsed" />
        </div>
        <div class="border-t border-line p-3">
          <button
            class="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-[13px] text-muted hover:bg-surface-2 hover:text-fg"
            :aria-label="$t('nav.collapse')"
            :aria-expanded="!prefs.sidebarCollapsed"
            :class="prefs.sidebarCollapsed && 'justify-center px-0'"
            @click="prefs.sidebarCollapsed = !prefs.sidebarCollapsed"
          >
            <PanelLeftOpen v-if="prefs.sidebarCollapsed" class="size-4" />
            <template v-else><PanelLeftClose class="size-4" />{{ $t('nav.collapse') }}</template>
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-6"
        >
          <button
            class="-ml-1.5 grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 lg:hidden"
            :aria-label="$t('nav.menu')"
            @click="mobileOpen = true"
          >
            <Menu class="size-5" />
          </button>
          <RouterLink :to="home" :aria-label="site.name.value" class="flex items-center gap-2 lg:hidden"
            ><BrandMark :logo="site.settings.data.value?.logo" :size="24"
          /></RouterLink>
          <div class="min-w-0 flex-1"><slot name="header" /></div>
          <slot name="header-actions" />
          <LocaleMenu :show-currency="false" />
          <ThemeToggle />
          <div class="mx-1 h-5 w-px bg-line" />
          <UserMenu />
        </header>
        <main class="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <slot />
        </main>
      </div>
    </div>

    <UiSheet v-model:open="mobileOpen" :title="site.name.value" side="left">
      <div class="p-3">
        <slot name="sidebar-top" :collapsed="false" />
        <SidebarNav :groups="groups" @navigate="mobileOpen = false" />
      </div>
    </UiSheet>
  </div>
</template>
