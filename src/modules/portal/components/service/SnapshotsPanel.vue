<script setup lang="ts">
import { Camera, RotateCcw, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { Service } from '@/contract/commerce'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const props = defineProps<{ service: Service }>()
const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const list = useApiQuery(api.services.snapshots, () => ({ params: { id: props.service.id } }), {
  refetchInterval: (): number | false => (busy.value ? 4000 : false),
})
const busy = computed(
  (): boolean => !!list.data.value?.items.some((s) => s.status === 'creating' || s.status === 'restoring'),
)
const name = ref('')
const stoppedOk = computed(() => !list.data.value?.requires_stopped || props.service.power === 'stopped')
const full = computed(
  () =>
    !!list.data.value && list.data.value.limit > 0 && list.data.value.items.length >= list.data.value.limit,
)
const fail = (e: unknown) => toast.error(errors.text(e))
const inv = [api.services.snapshots, api.services.get]
const create = useApiMutation(api.services.createSnapshot, {
  invalidates: inv,
  onSuccess: () => {
    name.value = ''
    toast.success(t('service.snapshotStarted'))
  },
})
const restore = useApiMutation(api.services.restoreSnapshot, {
  invalidates: inv,
  onSuccess: () => toast.success(t('service.restoreStarted')),
})
const remove = useApiMutation(api.services.deleteSnapshot, { invalidates: inv })

async function doRestore(id: string, label: string) {
  const target = props.service.hostname || props.service.id
  if (
    await confirm({
      title: t('service.restoreTitle', { name: label }),
      body: t('service.restoreBody'),
      tone: 'danger',
      typed: target,
      confirmLabel: t('service.restore'),
    })
  ) {
    restore.mutate(
      { params: { id: props.service.id, snapshot_id: id }, body: { confirm: target } },
      { onError: fail },
    )
  }
}
async function doDelete(id: string, label: string) {
  if (
    await confirm({
      title: t('service.deleteSnapshot', { name: label }),
      tone: 'danger',
      confirmLabel: t('common.delete'),
    })
  ) {
    remove.mutate({ params: { id: props.service.id, snapshot_id: id } }, { onError: fail })
  }
}
</script>

<template>
  <div class="rounded-lg border border-line bg-surface shadow-xs">
    <div class="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-[15px] font-semibold">{{ $t('service.snapshots') }}</h2>
        <p class="mt-0.5 text-[13px] text-muted">
          {{
            list.data.value
              ? $t('service.snapshotQuota', {
                  used: list.data.value.items.length,
                  limit: list.data.value.limit || '∞',
                })
              : ''
          }}
          <template v-if="list.data.value?.requires_stopped"> · {{ $t('service.snapshotStopped') }}</template>
        </p>
      </div>
      <form
        class="flex gap-2"
        @submit.prevent="
          create.mutate({ params: { id: service.id }, body: { name: name.trim() } }, { onError: fail })
        "
      >
        <UiInput
          v-model="name"
          size="sm"
          :placeholder="$t('service.snapshotName')"
          maxlength="60"
          class="sm:w-52"
        />
        <UiButton
          type="submit"
          size="sm"
          variant="primary"
          :loading="create.isPending.value"
          :disabled="!name.trim() || !stoppedOk || full"
        >
          <Camera class="size-3.5" />{{ $t('service.takeSnapshot') }}
        </UiButton>
      </form>
    </div>
    <div v-if="list.isPending.value" class="p-5"><UiSkeleton :lines="3" /></div>
    <UiErrorState v-else-if="list.isError.value" compact :error="list.error.value" @retry="list.refetch()" />
    <UiEmpty
      v-else-if="!list.data.value?.items.length"
      compact
      :icon="Camera"
      :title="$t('service.noSnapshots')"
      :description="$t('service.noSnapshotsBody')"
    />
    <ul v-else class="divide-y divide-line">
      <li v-for="s in list.data.value.items" :key="s.id" class="flex flex-wrap items-center gap-3 px-5 py-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ s.name }}</p>
          <p class="text-xs text-muted">
            <UiTime :value="s.created_at" mode="datetime" /><template v-if="s.size_gb != null">
              · {{ s.size_gb }} GB</template
            >
          </p>
        </div>
        <UiStatus
          kind="task"
          :value="s.status === 'ready' ? 'succeeded' : s.status === 'failed' ? 'failed' : 'running'"
        />
        <UiButton
          size="sm"
          variant="ghost"
          :disabled="s.status !== 'ready' || !stoppedOk"
          @click="doRestore(s.id, s.name)"
          ><RotateCcw class="size-3.5" />{{ $t('service.restore') }}</UiButton
        >
        <UiButton
          size="sm"
          variant="danger-ghost"
          square
          :aria-label="$t('common.delete')"
          :disabled="s.status === 'creating' || s.status === 'restoring'"
          @click="doDelete(s.id, s.name)"
          ><Trash2 class="size-3.5"
        /></UiButton>
      </li>
    </ul>
  </div>
</template>
