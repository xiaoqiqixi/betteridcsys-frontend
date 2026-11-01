<script setup lang="ts">
import { computed } from 'vue'
import UiBadge, { type Tone } from './UiBadge.vue'

export type StatusKind =
  | 'service'
  | 'invoice'
  | 'order'
  | 'ticket'
  | 'task'
  | 'power'
  | 'client'
  | 'payment'
  | 'controller'
  | 'gateway'

const props = defineProps<{ kind: StatusKind; value: string }>()

const tones: Record<string, Tone> = {
  active: 'success',
  running: 'success',
  paid: 'success',
  succeeded: 'success',
  healthy: 'success',
  ready: 'success',
  answered: 'success',
  pending: 'warning',
  pending_payment: 'warning',
  unpaid: 'warning',
  provisioning: 'info',
  queued: 'neutral',
  starting: 'info',
  stopping: 'info',
  rebooting: 'info',
  reinstalling: 'info',
  open: 'info',
  customer_reply: 'warning',
  on_hold: 'neutral',
  suspended: 'danger',
  failed: 'danger',
  fraud: 'danger',
  unreachable: 'danger',
  misconfigured: 'danger',
  uncertain: 'warning',
  degraded: 'warning',
  stopped: 'neutral',
  cancelled: 'neutral',
  terminated: 'neutral',
  closed: 'neutral',
  refunded: 'neutral',
  partially_refunded: 'info',
  disabled: 'neutral',
  expired: 'neutral',
  voided: 'neutral',
  duplicate: 'danger',
  not_installed: 'neutral',
  unconfigured: 'neutral',
  unknown: 'neutral',
}
const live = new Set([
  'running',
  'provisioning',
  'starting',
  'stopping',
  'rebooting',
  'reinstalling',
  'active',
])
const tone = computed(() => tones[props.value] ?? 'neutral')
</script>

<template>
  <UiBadge :tone="tone" dot :pulse="live.has(value) && kind !== 'service'">{{
    $t(`status.${kind}.${value}`)
  }}</UiBadge>
</template>
