<script setup lang="ts">
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

const open = defineModel<boolean>('open', { default: false })
withDefaults(
  defineProps<{
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    dismissible?: boolean
  }>(),
  { size: 'md', dismissible: true },
)
</script>

<template>
  <DialogRoot v-model:open="open">
    <slot name="trigger" />
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-fade-in"
      />
      <DialogContent
        :class="[
          'fixed top-1/2 left-1/2 z-50 flex max-h-[min(88dvh,820px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col',
          'rounded-xl border border-line bg-elevated shadow-lg outline-none data-[state=open]:animate-pop',
          {
            'max-w-sm': size === 'sm',
            'max-w-lg': size === 'md',
            'max-w-2xl': size === 'lg',
            'max-w-4xl': size === 'xl',
          },
        ]"
        @escape-key-down="(e: Event) => !dismissible && e.preventDefault()"
        @pointer-down-outside="(e: Event) => !dismissible && e.preventDefault()"
      >
        <header class="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <DialogTitle class="text-base font-semibold text-fg">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-[13px] text-muted">{{
              description
            }}</DialogDescription>
          </div>
          <DialogClose
            v-if="dismissible"
            class="-mr-2 grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
            :aria-label="$t('common.close')"
          >
            <X class="size-4" />
          </DialogClose>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-5"><slot /></div>
        <footer
          v-if="$slots.footer"
          class="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-3.5"
        >
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
