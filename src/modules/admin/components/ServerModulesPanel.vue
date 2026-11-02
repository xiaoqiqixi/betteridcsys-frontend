<script setup lang="ts">
import { api } from '@/contract/admin-endpoints'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import UiInput from '@/shared/ui/UiInput.vue'

const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const fail = (error: unknown) => toast.error(errors.text(error))
const modules = useApiQuery(api.admin.modules)
const connections = useApiQuery(api.admin.connections)
const test = useApiMutation(api.admin.testConnection, { invalidates: [api.admin.connections] })
const sync = useApiMutation(api.admin.syncConnectionImages, { invalidates: [api.admin.osImages] })
const patch = useApiMutation(api.admin.updateConnection, { invalidates: [api.admin.connections] })
</script>

<template>
  <div class="grid min-w-0 gap-6">
    <UiErrorState v-if="modules.isError.value" :error="modules.error.value" @retry="modules.refetch()" />
    <UiSkeleton v-else-if="!modules.data.value" :lines="3" />
    <div v-else class="grid gap-4 md:grid-cols-2">
      <UiCard v-for="mod in modules.data.value" :key="mod.id">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-medium">{{ f.text(mod.name) }}</h2>
          <UiStatus kind="gateway" :value="mod.status" />
        </div>
        <p class="mt-2 font-mono text-xs break-all text-muted">{{ mod.id }} · {{ mod.version }}</p>
        <p class="mt-3 text-sm text-muted">
          {{ $t('serverModules.capabilities') }}: {{ mod.capabilities.join(', ') || '—' }}
        </p>
      </UiCard>
      <p v-if="!modules.data.value.length" class="text-sm text-muted">{{ $t('serverModules.noModules') }}</p>
    </div>
    <section class="grid min-w-0 gap-3">
      <h2 class="font-semibold">{{ $t('serverModules.connections') }}</h2>
      <UiErrorState
        v-if="connections.isError.value"
        :error="connections.error.value"
        @retry="connections.refetch()"
      />
      <UiSkeleton v-else-if="!connections.data.value" :lines="4" />
      <template v-else>
        <UiCard v-for="c in connections.data.value" :key="c.id">
          <div class="flex flex-wrap items-start gap-4">
            <div class="grid min-w-0 flex-1 gap-2">
              <UiInput
                :model-value="c.name"
                :aria-label="$t('serverModules.connectionName')"
                maxlength="80"
                :disabled="patch.isPending.value"
                @change="
                  (e: Event) =>
                    patch.mutate(
                      {
                        params: { id: c.id },
                        body: { revision: c.revision, name: (e.target as HTMLInputElement).value },
                      },
                      { onError: fail },
                    )
                "
              />
              <p class="font-mono text-xs break-all text-muted">{{ c.id }} · {{ c.module_id }}</p>
              <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                <UiStatus kind="controller" :value="c.status" />
                <span>{{ $t('serverModules.serviceCount', { count: c.service_count }) }}</span>
                <span
                  >{{ $t('admin.integration.lastChecked') }}
                  <UiTime :value="c.last_checked_at" mode="relative"
                /></span>
              </div>
            </div>
            <UiSwitch
              :model-value="c.enabled"
              :aria-label="$t('serverModules.enableConnection', { name: c.name })"
              :disabled="patch.isPending.value"
              @update:model-value="
                (enabled) =>
                  patch.mutate(
                    { params: { id: c.id }, body: { revision: c.revision, enabled } },
                    { onError: fail },
                  )
              "
            />
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <UiButton
              size="sm"
              :loading="test.isPending.value && test.variables.value?.params.id === c.id"
              :disabled="test.isPending.value"
              @click="test.mutate({ params: { id: c.id }, body: {} }, { onError: fail })"
              >{{ $t('serverModules.test') }}</UiButton
            >
            <UiButton
              size="sm"
              :loading="sync.isPending.value && sync.variables.value?.params.id === c.id"
              :disabled="!c.enabled || sync.isPending.value"
              @click="sync.mutate({ params: { id: c.id }, body: {} }, { onError: fail })"
              >{{ $t('serverModules.syncImages') }}</UiButton
            >
          </div>
        </UiCard>
        <p v-if="!connections.data.value.length" class="text-sm text-muted">
          {{ $t('serverModules.noConnections') }}
        </p>
      </template>
      <p class="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
        {{ $t('serverModules.hostHint') }}
      </p>
    </section>
  </div>
</template>
