<script setup lang="ts">
import UiButton from './UiButton.vue'

defineProps<{ hasMore: boolean; loading: boolean }>()
defineEmits<{ more: [] }>()
</script>

<template>
  <div v-if="hasMore" class="flex justify-center border-t border-line py-3">
    <UiButton variant="ghost" size="sm" :loading="loading" @click="$emit('more')">{{
      $t('common.loadMore')
    }}</UiButton>
  </div>
</template>
