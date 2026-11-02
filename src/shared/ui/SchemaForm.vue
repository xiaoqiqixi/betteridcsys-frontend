<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ModuleFields, ModuleSchema, SchemaField } from '@/contract/server'
import { schemaDefaults, schemaText, validateModuleFields } from '@/shared/lib/module-schema'
import UiCheckbox from './UiCheckbox.vue'
import UiField from './UiField.vue'
import UiInput from './UiInput.vue'
import UiSelect from './UiSelect.vue'

const props = defineProps<{ schema: ModuleSchema; disabled?: boolean }>()
const model = defineModel<ModuleFields>({ required: true })
const emit = defineEmits<{ validity: [valid: boolean] }>()
const { t, locale } = useI18n()
const touched = ref<Record<string, boolean>>({})
const submitted = ref(false)
const errors = computed(() => validateModuleFields(props.schema, model.value))
watch(
  () => props.schema,
  (schema) => {
    touched.value = {}
    submitted.value = false
    const defaults = schemaDefaults(schema)
    if (Object.keys(defaults).some((key) => !Object.hasOwn(model.value, key)))
      model.value = { ...defaults, ...model.value }
  },
  { immediate: true },
)
watch(errors, (value) => emit('validity', !Object.keys(value).length), { immediate: true })

function set(key: string, value: ModuleFields[string] | undefined) {
  const next = { ...model.value }
  if (value === undefined) delete next[key]
  else next[key] = value
  model.value = next
  touched.value[key] = true
}
function scalar(key: string) {
  const v = model.value[key]
  return typeof v === 'string' || typeof v === 'number' ? v : ''
}
function choices(field: SchemaField) {
  return field.type === 'array' ? field.items.enum : (field.enum ?? [])
}
function choiceIndex(key: string, field: SchemaField) {
  const index = choices(field).findIndex((v) => v === model.value[key])
  return index < 0 ? '' : String(index)
}
function toggle(key: string, value: string | number | boolean, on: boolean) {
  const previous = model.value[key]
  const values = Array.isArray(previous) ? previous : []
  set(key, on ? [...values.filter((v) => v !== value), value] : values.filter((v) => v !== value))
}
function validate() {
  submitted.value = true
  return !Object.keys(errors.value).length
}
defineExpose({ validate })
</script>

<template>
  <fieldset :disabled="disabled" class="grid min-w-0 gap-4">
    <UiField
      v-for="(field, key) in schema.properties"
      :key="key"
      :label="schemaText(field, 'title', locale) || key"
      :hint="schemaText(field, 'description', locale)"
      :required="schema.required?.includes(key)"
      :error="(submitted || touched[key]) && errors[key] ? t(`schemaForm.errors.${errors[key]}`) : undefined"
    >
      <template #default="{ id, invalid }">
        <div
          v-if="field.type === 'array'"
          :id="id"
          role="group"
          :aria-label="schemaText(field, 'title', locale) || key"
          class="flex flex-wrap gap-3"
        >
          <UiCheckbox
            v-for="(option, i) in field.items.enum"
            :key="i"
            :label="String(option)"
            :model-value="
              Array.isArray(model[key]) && (model[key] as Array<string | number | boolean>).includes(option)
            "
            :disabled="disabled"
            @update:model-value="(on) => toggle(key, option, on)"
          />
        </div>
        <UiSelect
          v-else-if="field.enum"
          :id="id"
          :model-value="choiceIndex(key, field)"
          :options="[
            { value: '', label: t('common.select') },
            ...choices(field).map((v, i) => ({ value: String(i), label: String(v) })),
          ]"
          :invalid="invalid"
          :disabled="disabled"
          @update:model-value="(v) => set(key, v === '' ? undefined : choices(field)[Number(v)])"
        />
        <UiSelect
          v-else-if="field.type === 'boolean'"
          :id="id"
          :model-value="model[key] === undefined ? '' : String(model[key])"
          :options="[
            { value: '', label: t('common.select') },
            { value: 'true', label: t('schemaForm.yes') },
            { value: 'false', label: t('schemaForm.no') },
          ]"
          :invalid="invalid"
          :disabled="disabled"
          @update:model-value="(v) => set(key, v === '' ? undefined : v === 'true')"
        />
        <UiInput
          v-else
          :id="id"
          :model-value="scalar(key)"
          :invalid="invalid"
          :type="field.type === 'string' ? (field.writeOnly ? 'password' : 'text') : 'number'"
          :autocomplete="field.type === 'string' && field.writeOnly ? 'new-password' : 'off'"
          :min="'minimum' in field ? field.minimum : undefined"
          :max="'maximum' in field ? field.maximum : undefined"
          :step="field.type === 'integer' ? 1 : 'any'"
          :maxlength="field.type === 'string' ? (field.maxLength ?? 4000) : undefined"
          :required="schema.required?.includes(key)"
          :disabled="disabled"
          @blur="touched[key] = true"
          @update:model-value="
            (v) =>
              set(key, v == null || v === '' ? undefined : field.type === 'string' ? String(v) : Number(v))
          "
        />
      </template>
    </UiField>
    <p v-if="errors && Object.values(errors).includes('unknown')" class="text-sm text-danger" role="alert">
      {{ t('schemaForm.errors.unknown') }}
    </p>
  </fieldset>
</template>
