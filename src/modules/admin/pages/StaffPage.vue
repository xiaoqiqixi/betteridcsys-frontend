<script setup lang="ts">
import { Plus, ShieldCheck, UserPlus } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/admin-endpoints'
import type { StaffRole } from '@/contract/admin'
import { Permission } from '@/contract/identity'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const fail = (e: unknown) => toast.error(errors.text(e))
const tab = ref<'members' | 'roles'>('members')
const staff = useApiQuery(api.admin.staffMembers)
const roles = useApiQuery(api.admin.roles)
const roleOptions = computed(() =>
  (roles.data.value ?? []).map((r) => ({ value: r.id, label: r.name, hint: r.description })),
)

const inviteOpen = ref(false)
const invite = reactive({ email: '', name: '', role_id: '' })
const doInvite = useApiMutation(api.admin.inviteStaff, {
  invalidates: [api.admin.staffMembers],
  onSuccess: () => {
    inviteOpen.value = false
    Object.assign(invite, { email: '', name: '', role_id: '' })
    toast.success(t('admin.staff.invited'))
  },
})
const update = useApiMutation(api.admin.updateStaff, { invalidates: [api.admin.staffMembers] })

const PERMS = Permission.options
const groups = computed(() => {
  const g = new Map<string, string[]>()
  for (const p of PERMS) g.set(p.split('.')[0]!, [...(g.get(p.split('.')[0]!) ?? []), p])
  return [...g.entries()]
})
const roleOpen = ref(false)
const role = reactive({
  id: undefined as string | undefined,
  name: '',
  description: '',
  permissions: [] as string[],
  revision: undefined as number | undefined,
  builtin: false,
})
function editRole(r?: StaffRole) {
  Object.assign(
    role,
    r
      ? {
          id: r.id,
          name: r.name,
          description: r.description,
          permissions: [...r.permissions],
          revision: r.revision,
          builtin: r.builtin,
        }
      : { id: undefined, name: '', description: '', permissions: [], revision: undefined, builtin: false },
  )
  roleOpen.value = true
}
const saveRole = useApiMutation(api.admin.saveRole, {
  invalidates: [api.admin.roles],
  onSuccess: () => {
    roleOpen.value = false
    toast.success(t('common.saved'))
  },
})
function submitRole() {
  saveRole.mutate(
    {
      body: {
        ...(role.id ? { id: role.id, revision: role.revision } : {}),
        name: role.name.trim(),
        description: role.description.trim(),
        permissions: role.permissions as (typeof PERMS)[number][],
      },
    },
    { onError: fail },
  )
}
const columns = computed(() => [
  { key: 'member', label: t('admin.staff.member') },
  { key: 'role', label: t('admin.staff.role') },
  { key: 'login', label: t('admin.client.lastLogin'), hideBelow: 'md' as const },
  { key: 'status', label: t('common.status'), align: 'right' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.staff')" :description="$t('admin.staff.subtitle')">
      <template #actions>
        <UiButton v-if="tab === 'members'" variant="primary" @click="inviteOpen = true"
          ><UserPlus class="size-4" />{{ $t('admin.staff.invite') }}</UiButton
        >
        <UiButton v-else variant="primary" @click="editRole()"
          ><Plus class="size-4" />{{ $t('admin.staff.createRole') }}</UiButton
        >
      </template>
    </UiPageHeader>
    <div class="mb-4">
      <UiSegmented
        v-model="tab"
        :options="[
          { value: 'members', label: $t('admin.staff.members') },
          { value: 'roles', label: $t('admin.staff.roles') },
        ]"
      />
    </div>

    <div v-if="tab === 'members'" class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="staff.isError.value" :error="staff.error.value" @retry="staff.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="staff.data.value ?? []"
        :row-key="(r) => r.id"
        :loading="staff.isPending.value"
      >
        <template #cell-member="{ row }"
          ><p class="font-medium">{{ row.name || row.email }}</p>
          <p class="text-xs text-muted">{{ row.email }}</p></template
        >
        <template #cell-role="{ row }">
          <UiSelect
            :model-value="row.role_id"
            size="sm"
            class="max-w-48"
            :options="roleOptions"
            @update:model-value="
              (v) =>
                update.mutate(
                  { params: { id: row.id }, body: { role_id: v as string, revision: row.revision } },
                  { onError: fail },
                )
            "
          />
        </template>
        <template #cell-login="{ row }"><UiTime :value="row.last_login_at" mode="relative" /></template>
        <template #cell-status="{ row }">
          <UiButton
            size="sm"
            :variant="row.status === 'active' ? 'ghost' : 'secondary'"
            @click="
              update.mutate(
                {
                  params: { id: row.id },
                  body: { status: row.status === 'active' ? 'disabled' : 'active', revision: row.revision },
                },
                { onError: fail },
              )
            "
          >
            {{ row.status === 'active' ? $t('admin.staff.disable') : $t('admin.staff.enable') }}
          </UiButton>
        </template>
      </UiTable>
    </div>

    <div v-else>
      <UiSkeleton v-if="!roles.data.value" :lines="4" />
      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UiCard v-for="r in roles.data.value" :key="r.id">
          <div class="flex items-start gap-3">
            <ShieldCheck class="mt-0.5 size-4 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-2 font-medium">
                {{ r.name }}<UiBadge v-if="r.builtin">{{ $t('admin.staff.builtin') }}</UiBadge>
              </p>
              <p class="mt-0.5 text-[13px] text-muted">{{ r.description }}</p>
              <p class="mt-2 text-xs text-faint">
                {{ $t('admin.staff.roleStats', { perms: r.permissions.length, members: r.members }) }}
              </p>
            </div>
            <UiButton size="sm" variant="ghost" :disabled="r.builtin" @click="editRole(r)">{{
              $t('common.edit')
            }}</UiButton>
          </div>
        </UiCard>
      </div>
    </div>

    <UiDialog
      v-model:open="inviteOpen"
      :title="$t('admin.staff.invite')"
      :description="$t('admin.staff.inviteHint')"
    >
      <form
        id="invite-form"
        class="flex flex-col gap-4"
        @submit.prevent="
          doInvite.mutate({
            body: { email: invite.email.trim(), name: invite.name.trim(), role_id: invite.role_id },
          })
        "
      >
        <UiField :label="$t('auth.email')"
          ><template #default="{ id }"><UiInput :id="id" v-model="invite.email" type="email" /></template
        ></UiField>
        <UiField :label="$t('auth.name')"
          ><template #default="{ id }"><UiInput :id="id" v-model="invite.name" /></template
        ></UiField>
        <UiField :label="$t('admin.staff.role')"
          ><template #default="{ id }"
            ><UiSelect :id="id" v-model="invite.role_id" :options="roleOptions" /></template
        ></UiField>
        <p v-if="doInvite.error.value" class="text-[13px] text-danger">
          {{ errors.text(doInvite.error.value) }}
        </p>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="inviteOpen = false">{{ $t('common.cancel') }}</UiButton>
        <UiButton
          type="submit"
          form="invite-form"
          variant="primary"
          :loading="doInvite.isPending.value"
          :disabled="!invite.email.includes('@') || !invite.name.trim() || !invite.role_id"
          >{{ $t('admin.staff.sendInvite') }}</UiButton
        >
      </template>
    </UiDialog>

    <UiDialog v-model:open="roleOpen" :title="role.id ? role.name : $t('admin.staff.createRole')" size="lg">
      <form id="role-form" class="flex flex-col gap-4" @submit.prevent="submitRole">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField :label="$t('admin.product.name')"
            ><template #default="{ id }"><UiInput :id="id" v-model="role.name" maxlength="60" /></template
          ></UiField>
          <UiField :label="$t('admin.product.description')"
            ><template #default="{ id }"
              ><UiInput :id="id" v-model="role.description" maxlength="240" /></template
          ></UiField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="[group, perms] in groups" :key="group" class="rounded-lg border border-line p-3">
            <p class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              {{ $t(`admin.staff.permGroup.${group}`) }}
            </p>
            <div class="flex flex-col gap-1.5">
              <UiCheckbox
                v-for="p in perms"
                :key="p"
                :model-value="role.permissions.includes(p)"
                :label="$t(`admin.staff.perm.${p.replace('.', '_')}`)"
                @update:model-value="
                  (v: boolean) =>
                    (role.permissions = v
                      ? [...role.permissions, p]
                      : role.permissions.filter((x) => x !== p))
                "
              />
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="roleOpen = false">{{ $t('common.cancel') }}</UiButton>
        <UiButton
          type="submit"
          form="role-form"
          variant="primary"
          :loading="saveRole.isPending.value"
          :disabled="!role.name.trim() || !role.permissions.length"
          >{{ $t('common.save') }}</UiButton
        >
      </template>
    </UiDialog>
  </div>
</template>
