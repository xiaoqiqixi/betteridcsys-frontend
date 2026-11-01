<script setup lang="ts">
import { History } from '@lucide/vue'
import { api } from '@/contract'
import { useApiList } from '@/shared/api/query'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const list = useApiList(api.account.activity, { query: { limit: 25 } })
</script>

<template>
  <UiCard :title="$t('account.tab.activity')" :description="$t('account.activityHint')" :padded="false">
    <div v-if="list.isPending.value" class="p-5"><UiSkeleton :lines="5" /></div>
    <UiErrorState v-else-if="list.isError.value" :error="list.error.value" compact @retry="list.refetch()" />
    <UiEmpty v-else-if="!list.items.value.length" compact :icon="History" :title="$t('account.noActivity')" />
    <ul v-else class="divide-y divide-line">
      <li
        v-for="e in list.items.value"
        :key="e.id"
        class="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]"
      >
        <div class="min-w-0 flex-1">
          <p class="font-medium text-fg">{{ e.action }}</p>
          <p v-if="e.subject" class="text-xs text-muted">{{ e.subject }}</p>
        </div>
        <span class="text-xs text-muted">{{ $t(`account.actor.${e.actor_type}`) }}</span>
        <span v-if="e.ip" class="font-mono text-xs text-faint">{{ e.ip }}</span>
        <UiTime :value="e.at" mode="datetime" class="text-xs text-muted" />
      </li>
    </ul>
    <UiLoadMore
      :has-more="!!list.hasNextPage.value"
      :loading="list.isFetchingNextPage.value"
      @more="list.fetchNextPage()"
    />
  </UiCard>
</template>
