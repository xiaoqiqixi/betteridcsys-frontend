<script setup lang="ts">
import { LayoutDashboard, LogOut, Settings, Shield, UserRound } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSession } from '@/shared/stores/session'
import UiDropdown, { type MenuItem } from '@/shared/ui/UiDropdown.vue'

const session = useSession()
const router = useRouter()
const { t } = useI18n()
const initials = computed(() =>
  (session.user?.name || session.user?.email || '?').trim().slice(0, 1).toUpperCase(),
)

const items = computed<MenuItem[]>(() => {
  const list: MenuItem[] = []
  if (session.isStaff) {
    list.push({ label: t('nav.adminConsole'), icon: LayoutDashboard, onSelect: () => router.push('/admin') })
  } else {
    list.push(
      { label: t('nav.dashboard'), icon: LayoutDashboard, onSelect: () => router.push('/dashboard') },
      { label: t('nav.account'), icon: UserRound, onSelect: () => router.push('/account') },
      { label: t('nav.security'), icon: Shield, onSelect: () => router.push('/account/security') },
    )
  }
  if (session.isStaff)
    list.push({ label: t('nav.settings'), icon: Settings, onSelect: () => router.push('/admin/settings') })
  list.push(
    { separator: true },
    {
      label: t('auth.signOut'),
      icon: LogOut,
      danger: true,
      onSelect: async () => {
        await session.logout()
        await router.push('/login')
      },
    },
  )
  return list
})
</script>

<template>
  <UiDropdown v-if="session.user" :items="items" width="w-60">
    <button
      class="flex items-center gap-2 rounded-full p-0.5 pr-0.5 transition-colors hover:bg-surface-2 sm:pr-2.5"
      :aria-label="$t('nav.account')"
    >
      <span
        class="grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary to-[#8b5cf6] text-xs font-semibold text-white"
        >{{ initials }}</span
      >
      <span class="hidden max-w-32 truncate text-[13px] font-medium text-fg-2 sm:inline">{{
        session.user.name || session.user.email
      }}</span>
    </button>
    <template #header>
      <div class="border-b border-line px-2.5 pt-1.5 pb-2.5">
        <p class="truncate text-sm font-medium text-fg">{{ session.user.name }}</p>
        <p class="truncate text-xs text-muted">{{ session.user.email }}</p>
      </div>
    </template>
  </UiDropdown>
</template>
