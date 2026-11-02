<script setup lang="ts">
import { ChevronDown, Play, PlayCircle, RefreshCw, ShieldOff, Trash2 } from '@lucide/vue'
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { z } from 'zod'
import { api } from '@/contract/admin-endpoints'
import type { AdminServiceAction } from '@/contract/admin'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { parseDecimal } from '@/shared/lib/money'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiCopy from '@/shared/ui/UiCopy.vue'
import UiDropdown, { type MenuItem } from '@/shared/ui/UiDropdown.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import ReasonDialog from '../components/ReasonDialog.vue'

type Action = z.infer<typeof AdminServiceAction>['action']
const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const id = computed(() => String(route.params.id))
const polling = ref(false)
const service = useApiQuery(api.admin.service, () => ({ params: { id: id.value } }), {
  refetchInterval: (): number | false => (polling.value ? 3000 : false),
})
const s = computed(() => service.data.value)
watchEffect(
  () =>
    (polling.value =
      !!s.value?.tasks.some((x) => x.status === 'queued' || x.status === 'running') ||
      s.value?.status === 'provisioning'),
)

const edit = reactive({ next_due_at: '', auto_renew: false, override: '' })
watch(
  s,
  (v) => {
    if (!v) return
    edit.next_due_at = v.next_due_at ? v.next_due_at.slice(0, 10) : ''
    edit.auto_renew = v.auto_renew
    edit.override = v.price_override
      ? (v.price_override.amount_minor / 10 ** v.price_override.decimal_places).toFixed(
          v.price_override.decimal_places,
        )
      : ''
  },
  { immediate: true },
)
const fail = (e: unknown) => toast.error(errors.text(e))
const update = useApiMutation(api.admin.updateService, {
  invalidates: [api.admin.service, api.admin.services],
  onSuccess: () => toast.success(t('common.saved')),
})
function save() {
  if (!s.value) return
  const dec = s.value.recurring.decimal_places
  const override = edit.override.trim() === '' ? null : parseDecimal(edit.override, dec)
  if (edit.override.trim() !== '' && override === null) return toast.error(t('billing.invalidAmount'))
  update.mutate(
    {
      params: { id: id.value },
      body: {
        revision: s.value.revision,
        auto_renew: edit.auto_renew,
        price_override_minor: override,
        ...(edit.next_due_at ? { next_due_at: new Date(edit.next_due_at + 'T00:00:00Z').toISOString() } : {}),
      },
    },
    { onError: fail },
  )
}

const action = useApiMutation(api.admin.serviceAction, {
  invalidates: [api.admin.service, api.admin.services],
})
const pending = ref<Action | null>(null)
const dialogOpen = computed({ get: () => !!pending.value, set: (v) => !v && (pending.value = null) })
function run(a: Action, reason?: string) {
  action.mutate(
    {
      params: { id: id.value },
      body: { action: a, ...(reason ? { reason } : {}), ...(a === 'terminate' ? { confirm: id.value } : {}) },
    },
    {
      onSuccess: () => {
        pending.value = null
        toast.success(t('admin.service.actionQueued', { action: t(`admin.service.action.${a}`) }))
      },
      onError: fail,
    },
  )
}
const NEEDS_REASON = new Set<Action>(['suspend', 'unsuspend', 'terminate', 'force_off'])
function ask(a: Action) {
  if (NEEDS_REASON.has(a)) pending.value = a
  else run(a)
}
const powerItems = computed<MenuItem[]>(() => [
  { label: t('service.power.start'), onSelect: () => ask('start') },
  { label: t('service.power.reboot'), onSelect: () => ask('reboot') },
  { label: t('service.power.stop'), onSelect: () => ask('stop') },
  { separator: true },
  { label: t('service.power.force_off'), danger: true, onSelect: () => ask('force_off') },
])
</script>

<template>
  <div>
    <UiErrorState v-if="service.isError.value" :error="service.error.value" @retry="service.refetch()" />
    <UiSkeleton v-else-if="!s" :lines="8" />
    <template v-else>
      <UiPageHeader
        :title="s.label || s.hostname || s.product_name"
        back="/admin/services"
        :back-label="$t('admin.nav.services')"
      >
        <template #badges
          ><UiStatus kind="service" :value="s.status" /><UiStatus
            v-if="s.power"
            kind="power"
            :value="s.power"
        /></template>
        <template #meta>
          <p class="mt-1 text-[13px] text-muted">
            <RouterLink
              :to="{ name: 'admin-client', params: { id: s.client_id } }"
              class="text-fg-2 underline underline-offset-2 hover:text-primary"
              >{{ s.client_email }}</RouterLink
            >
            · {{ s.product_name }} · {{ s.region }} · <span class="font-mono text-xs">{{ s.id }}</span>
          </p>
        </template>
        <template #actions>
          <template v-if="session.can('services.write')">
            <UiButton
              v-if="s.status === 'pending' || s.status === 'failed'"
              variant="primary"
              :loading="action.isPending.value"
              @click="ask('provision')"
              ><PlayCircle class="size-4" />{{ $t('admin.service.action.provision') }}</UiButton
            >
            <UiButton v-if="s.status === 'active'" @click="ask('suspend')"
              ><ShieldOff class="size-4" />{{ $t('admin.service.action.suspend') }}</UiButton
            >
            <UiButton v-if="s.status === 'suspended'" variant="primary" @click="ask('unsuspend')"
              ><Play class="size-4" />{{ $t('admin.service.action.unsuspend') }}</UiButton
            >
            <UiButton
              :loading="action.isPending.value && action.variables.value?.body.action === 'sync'"
              @click="ask('sync')"
              ><RefreshCw class="size-4" />{{ $t('admin.service.action.sync') }}</UiButton
            >
          </template>
          <UiDropdown
            v-if="session.can('services.power') && s.status === 'active'"
            :items="powerItems"
            width="w-48"
          >
            <UiButton>{{ $t('service.powerMenu') }}<ChevronDown class="size-3.5 opacity-60" /></UiButton>
          </UiDropdown>
          <UiButton
            v-if="session.can('services.terminate') && s.status !== 'terminated'"
            variant="danger-ghost"
            @click="ask('terminate')"
            ><Trash2 class="size-4" />{{ $t('admin.service.action.terminate') }}</UiButton
          >
        </template>
      </UiPageHeader>

      <div
        v-if="s.cancellation"
        class="mb-5 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] text-warning"
      >
        {{ $t('admin.service.cancellation', { type: $t(`service.cancelType.${s.cancellation.type}`) }) }} —
        “{{ s.cancellation.reason }}” · <UiTime :value="s.cancellation.requested_at" mode="relative" />
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div class="flex flex-col gap-6">
          <UiCard :title="$t('service.configuration')">
            <dl class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt class="text-xs text-muted">vCPU</dt>
                <dd class="mt-1 font-medium">{{ s.specs.cpu_cores }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">{{ $t('specs.memory') }}</dt>
                <dd class="mt-1 font-medium">{{ f.memory(s.specs.memory_mb) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">{{ $t('specs.disk') }}</dt>
                <dd class="mt-1 font-medium">{{ s.specs.disk_gb }} GB</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">{{ $t('configure.os') }}</dt>
                <dd class="mt-1 font-medium">
                  {{ s.os_image ? `${s.os_image.name} ${s.os_image.version}` : '—' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted">{{ $t('admin.service.controller') }}</dt>
                <dd class="mt-1 font-mono text-[13px]">{{ s.controller_id ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">{{ $t('admin.service.resource') }}</dt>
                <dd class="mt-1">
                  <UiCopy v-if="s.resource_id" :text="s.resource_id" mono /><span v-else class="text-faint"
                    >—</span
                  >
                </dd>
              </div>
              <div class="col-span-2 sm:col-span-3">
                <dt class="text-xs text-muted">{{ $t('service.addresses') }}</dt>
                <dd class="mt-1 flex flex-wrap gap-x-4">
                  <UiCopy v-for="ip in [...s.ipv4, ...s.ipv6]" :key="ip" :text="ip" mono />
                </dd>
              </div>
            </dl>
          </UiCard>
          <UiCard :title="$t('service.tab.activity')" :padded="false">
            <p v-if="!s.tasks.length" class="px-5 py-8 text-center text-[13px] text-muted">
              {{ $t('service.noActivity') }}
            </p>
            <ul v-else class="divide-y divide-line">
              <li v-for="task in s.tasks" :key="task.id" class="flex flex-wrap items-center gap-3 px-5 py-3">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium">{{ $t(`service.task.${task.action}`) }}</p>
                  <p v-if="task.message" class="text-xs text-muted">{{ task.message }}</p>
                </div>
                <UiTime :value="task.created_at" mode="datetime" class="text-xs text-muted" />
                <UiStatus kind="task" :value="task.status" />
              </li>
            </ul>
          </UiCard>
        </div>

        <UiCard :title="$t('service.billing')">
          <form class="flex flex-col gap-4" @submit.prevent="save">
            <dl class="flex flex-col gap-2.5 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">{{ $t('service.cycle') }}</dt>
                <dd>{{ f.cycle(s.cycle) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">{{ $t('admin.service.catalogPrice') }}</dt>
                <dd><UiMoney :value="s.recurring" /></dd>
              </div>
            </dl>
            <UiField :label="$t('service.nextDue')"
              ><template #default="{ id: fid }"
                ><UiInput :id="fid" v-model="edit.next_due_at" type="date" size="sm" /></template
            ></UiField>
            <UiField
              :label="$t('admin.service.priceOverride')"
              :hint="$t('admin.service.priceOverrideHint')"
              optional
            >
              <template #default="{ id: fid }"
                ><UiInput :id="fid" v-model="edit.override" inputmode="decimal" size="sm"
                  ><template #prefix
                    ><span class="text-xs">{{ s.recurring.currency }}</span></template
                  ></UiInput
                ></template
              >
            </UiField>
            <UiSwitch v-model="edit.auto_renew" :label="$t('service.autoRenew')" />
            <UiButton
              type="submit"
              variant="primary"
              :loading="update.isPending.value"
              :disabled="!session.can('services.write')"
              >{{ $t('common.save') }}</UiButton
            >
          </form>
        </UiCard>
      </div>

      <ReasonDialog
        v-model:open="dialogOpen"
        :title="pending ? $t(`admin.service.action.${pending}`) : ''"
        :body="pending ? $t(`admin.service.actionBody.${pending}`) : ''"
        :confirm-label="pending ? $t(`admin.service.action.${pending}`) : ''"
        :tone="pending === 'unsuspend' ? 'primary' : 'danger'"
        :typed="pending === 'terminate' ? s.id : undefined"
        :loading="action.isPending.value"
        :error="action.error.value ? errors.text(action.error.value) : null"
        @confirm="(reason) => pending && run(pending, reason)"
      />
    </template>
  </div>
</template>
