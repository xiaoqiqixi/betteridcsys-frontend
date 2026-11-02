<script setup lang="ts">
import { X } from '@lucide/vue'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

const open = defineModel<boolean>('open', { default: false })
withDefaults(defineProps<{ title: string; side?: 'left' | 'right' }>(), { side: 'right' })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in" />
      <DialogContent
        :aria-describedby="undefined"
        :class="[
          'fixed inset-y-0 z-50 flex w-[min(88vw,380px)] flex-col border-line bg-elevated shadow-lg outline-none',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
        ]"
      >
        <header class="flex h-14 items-center justify-between border-b border-line px-4">
          <DialogTitle class="text-sm font-semibold">{{ title }}</DialogTitle>
          <DialogClose
            class="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2"
            :aria-label="$t('common.close')"
          >
            <X class="size-4" />
          </DialogClose>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto"><slot /></div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
