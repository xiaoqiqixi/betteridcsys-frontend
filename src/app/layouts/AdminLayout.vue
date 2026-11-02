<script setup lang="ts">
import {
  FolderTree,
  Gauge,
  Gift,
  LifeBuoy,
  Megaphone,
  Package,
  Plug,
  Receipt,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  Timer,
  Users,
} from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Permission } from '@/contract/identity'
import { useSession } from '@/shared/stores/session'
import ConsoleShell from './ConsoleShell.vue'
import type { NavGroup, NavItem } from '../components/SidebarNav.vue'

const { t } = useI18n()
const session = useSession()

type Def = NavItem & { perm: Permission }
const def = (to: string, key: string, icon: NavItem['icon'], perm: Permission, exact = false): Def => ({
  to,
  label: t(`admin.nav.${key}`),
  icon,
  perm,
  exact,
})

const groups = computed<NavGroup[]>(() =>
  [
    { items: [def('/admin', 'overview', Gauge, 'overview.read', true)] },
    {
      label: t('admin.nav.groupBusiness'),
      items: [
        def('/admin/clients', 'clients', Users, 'clients.read'),
        def('/admin/orders', 'orders', ShoppingBag, 'orders.read'),
        def('/admin/services', 'services', Server, 'services.read'),
      ],
    },
    {
      label: t('admin.nav.groupBilling'),
      items: [
        def('/admin/invoices', 'invoices', Receipt, 'invoices.read'),
        def('/admin/coupons', 'coupons', TicketPercent, 'products.read'),
      ],
    },
    {
      label: t('admin.nav.groupCatalog'),
      items: [
        def('/admin/products', 'products', Package, 'products.read'),
        def('/admin/catalog', 'catalog', FolderTree, 'products.read'),
      ],
    },
    {
      label: t('admin.nav.groupSupport'),
      items: [
        def('/admin/tickets', 'tickets', LifeBuoy, 'tickets.read'),
        def('/admin/announcements', 'announcements', Megaphone, 'content.write'),
      ],
    },
    {
      label: t('admin.nav.groupSystem'),
      items: [
        def('/admin/automation', 'automation', Timer, 'automation.write'),
        def('/admin/integrations', 'integrations', Plug, 'integrations.write'),
        def('/admin/staff', 'staff', ShieldCheck, 'staff.write'),
        def('/admin/audit', 'audit', ScrollText, 'audit.read'),
        def('/admin/affiliate', 'affiliate', Gift, 'settings.write'),
        def('/admin/settings', 'settings', Settings, 'settings.write'),
      ],
    },
  ]
    .map((g) => ({ ...g, items: (g.items as Def[]).filter((i) => session.can(i.perm)) }))
    .filter((g) => g.items.length),
)
</script>

<template>
  <ConsoleShell :groups="groups" home="/admin" badge="Admin">
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
