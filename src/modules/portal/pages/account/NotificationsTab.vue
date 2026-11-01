<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiCard from '@/shared/ui/UiCard.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'

const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const prefs = useApiQuery(api.account.notifications)
const update = useApiMutation(api.account.updateNotifications, {
  invalidates: [api.account.notifications],
  onSuccess: () => toast.success(t('common.saved')),
})
const keys = [
  'invoice_created',
  'invoice_reminder',
  'service_events',
  'ticket_replies',
  'announcements',
] as const
</script>

<template>
  <UiCard :title="$t('account.tab.notifications')" :description="$t('account.notificationsHint')">
    <UiSkeleton v-if="!prefs.data.value" :lines="5" />
    <div v-else class="flex flex-col divide-y divide-line">
      <div v-for="k in keys" :key="k" class="py-3.5 first:pt-0 last:pb-0">
        <UiSwitch
          :model-value="prefs.data.value[k]"
          :disabled="update.isPending.value"
          :label="$t(`account.notify.${k}`)"
          :description="$t(`account.notifyHint.${k}`)"
          @update:model-value="
            (v: boolean) =>
              update.mutate({ body: { [k]: v } }, { onError: (e) => toast.error(errors.text(e)) })
          "
        />
      </div>
    </div>
  </UiCard>
</template>
