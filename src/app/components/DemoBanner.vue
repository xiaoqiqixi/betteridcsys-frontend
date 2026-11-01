<script setup lang="ts">
import { FlaskConical } from '@lucide/vue'
import { useSession } from '@/shared/stores/session'

const session = useSession()
</script>

<template>
  <div
    v-if="session.demo"
    class="flex items-center justify-center gap-2 bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning"
  >
    <FlaskConical class="size-3.5" />{{ $t('demo.banner') }}
  </div>
</template>
