<script setup lang="ts">
import { Megaphone, Pin } from '@lucide/vue'
import { api } from '@/contract'
import { useApiList } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const f = useFormat()
const list = useApiList(api.site.announcements, { query: { limit: 20 } })
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 py-14">
    <h1 class="text-[32px] font-semibold tracking-tight">{{ $t('store.nav.announcements') }}</h1>
    <p class="mt-2 text-[15px] text-muted">{{ $t('announcements.subtitle') }}</p>
    <div class="mt-10">
      <UiSkeleton v-if="list.isPending.value" :lines="6" />
      <UiErrorState v-else-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiEmpty v-else-if="!list.items.value.length" :icon="Megaphone" :title="$t('announcements.empty')" />
      <ol v-else class="relative border-l border-line">
        <li v-for="a in list.items.value" :key="a.id" class="relative pb-10 pl-7 last:pb-0">
          <span
            class="absolute top-1.5 -left-[5px] size-2.5 rounded-full border-2 border-bg"
            :class="a.pinned ? 'bg-primary' : 'bg-line-strong'"
          />
          <p class="flex items-center gap-2 text-xs text-muted">
            <UiTime :value="a.published_at" />
            <span v-if="a.pinned" class="inline-flex items-center gap-1 text-primary"
              ><Pin class="size-3" />{{ $t('announcements.pinned') }}</span
            >
          </p>
          <h2 class="mt-1.5 text-lg font-semibold">{{ f.text(a.title) }}</h2>
          <p class="mt-2 text-sm leading-relaxed whitespace-pre-line text-fg-2">{{ f.text(a.body) }}</p>
        </li>
      </ol>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>
  </div>
</template>
