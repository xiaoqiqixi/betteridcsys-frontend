<script setup lang="ts">
import {
  Gift,
  LayoutDashboard,
  LifeBuoy,
  Plus,
  Receipt,
  Server,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  Wallet,
} from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/client-endpoints'
import { useApiQuery } from '@/shared/api/query'
import { useCart } from '@/shared/stores/cart'
import UiButton from '@/shared/ui/UiButton.vue'
import ConsoleShell from './ConsoleShell.vue'
import type { NavGroup } from '../components/SidebarNav.vue'

const { t } = useI18n()
const cart = useCart()
const overview = useApiQuery(api.account.overview, {}, { staleTime: 60_000 })
const groups = computed<NavGroup[]>(() => {
  const c = overview.data.value?.counts
  return [
    {
      items: [
        { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, exact: true },
        { to: '/services', label: t('nav.services'), icon: Server, badge: c?.expiring_soon || null },
        { to: '/orders', label: t('nav.orders'), icon: ShoppingBag },
        { to: '/invoices', label: t('nav.invoices'), icon: Receipt, badge: c?.unpaid_invoices || null },
        { to: '/billing', label: t('nav.credit'), icon: Wallet },
      ],
    },
    {
      label: t('nav.groupSupport'),
      items: [
        { to: '/tickets', label: t('nav.tickets'), icon: LifeBuoy, badge: c?.open_tickets || null },
        { to: '/affiliate', label: t('nav.affiliate'), icon: Gift },
        { to: '/account', label: t('nav.account'), icon: UserRound },
      ],
    },
  ]
})
</script>

<template>
  <ConsoleShell :groups="groups" home="/dashboard">
    <template #sidebar-top="{ collapsed }">
      <UiButton
        to="/store"
        variant="primary"
        :block="!collapsed"
        :square="collapsed"
        :aria-label="$t('nav.newService')"
        class="mb-4"
      >
        <Plus class="size-4" /><span v-if="!collapsed">{{ $t('nav.newService') }}</span>
      </UiButton>
    </template>
    <template #header-actions>
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
    </template>
    <RouterView v-slot="{ Component }">
      <Transition
        enter-from-class="opacity-0 translate-y-1"
        enter-active-class="transition duration-200"
        mode="out-in"
      >
        <component :is="Component" />
      </Transition>
    </RouterView>
  </ConsoleShell>
</template>
