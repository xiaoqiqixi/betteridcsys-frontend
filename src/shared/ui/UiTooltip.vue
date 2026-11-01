<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'

withDefaults(defineProps<{ text: string; side?: 'top' | 'bottom' | 'left' | 'right' }>(), { side: 'top' })
</script>

<template>
  <TooltipRoot :delay-duration="250">
    <TooltipTrigger as-child><slot /></TooltipTrigger>
    <TooltipPortal>
      <TooltipContent
        :side="side"
        :side-offset="6"
        class="z-[70] max-w-xs rounded-md bg-fg px-2 py-1 text-xs text-bg shadow-md data-[state=delayed-open]:animate-fade-in"
      >
        {{ text }}
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
