<script setup lang="ts">
import {
  ArrowUpDown,
  CalendarClock,
  ChevronDown,
  Disc3,
  KeyRound,
  LifeBuoy,
  MonitorPlay,
  MoreHorizontal,
  Pencil,
  Play,
  Power,
  RotateCw,
  ShieldAlert,
  Square,
  XCircle,
  Zap,
} from '@lucide/vue'
import { computed, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api } from '@/contract'
import type { ServiceTask } from '@/contract/commerce'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiCopy from '@/shared/ui/UiCopy.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiDropdown, { type MenuItem } from '@/shared/ui/UiDropdown.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import CancelDialog from '../components/service/CancelDialog.vue'
import MetricsPanel from '../components/service/MetricsPanel.vue'
import PasswordDialog from '../components/service/PasswordDialog.vue'
import ReinstallDialog from '../components/service/ReinstallDialog.vue'
import RenewDialog from '../components/service/RenewDialog.vue'
import SnapshotsPanel from '../components/service/SnapshotsPanel.vue'
import UpgradeDialog from '../components/service/UpgradeDialog.vue'

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const id = computed(() => String(route.params.id))

const TRANSIENT = new Set(['starting', 'stopping', 'rebooting', 'reinstalling'])
const live = (tasks: ServiceTask[]) => tasks.some((x) => x.status === 'queued' || x.status === 'running')
const polling = ref(false)
const service = useApiQuery(api.services.get, () => ({ params: { id: id.value } }), {
  refetchInterval: (): number | false => (polling.value ? 3000 : false),
})
const s = computed(() => service.data.value)
watchEffect(() => {
  const v = s.value
  polling.value =
    !!v && (live(v.tasks) || (!!v.power && TRANSIENT.has(v.power)) || v.status === 'provisioning')
})
const cap = computed(() => s.value?.capabilities)
const operable = computed(() => s.value?.status === 'active' && !s.value.rescue?.active)
const busy = computed(
  () => !!s.value && (live(s.value.tasks) || (!!s.value.power && TRANSIENT.has(s.value.power))),
)

const tab = ref<'overview' | 'metrics' | 'snapshots' | 'activity'>('overview')
const tabs = computed(() => [
  { value: 'overview' as const, label: t('service.tab.overview') },
  ...(cap.value?.metrics ? [{ value: 'metrics' as const, label: t('service.tab.metrics') }] : []),
  ...(cap.value?.snapshots ? [{ value: 'snapshots' as const, label: t('service.tab.snapshots') }] : []),
  { value: 'activity' as const, label: t('service.tab.activity') },
])

const dialogs = ref({
  reinstall: false,
  reset: false,
  rescue: false,
  renew: false,
  cancel: false,
  upgrade: false,
  rename: false,
})
const label = ref('')

const fail = (e: unknown) => toast.error(errors.text(e))
const power = useApiMutation(api.services.power, { invalidates: [api.services.get, api.services.list] })
const update = useApiMutation(api.services.update, { invalidates: [api.services.get, api.services.list] })
const withdraw = useApiMutation(api.services.withdrawCancellation, {
  invalidates: [api.services.get],
  onSuccess: () => toast.success(t('service.cancelWithdrawn')),
})
const exitRescue = useApiMutation(api.services.exitRescue, { invalidates: [api.services.get] })
const consoleTicket = useApiMutation(api.services.console)

async function act(action: 'start' | 'stop' | 'reboot' | 'force_off') {
  if (action !== 'start') {
    const ok = await confirm({
      title: t(`service.power.${action}`),
      body: t(`service.powerConfirm.${action}`),
      tone: action === 'force_off' ? 'danger' : 'primary',
      confirmLabel: t(`service.power.${action}`),
    })
    if (!ok) return
  }
  power.mutate({ params: { id: id.value }, body: { action } }, { onError: fail })
}
function openConsole() {
  // Open synchronously so pop-up blockers allow it, then point it at the one-time ticket.
  const win = window.open('about:blank', '_blank')
  consoleTicket.mutate(
    { params: { id: id.value }, body: {} },
    {
      onSuccess: (ticket) => {
        if (win && /^https:\/\//.test(ticket.url)) {
          win.opener = null
          win.location.href = ticket.url
        } else win?.close()
      },
      onError: (e) => {
        win?.close()
        fail(e)
      },
    },
  )
}
function saveLabel() {
  update.mutate(
    { params: { id: id.value }, body: { label: label.value.trim() } },
    { onSuccess: () => (dialogs.value.rename = false), onError: fail },
  )
}

const more = computed<MenuItem[]>(() => {
  const c = cap.value
  if (!c || !s.value) return []
  const items: MenuItem[] = [
    {
      label: t('service.rename'),
      icon: Pencil,
      onSelect: () => {
        label.value = s.value!.label
        dialogs.value.rename = true
      },
    },
  ]
  if (c.reinstall)
    items.push({
      label: t('service.reinstall'),
      icon: Disc3,
      disabled: !operable.value || busy.value,
      onSelect: () => (dialogs.value.reinstall = true),
    })
  if (c.reset_password)
    items.push({
      label: t('service.resetPassword'),
      icon: KeyRound,
      disabled: !operable.value || busy.value,
      onSelect: () => (dialogs.value.reset = true),
    })
  if (c.rescue && !s.value.rescue?.active)
    items.push({
      label: t('service.rescue'),
      icon: LifeBuoy,
      disabled: !operable.value || busy.value,
      onSelect: () => (dialogs.value.rescue = true),
    })
  if (c.upgrade)
    items.push({
      label: t('service.changePlan'),
      icon: ArrowUpDown,
      disabled: s.value.status !== 'active',
      onSelect: () => (dialogs.value.upgrade = true),
    })
  if (!s.value.cancellation && (s.value.status === 'active' || s.value.status === 'suspended'))
    items.push(
      { separator: true },
      {
        label: t('service.cancel'),
        icon: XCircle,
        danger: true,
        onSelect: () => (dialogs.value.cancel = true),
      },
    )
  return items
})
const powerMenu = computed<MenuItem[]>(() => [
  { label: t('service.power.reboot'), icon: RotateCw, onSelect: () => act('reboot') },
  { label: t('service.power.stop'), icon: Square, onSelect: () => act('stop') },
  { separator: true },
  { label: t('service.power.force_off'), icon: Zap, danger: true, onSelect: () => act('force_off') },
])
</script>

<template>
  <div>
    <UiErrorState v-if="service.isError.value" :error="service.error.value" @retry="service.refetch()" />
    <div v-else-if="!s">
      <UiSkeleton :lines="2" height="h-7" class="mb-6 max-w-sm" /><UiSkeleton :lines="6" />
    </div>
    <template v-else>
      <UiPageHeader
        :title="s.label || s.hostname || s.product_name"
        :back="'/services'"
        :back-label="$t('nav.services')"
      >
        <template #badges>
          <UiStatus kind="service" :value="s.status" />
          <UiStatus v-if="s.status === 'active' && s.power" kind="power" :value="s.power" />
        </template>
        <template #meta>
          <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span>{{ s.product_name }}</span
            ><span class="text-faint">·</span><span>{{ s.region }}</span>
            <template v-if="s.primary_ipv4"
              ><span class="text-faint">·</span><UiCopy :text="s.primary_ipv4" mono class="text-fg-2"
            /></template>
          </p>
        </template>
        <template #actions>
          <template v-if="cap?.power && s.status === 'active'">
            <UiButton
              v-if="s.power === 'stopped'"
              variant="primary"
              :disabled="!operable || busy"
              :loading="power.isPending.value"
              @click="act('start')"
              ><Play class="size-4" />{{ $t('service.power.start') }}</UiButton
            >
            <UiDropdown v-else :items="powerMenu" width="w-48">
              <UiButton :disabled="!operable || busy" :loading="power.isPending.value"
                ><Power class="size-4" />{{ $t('service.powerMenu')
                }}<ChevronDown class="size-3.5 opacity-60"
              /></UiButton>
            </UiDropdown>
          </template>
          <UiButton
            v-if="cap?.console && s.status === 'active'"
            :disabled="s.power !== 'running'"
            :loading="consoleTicket.isPending.value"
            @click="openConsole"
            ><MonitorPlay class="size-4" />{{ $t('service.console') }}</UiButton
          >
          <UiDropdown :items="more" width="w-52">
            <UiButton square :aria-label="$t('common.actions')"><MoreHorizontal class="size-4" /></UiButton>
          </UiDropdown>
        </template>
      </UiPageHeader>

      <div class="mb-5 flex flex-col gap-3">
        <div
          v-if="s.status === 'suspended'"
          class="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger"
        >
          <ShieldAlert class="mt-0.5 size-4 shrink-0" />
          <div>
            <p class="font-medium">{{ $t('service.suspendedTitle') }}</p>
            <p class="mt-0.5 opacity-90">{{ s.suspension_reason || $t('service.suspendedBody') }}</p>
            <p v-if="s.terminates_at" class="mt-0.5 opacity-90">
              {{ $t('service.terminatesAt') }} <UiTime :value="s.terminates_at" />
            </p>
          </div>
        </div>
        <div
          v-if="s.cancellation"
          class="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] text-warning sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            {{
              s.cancellation.type === 'immediate'
                ? $t('service.cancelPendingNow')
                : $t('service.cancelPendingEnd', { date: f.date(s.next_due_at) })
            }}
          </p>
          <UiButton
            size="sm"
            variant="secondary"
            :loading="withdraw.isPending.value"
            @click="withdraw.mutate({ params: { id } }, { onError: fail })"
            >{{ $t('service.withdraw') }}</UiButton
          >
        </div>
        <div
          v-if="s.rescue?.active"
          class="flex flex-col gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-[13px] text-info sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{{ $t('service.rescueActive') }} <UiTime :value="s.rescue.since" mode="relative" /></p>
          <UiButton
            size="sm"
            variant="secondary"
            :loading="exitRescue.isPending.value"
            @click="exitRescue.mutate({ params: { id } }, { onError: fail })"
            >{{ $t('service.exitRescue') }}</UiButton
          >
        </div>
        <div
          v-if="s.status === 'provisioning'"
          class="rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-[13px] text-info"
        >
          {{ $t('service.provisioning') }}
        </div>
      </div>

      <div class="mb-5 overflow-x-auto"><UiSegmented v-model="tab" :options="tabs" /></div>

      <div v-if="tab === 'overview'" class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <UiCard :title="$t('service.configuration')">
          <dl class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs text-muted">vCPU</dt>
              <dd class="num mt-1 font-medium">{{ s.specs.cpu_cores }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">{{ $t('specs.memory') }}</dt>
              <dd class="num mt-1 font-medium">{{ f.memory(s.specs.memory_mb) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">{{ $t('specs.disk') }}</dt>
              <dd class="num mt-1 font-medium">{{ s.specs.disk_gb }} GB</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">{{ $t('specs.bandwidth') }}</dt>
              <dd class="num mt-1 font-medium">{{ f.bandwidth(s.specs.bandwidth_mbps) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">{{ $t('configure.os') }}</dt>
              <dd class="mt-1 font-medium">
                {{ s.os_image ? `${s.os_image.name} ${s.os_image.version}` : '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">{{ $t('service.node') }}</dt>
              <dd class="mt-1 font-medium">{{ s.node_label || '—' }}</dd>
            </div>
            <div class="col-span-2 sm:col-span-3">
              <dt class="text-xs text-muted">{{ $t('service.addresses') }}</dt>
              <dd class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <UiCopy v-for="ip in [...s.ipv4, ...s.ipv6]" :key="ip" :text="ip" mono />
                <span v-if="!s.ipv4.length && !s.ipv6.length" class="text-faint">—</span>
              </dd>
            </div>
          </dl>
          <div v-if="s.traffic" class="mt-6 border-t border-line pt-5">
            <div class="flex items-baseline justify-between text-[13px]">
              <span class="text-muted">{{ $t('specs.traffic') }}</span>
              <span class="num"
                ><span class="font-medium text-fg">{{ f.number(s.traffic.used_gb, 1) }} GB</span
                ><span class="text-muted">
                  /
                  {{ s.traffic.limit_gb == null ? $t('specs.unmetered') : s.traffic.limit_gb + ' GB' }}</span
                ></span
              >
            </div>
            <div v-if="s.traffic.limit_gb" class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                class="h-full rounded-full transition-[width]"
                :class="
                  s.traffic.used_gb / s.traffic.limit_gb > 0.9
                    ? 'bg-danger'
                    : s.traffic.used_gb / s.traffic.limit_gb > 0.7
                      ? 'bg-warning'
                      : 'bg-primary'
                "
                :style="{ width: Math.min(100, (s.traffic.used_gb / s.traffic.limit_gb) * 100) + '%' }"
              />
            </div>
            <p class="mt-1.5 text-xs text-muted">
              {{ $t('service.trafficResets') }} <UiTime :value="s.traffic.resets_at" />
            </p>
          </div>
        </UiCard>

        <UiCard :title="$t('service.billing')">
          <dl class="flex flex-col gap-3.5 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('service.cycle') }}</dt>
              <dd>{{ f.cycle(s.cycle) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('service.recurring') }}</dt>
              <dd><UiMoney :value="s.recurring" class="font-medium" /></dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('service.nextDue') }}</dt>
              <dd class="flex items-center gap-1.5">
                <CalendarClock class="size-3.5 text-faint" /><UiTime :value="s.next_due_at" />
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('service.since') }}</dt>
              <dd><UiTime :value="s.created_at" /></dd>
            </div>
          </dl>
          <div class="mt-5 rounded-lg border border-line bg-surface-2 p-3">
            <UiSwitch
              :model-value="s.auto_renew"
              :disabled="update.isPending.value"
              :label="$t('service.autoRenew')"
              :description="$t('service.autoRenewHint')"
              @update:model-value="
                (v: boolean) => update.mutate({ params: { id }, body: { auto_renew: v } }, { onError: fail })
              "
            />
          </div>
          <div class="mt-4 flex gap-2">
            <UiButton
              variant="primary"
              block
              :disabled="!s.renewal_options.length || s.status === 'terminated'"
              @click="dialogs.renew = true"
              >{{ $t('service.renew') }}</UiButton
            >
            <UiButton
              v-if="cap?.upgrade"
              block
              :disabled="s.status !== 'active'"
              @click="dialogs.upgrade = true"
              >{{ $t('service.changePlan') }}</UiButton
            >
          </div>
        </UiCard>
      </div>

      <MetricsPanel v-else-if="tab === 'metrics'" :service="s" />
      <SnapshotsPanel v-else-if="tab === 'snapshots'" :service="s" />
      <UiCard v-else :padded="false">
        <p v-if="!s.tasks.length" class="px-5 py-10 text-center text-[13px] text-muted">
          {{ $t('service.noActivity') }}
        </p>
        <ul v-else class="divide-y divide-line">
          <li v-for="task in s.tasks" :key="task.id" class="flex flex-wrap items-center gap-3 px-5 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">{{ $t(`service.task.${task.action}`) }}</p>
              <p v-if="task.message" class="text-xs text-muted">{{ task.message }}</p>
            </div>
            <UiTime :value="task.created_at" mode="relative" class="text-xs text-muted" />
            <UiStatus kind="task" :value="task.status" />
          </li>
        </ul>
      </UiCard>

      <ReinstallDialog v-model:open="dialogs.reinstall" :service="s" />
      <PasswordDialog v-model:open="dialogs.reset" :service="s" mode="reset" />
      <PasswordDialog v-model:open="dialogs.rescue" :service="s" mode="rescue" />
      <RenewDialog v-model:open="dialogs.renew" :service="s" />
      <CancelDialog v-model:open="dialogs.cancel" :service="s" />
      <UpgradeDialog v-if="cap?.upgrade" v-model:open="dialogs.upgrade" :service="s" />
      <UiDialog v-model:open="dialogs.rename" :title="$t('service.rename')" size="sm">
        <UiInput
          v-model="label"
          maxlength="80"
          :placeholder="s.hostname || s.product_name"
          @keydown.enter="saveLabel"
        />
        <template #footer>
          <UiButton variant="ghost" @click="dialogs.rename = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton variant="primary" :loading="update.isPending.value" @click="saveLabel">{{
            $t('common.save')
          }}</UiButton>
        </template>
      </UiDialog>
    </template>
  </div>
</template>
