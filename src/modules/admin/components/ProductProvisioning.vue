<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '@/contract/admin-endpoints'
import type { ProductModule } from '@/contract/server'
import { useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import { schemaDefaults } from '@/shared/lib/module-schema'
import SchemaForm from '@/shared/ui/SchemaForm.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'

const model = defineModel<ProductModule | null>({ required: true })
const f = useFormat()
const modules = useApiQuery(api.admin.modules)
const connections = useApiQuery(api.admin.connections)
const selected = computed(() => modules.data.value?.find((m) => m.id === model.value?.module_id))
const available = computed(() =>
  (connections.data.value ?? []).filter((c) => c.module_id === model.value?.module_id),
)
const schemaForm = ref<InstanceType<typeof SchemaForm>>()
const submitted = ref(false)
function select(id: string) {
  const mod = modules.data.value?.find((m) => m.id === id)
  model.value = mod ? { module_id: id, connection_id: '', config: schemaDefaults(mod.product_schema) } : null
}
function validate() {
  submitted.value = true
  return (
    !model.value ||
    (!!selected.value &&
      available.value.some((c) => c.id === model.value?.connection_id) &&
      !!schemaForm.value?.validate())
  )
}
function retry() {
  void modules.refetch()
  void connections.refetch()
}
defineExpose({ validate })
</script>

<template>
  <UiCard :title="$t('admin.product.provisioning')">
    <UiErrorState
      v-if="modules.isError.value || connections.isError.value"
      :error="modules.error.value || connections.error.value"
      @retry="retry"
    />
    <UiSkeleton v-else-if="!modules.data.value || !connections.data.value" :lines="3" />
    <div v-else class="grid min-w-0 gap-4">
      <UiField :label="$t('serverModules.module')">
        <template #default="{ id }"
          ><UiSelect
            :id="id"
            :model-value="model?.module_id ?? ''"
            :options="[
              { value: '', label: $t('serverModules.manual') },
              ...modules.data.value.map((m) => ({
                value: m.id,
                label: f.text(m.name),
                disabled: m.status === 'incompatible',
              })),
            ]"
            @update:model-value="(v) => select(String(v))"
        /></template>
      </UiField>
      <p v-if="!model" class="text-sm text-muted">{{ $t('serverModules.manualHint') }}</p>
      <template v-else>
        <UiField
          :label="$t('serverModules.connection')"
          required
          :error="
            submitted && !available.some((c) => c.id === model?.connection_id)
              ? $t('schemaForm.errors.required')
              : undefined
          "
        >
          <template #default="{ id, invalid }"
            ><UiSelect
              :id="id"
              v-model="model.connection_id"
              :invalid="invalid"
              :options="
                available.map((c) => ({
                  value: c.id,
                  label: c.name,
                  disabled: !c.enabled && c.id !== model?.connection_id,
                }))
              "
          /></template>
        </UiField>
        <p v-if="!available.length" class="text-sm text-muted">{{ $t('serverModules.noConnections') }}</p>
        <SchemaForm
          v-if="selected"
          :key="selected.id"
          ref="schemaForm"
          v-model="model.config"
          :schema="selected.product_schema"
        />
      </template>
    </div>
  </UiCard>
</template>
