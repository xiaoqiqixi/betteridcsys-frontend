<script setup lang="ts">
import { Megaphone, Pin, Plus, Trash2 } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, type LocalizedText } from '@/contract/admin-endpoints'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import LocalizedInput from '../components/LocalizedInput.vue'

const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const list = useApiQuery(api.admin.announcements)
const open = ref(false)
const form = reactive({
  id: undefined as string | undefined,
  title: { 'zh-CN': '', en: '' } as LocalizedText,
  body: { 'zh-CN': '', en: '' } as LocalizedText,
  pinned: false,
  published: true,
})
function edit(a?: {
  id: string
  title: LocalizedText
  body: LocalizedText
  pinned: boolean
  published: boolean
}) {
  Object.assign(
    form,
    a
      ? { id: a.id, title: { ...a.title }, body: { ...a.body }, pinned: a.pinned, published: a.published }
      : {
          id: undefined,
          title: { 'zh-CN': '', en: '' },
          body: { 'zh-CN': '', en: '' },
          pinned: false,
          published: true,
        },
  )
  open.value = true
}
const save = useApiMutation(api.admin.saveAnnouncement, {
  invalidates: [api.admin.announcements, api.site.announcements],
  onSuccess: () => {
    open.value = false
    toast.success(t('common.saved'))
  },
})
const remove = useApiMutation(api.admin.deleteAnnouncement, {
  invalidates: [api.admin.announcements, api.site.announcements],
})
async function doRemove(id: string) {
  if (
    await confirm({
      title: t('admin.announcement.deleteTitle'),
      tone: 'danger',
      confirmLabel: t('common.delete'),
    })
  )
    remove.mutate({ params: { id } }, { onError: (e) => toast.error(errors.text(e)) })
}
const hasText = (lt: LocalizedText) => Object.values(lt).some((v) => v && v.trim())
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.announcements')" :description="$t('admin.announcement.subtitle')">
      <template #actions
        ><UiButton variant="primary" @click="edit()"
          ><Plus class="size-4" />{{ $t('admin.announcement.create') }}</UiButton
        ></template
      >
    </UiPageHeader>
    <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
    <UiSkeleton v-else-if="!list.data.value" :lines="5" />
    <UiEmpty
      v-else-if="!list.data.value.length"
      class="rounded-lg border border-dashed border-line"
      :icon="Megaphone"
      :title="$t('announcements.empty')"
    />
    <ul v-else class="flex flex-col gap-3">
      <li
        v-for="a in list.data.value"
        :key="a.id"
        class="flex items-start gap-4 rounded-lg border border-line bg-surface p-4 shadow-xs"
      >
        <div class="min-w-0 flex-1 cursor-pointer" @click="edit(a)">
          <p class="flex items-center gap-2 font-medium">
            <Pin v-if="a.pinned" class="size-3.5 text-primary" />{{ f.text(a.title) }}
            <UiBadge v-if="!a.published">{{ $t('admin.announcement.draft') }}</UiBadge>
          </p>
          <p class="mt-1 line-clamp-2 text-[13px] text-muted">{{ f.text(a.body) }}</p>
          <p class="mt-1 text-xs text-faint"><UiTime :value="a.published_at" mode="datetime" /></p>
        </div>
        <UiButton
          square
          size="sm"
          variant="danger-ghost"
          :aria-label="$t('common.delete')"
          @click="doRemove(a.id)"
          ><Trash2 class="size-3.5"
        /></UiButton>
      </li>
    </ul>
    <UiDialog
      v-model:open="open"
      :title="form.id ? $t('common.edit') : $t('admin.announcement.create')"
      size="lg"
    >
      <form
        id="ann-form"
        class="flex flex-col gap-4"
        @submit.prevent="
          save.mutate({
            body: {
              ...(form.id ? { id: form.id } : {}),
              title: form.title,
              body: form.body,
              pinned: form.pinned,
              published: form.published,
            },
          })
        "
      >
        <UiField :label="$t('admin.announcement.title')"
          ><template #default="{ id }"
            ><LocalizedInput :id="id" v-model="form.title" :maxlength="160" /></template
        ></UiField>
        <UiField :label="$t('admin.announcement.body')"
          ><template #default="{ id }"
            ><LocalizedInput :id="id" v-model="form.body" multiline :maxlength="4000" /></template
        ></UiField>
        <UiSwitch v-model="form.pinned" :label="$t('announcements.pinned')" />
        <UiSwitch v-model="form.published" :label="$t('admin.announcement.published')" />
        <p v-if="save.error.value" class="text-[13px] text-danger">{{ errors.text(save.error.value) }}</p>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
        <UiButton
          type="submit"
          form="ann-form"
          variant="primary"
          :loading="save.isPending.value"
          :disabled="!hasText(form.title) || !hasText(form.body)"
          >{{ $t('common.save') }}</UiButton
        >
      </template>
    </UiDialog>
  </div>
</template>
