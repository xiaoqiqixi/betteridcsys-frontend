<script setup lang="ts">
import { CreditCard, Mail } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/admin-endpoints'
import type { EmailTemplate } from '@/contract/admin'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import ServerModulesPanel from '../components/ServerModulesPanel.vue'
import LocalizedInput from '../components/LocalizedInput.vue'

const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const fail = (e: unknown) => toast.error(errors.text(e))
const tab = ref<'cloud' | 'payments' | 'email'>('cloud')

const gateways = useApiQuery(api.admin.gateways, () => (tab.value === 'payments' ? {} : null))
const patchGateway = useApiMutation(api.admin.updateGateway, {
  invalidates: [api.admin.gateways, api.site.gateways],
})

const smtp = useApiQuery(api.admin.smtp, () => (tab.value === 'email' ? {} : null))
const smtpForm = reactive({
  host: '',
  port: 465,
  security: 'tls' as 'tls' | 'starttls',
  username: '',
  password: '',
  from_email: '',
  from_name: '',
  enabled: false,
})
watch(
  () => smtp.data.value,
  (s) =>
    s &&
    Object.assign(smtpForm, {
      host: s.host,
      port: s.port,
      security: s.security,
      username: s.username,
      password: '',
      from_email: s.from_email,
      from_name: s.from_name,
      enabled: s.enabled,
    }),
  { immediate: true },
)
const saveSmtp = useApiMutation(api.admin.updateSmtp, {
  invalidates: [api.admin.smtp],
  onSuccess: () => toast.success(t('common.saved')),
})
const testTo = ref('')
const testSmtp = useApiMutation(api.admin.testSmtp, {
  onSuccess: () => toast.success(t('admin.integration.testSent')),
})
const templates = useApiQuery(api.admin.emailTemplates, () => (tab.value === 'email' ? {} : null))
const editing = ref<EmailTemplate | null>(null)
const tplOpen = computed({ get: () => !!editing.value, set: (v) => !v && (editing.value = null) })
const saveTpl = useApiMutation(api.admin.updateEmailTemplate, {
  invalidates: [api.admin.emailTemplates],
  onSuccess: () => {
    editing.value = null
    toast.success(t('common.saved'))
  },
})
/** Template variables are shown as Go template placeholders, e.g. {{ .Name }}. */
const braces = (v: string) => `{{ ${v} }}`
function openTpl(tpl: EmailTemplate) {
  editing.value = JSON.parse(JSON.stringify(tpl))
}
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.integrations')" :description="$t('admin.integration.subtitle')" />
    <div class="mb-5">
      <UiSegmented
        v-model="tab"
        :options="[
          { value: 'cloud', label: $t('admin.integration.cloud') },
          { value: 'payments', label: $t('admin.integration.payments') },
          { value: 'email', label: $t('admin.integration.email') },
        ]"
      />
    </div>

    <ServerModulesPanel v-if="tab === 'cloud'" />

    <template v-else-if="tab === 'payments'">
      <UiErrorState v-if="gateways.isError.value" :error="gateways.error.value" @retry="gateways.refetch()" />
      <UiSkeleton v-else-if="!gateways.data.value" :lines="4" />
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="g in [...gateways.data.value].sort((a, b) => a.display_order - b.display_order)"
          :key="g.id"
          class="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-4 shadow-xs"
        >
          <span class="grid size-9 place-items-center rounded-lg bg-surface-2 text-muted"
            ><CreditCard class="size-4"
          /></span>
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 font-medium">
              {{ f.text(g.name) }}<UiStatus kind="gateway" :value="g.status" />
            </p>
            <p class="font-mono text-xs text-muted">
              {{ g.plugin_id }}@{{ g.plugin_version }} · {{ g.flow }} · {{ g.currencies.join(', ') }}
            </p>
          </div>
          <UiInput
            :model-value="g.display_order"
            type="number"
            size="sm"
            class="w-20"
            :aria-label="$t('admin.integration.order')"
            @change="
              (e: Event) =>
                patchGateway.mutate(
                  {
                    params: { id: g.id },
                    body: {
                      revision: g.revision,
                      display_order: Number((e.target as HTMLInputElement).value),
                    },
                  },
                  { onError: fail },
                )
            "
          />
          <UiSwitch
            :model-value="g.enabled"
            :disabled="g.status === 'incompatible' || patchGateway.isPending.value"
            @update:model-value="
              (v: boolean) =>
                patchGateway.mutate(
                  { params: { id: g.id }, body: { revision: g.revision, enabled: v } },
                  { onError: fail },
                )
            "
          />
        </div>
        <p
          v-if="!gateways.data.value.length"
          class="rounded-lg border border-dashed border-line px-4 py-10 text-center text-[13px] text-muted"
        >
          {{ $t('admin.integration.noGateways') }}
        </p>
        <p class="rounded-lg border border-dashed border-line p-4 text-[13px] text-muted">
          {{ $t('admin.integration.gatewayHint') }}
        </p>
      </div>
    </template>

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-2">
        <UiCard :title="$t('admin.integration.smtp')" :description="$t('admin.integration.smtpHint')">
          <UiSkeleton v-if="!smtp.data.value" :lines="6" />
          <form
            v-else
            class="grid gap-4 sm:grid-cols-2"
            @submit.prevent="
              saveSmtp.mutate(
                {
                  body: {
                    ...smtpForm,
                    revision: smtp.data.value!.revision,
                    password: smtpForm.password || undefined,
                  },
                },
                { onError: fail },
              )
            "
          >
            <UiField :label="$t('admin.integration.host')"
              ><template #default="{ id }"><UiInput :id="id" v-model="smtpForm.host" /></template
            ></UiField>
            <UiField :label="$t('admin.integration.port')"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model.number="smtpForm.port" type="number" /></template
            ></UiField>
            <UiField :label="$t('admin.integration.security')"
              ><template #default="{ id }"
                ><UiSelect
                  :id="id"
                  v-model="smtpForm.security"
                  :options="[
                    { value: 'tls', label: 'TLS' },
                    { value: 'starttls', label: 'STARTTLS' },
                  ]" /></template
            ></UiField>
            <UiField :label="$t('admin.integration.username')"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model="smtpForm.username" autocomplete="off" /></template
            ></UiField>
            <UiField
              :label="$t('auth.password')"
              :hint="smtp.data.value.password_configured ? $t('admin.integration.passwordKept') : ''"
              class="sm:col-span-2"
              ><template #default="{ id }"
                ><UiInput
                  :id="id"
                  v-model="smtpForm.password"
                  type="password"
                  autocomplete="new-password" /></template
            ></UiField>
            <UiField :label="$t('admin.integration.fromEmail')"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model="smtpForm.from_email" type="email" /></template
            ></UiField>
            <UiField :label="$t('admin.integration.fromName')"
              ><template #default="{ id }"><UiInput :id="id" v-model="smtpForm.from_name" /></template
            ></UiField>
            <div class="sm:col-span-2">
              <UiSwitch v-model="smtpForm.enabled" :label="$t('admin.integration.enabled')" />
            </div>
            <div class="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex gap-2">
                <UiInput
                  v-model="testTo"
                  type="email"
                  size="sm"
                  :placeholder="$t('admin.integration.testTo')"
                  class="sm:w-56"
                />
                <UiButton
                  size="sm"
                  :loading="testSmtp.isPending.value"
                  :disabled="!testTo.includes('@')"
                  @click="testSmtp.mutate({ body: { to: testTo } }, { onError: fail })"
                  ><Mail class="size-3.5" />{{ $t('admin.integration.sendTest') }}</UiButton
                >
              </div>
              <UiButton type="submit" variant="primary" :loading="saveSmtp.isPending.value">{{
                $t('common.save')
              }}</UiButton>
            </div>
          </form>
        </UiCard>
        <UiCard :title="$t('admin.integration.templates')" :padded="false">
          <UiSkeleton v-if="!templates.data.value" :lines="6" class="p-5" />
          <ul v-else class="divide-y divide-line">
            <li v-for="tpl in templates.data.value" :key="tpl.key">
              <button
                class="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2"
                @click="openTpl(tpl)"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium">{{ $t(`admin.integration.tpl.${tpl.key}`) }}</p>
                  <p class="truncate text-xs text-muted">{{ f.text(tpl.subject) }}</p>
                </div>
                <span :class="['size-2 rounded-full', tpl.enabled ? 'bg-success' : 'bg-line-strong']" />
              </button>
            </li>
          </ul>
        </UiCard>
      </div>
      <UiDialog
        v-model:open="tplOpen"
        :title="editing ? $t(`admin.integration.tpl.${editing.key}`) : ''"
        size="xl"
      >
        <form
          v-if="editing"
          id="tpl-form"
          class="flex flex-col gap-4"
          @submit.prevent="
            saveTpl.mutate(
              {
                params: { key: editing.key },
                body: {
                  subject: editing.subject,
                  body: editing.body,
                  enabled: editing.enabled,
                  revision: editing.revision,
                },
              },
              { onError: fail },
            )
          "
        >
          <UiField :label="$t('admin.integration.subject')"
            ><template #default="{ id }"
              ><LocalizedInput :id="id" v-model="editing.subject" :maxlength="200" /></template
          ></UiField>
          <UiField :label="$t('admin.integration.body')"
            ><template #default="{ id }"
              ><LocalizedInput :id="id" v-model="editing.body" multiline :maxlength="4000" /></template
          ></UiField>
          <p class="text-xs text-muted">
            {{ $t('admin.integration.variables') }}
            <code
              v-for="v in editing.variables"
              :key="v"
              class="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]"
              >{{ braces(v) }}</code
            >
          </p>
          <UiSwitch v-model="editing.enabled" :label="$t('admin.integration.enabled')" />
        </form>
        <template #footer>
          <UiButton variant="ghost" @click="editing = null">{{ $t('common.cancel') }}</UiButton>
          <UiButton type="submit" form="tpl-form" variant="primary" :loading="saveTpl.isPending.value">{{
            $t('common.save')
          }}</UiButton>
        </template>
      </UiDialog>
    </template>
  </div>
</template>
