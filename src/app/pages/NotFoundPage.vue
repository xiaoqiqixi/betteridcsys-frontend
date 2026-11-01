<script setup lang="ts">
import UiButton from '@/shared/ui/UiButton.vue'
</script>

<template>
  <div class="relative grid min-h-dvh place-items-center overflow-hidden bg-bg px-6">
    <div class="glow pointer-events-none absolute inset-0" />
    <div class="bg-grid mask-radial pointer-events-none absolute inset-0" />
    <div class="relative text-center">
      <p class="num text-gradient text-[112px] leading-none font-semibold tracking-tighter">404</p>
      <h1 class="mt-4 text-xl font-semibold">{{ $t('notFound.title') }}</h1>
      <p class="mt-2 text-sm text-muted">{{ $t('notFound.body') }}</p>
      <UiButton to="/" variant="primary" class="mt-6">{{ $t('notFound.home') }}</UiButton>
    </div>
  </div>
</template>
