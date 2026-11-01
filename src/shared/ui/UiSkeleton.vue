<script setup lang="ts">
withDefaults(defineProps<{ lines?: number; height?: string }>(), { lines: 1, height: 'h-4' })
</script>

<template>
  <div class="flex flex-col gap-2" aria-hidden="true">
    <div
      v-for="i in lines"
      :key="i"
      :class="['skeleton rounded-md', height]"
      :style="{ width: i === lines && lines > 1 ? '62%' : '100%' }"
    />
  </div>
</template>
