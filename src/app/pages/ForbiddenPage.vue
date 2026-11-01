<script setup lang="ts">
import { ShieldOff } from '@lucide/vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
</script>

<template>
  <UiEmpty :icon="ShieldOff" :title="$t('forbidden.title')" :description="$t('forbidden.body')" />
</template>
