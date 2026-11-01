<script setup lang="ts">
import type { Component } from 'vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

export interface MenuItem {
  label?: string
  icon?: Component
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  heading?: boolean
  onSelect?: () => void
}
withDefaults(defineProps<{ items: MenuItem[]; align?: 'start' | 'end'; width?: string }>(), {
  align: 'end',
  width: 'w-52',
})
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger as-child><slot /></DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        :align="align"
        :side-offset="6"
        :class="[
          'z-[60] rounded-lg border border-line bg-elevated p-1 shadow-md data-[state=open]:animate-pop',
          width,
        ]"
      >
        <slot name="header" />
        <template v-for="(item, i) in items" :key="i">
          <DropdownMenuSeparator v-if="item.separator" class="my-1 h-px bg-line" />
          <DropdownMenuLabel v-else-if="item.heading" class="px-2.5 pt-2 pb-1 text-xs font-medium text-faint">
            {{ item.label }}
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-else
            :disabled="item.disabled"
            :class="[
              'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none select-none data-[disabled]:opacity-40',
              item.danger
                ? 'text-danger data-[highlighted]:bg-danger-soft'
                : 'text-fg-2 data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg',
            ]"
            @select="item.onSelect?.()"
          >
            <component :is="item.icon" v-if="item.icon" class="size-4 shrink-0 opacity-80" />
            {{ item.label }}
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
