<script setup lang="ts">
import { useSite } from '@/shared/composables/site'
import BrandMark from '@/shared/ui/BrandMark.vue'
import DemoBanner from '../components/DemoBanner.vue'
import LocaleMenu from '../components/LocaleMenu.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const site = useSite()
</script>

<template>
  <div class="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
    <DemoBanner />
    <div class="glow pointer-events-none absolute inset-0" />
    <div class="bg-grid mask-radial pointer-events-none absolute inset-0" />
    <header class="relative flex h-16 items-center justify-between px-5 sm:px-8">
      <RouterLink to="/" class="flex items-center gap-2.5">
        <BrandMark :logo="site.settings.data.value?.logo" />
        <span class="text-[15px] font-semibold tracking-tight">{{ site.name.value }}</span>
      </RouterLink>
      <div class="flex items-center gap-1"><LocaleMenu :show-currency="false" /><ThemeToggle /></div>
    </header>
    <main class="relative flex flex-1 items-start justify-center px-4 pt-[6vh] pb-16 sm:items-center sm:pt-0">
      <div class="w-full max-w-[400px] animate-rise"><RouterView /></div>
    </main>
    <footer class="relative pb-6 text-center text-xs text-faint">
      © {{ new Date().getFullYear() }} {{ site.settings.data.value?.company_name || site.name.value }}
    </footer>
  </div>
</template>
