<script setup lang="ts">
import { useRoute } from 'vue-router'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'

const route = useRoute()
const tabs = [
  { to: '/account', key: 'profile' },
  { to: '/account/security', key: 'security' },
  { to: '/account/ssh-keys', key: 'ssh' },
  { to: '/account/api-tokens', key: 'tokens' },
  { to: '/account/notifications', key: 'notifications' },
  { to: '/account/activity', key: 'activity' },
]
</script>

<template>
  <div>
    <UiPageHeader :title="$t('nav.account')" :description="$t('account.subtitle')" />
    <div class="flex flex-col gap-6 lg:flex-row">
      <nav
        class="-mx-4 flex shrink-0 gap-1 overflow-x-auto px-4 lg:mx-0 lg:w-52 lg:flex-col lg:px-0"
        :aria-label="$t('nav.account')"
      >
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          :class="[
            'rounded-md px-3 py-2 text-[13.5px] font-medium whitespace-nowrap transition-colors',
            route.path === tab.to
              ? 'bg-surface-2 text-fg shadow-xs ring-1 ring-line'
              : 'text-muted hover:bg-surface-2/60 hover:text-fg',
          ]"
        >
          {{ $t(`account.tab.${tab.key}`) }}
        </RouterLink>
      </nav>
      <div class="min-w-0 flex-1"><RouterView /></div>
    </div>
  </div>
</template>
