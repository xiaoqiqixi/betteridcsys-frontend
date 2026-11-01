<script setup lang="ts">
import type { Component } from 'vue'
import { useRoute } from 'vue-router'
import UiTooltip from '@/shared/ui/UiTooltip.vue'

export interface NavItem {
  to: string
  label: string
  icon: Component
  exact?: boolean
  badge?: number | string | null
}
export interface NavGroup {
  label?: string
  items: NavItem[]
}
defineProps<{ groups: NavGroup[]; collapsed?: boolean }>()
defineEmits<{ navigate: [] }>()
const route = useRoute()
const active = (i: NavItem) =>
  i.exact ? route.path === i.to : route.path === i.to || route.path.startsWith(i.to + '/')
</script>

<template>
  <nav class="flex flex-col gap-5">
    <div v-for="(g, gi) in groups" :key="gi" class="flex flex-col gap-0.5">
      <p
        v-if="g.label && !collapsed"
        class="mb-1 px-2.5 text-[11px] font-medium tracking-wide text-faint uppercase"
      >
        {{ g.label }}
      </p>
      <div v-else-if="g.label && collapsed && gi > 0" class="mx-auto mb-1 h-px w-6 bg-line" />
      <template v-for="item in g.items" :key="item.to">
        <component
          :is="collapsed ? UiTooltip : 'div'"
          v-bind="collapsed ? { text: item.label, side: 'right' } : {}"
        >
          <RouterLink
            :to="item.to"
            :aria-current="active(item) ? 'page' : undefined"
            :class="[
              'group relative flex h-9 items-center gap-2.5 rounded-md text-[13.5px] font-medium transition-colors',
              collapsed ? 'justify-center' : 'px-2.5',
              active(item)
                ? 'bg-surface-2 text-fg shadow-xs ring-1 ring-line'
                : 'text-muted hover:bg-surface-2/70 hover:text-fg',
            ]"
            @click="$emit('navigate')"
          >
            <component
              :is="item.icon"
              :class="[
                'size-[17px] shrink-0',
                active(item) ? 'text-primary' : 'text-faint group-hover:text-muted',
              ]"
            />
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            <span
              v-if="item.badge && !collapsed"
              class="num ml-auto rounded-full bg-primary-soft px-1.5 text-[11px] leading-[18px] font-semibold text-primary"
              >{{ item.badge }}</span
            >
            <span
              v-else-if="item.badge && collapsed"
              class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
            />
          </RouterLink>
        </component>
      </template>
    </div>
  </nav>
</template>
