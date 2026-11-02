import type { ModuleFields, ModuleSchema, SchemaField } from '@/contract/server'

export function schemaText(field: SchemaField, key: 'title' | 'description', locale: string) {
  const texts = field['x-i18n']
  return (
    texts?.[locale === 'zh-CN' ? 'zh-CN' : 'en']?.[key] ||
    field[key] ||
    texts?.en?.[key] ||
    texts?.['zh-CN']?.[key] ||
    ''
  )
}

export function schemaDefaults(schema: ModuleSchema | null | undefined): ModuleFields {
  return Object.fromEntries(
    Object.entries(schema?.properties ?? {}).flatMap(([key, field]) =>
      field.default === undefined || ('writeOnly' in field && field.writeOnly)
        ? []
        : [[key, structuredClone(field.default)]],
    ),
  )
}

/** Error codes contain neither values nor secret field contents. */
export function validateModuleFields(schema: ModuleSchema | null | undefined, values: ModuleFields) {
  const errors: Record<string, 'required' | 'type' | 'choice' | 'range' | 'unknown'> = {}
  if (!schema) return errors
  for (const key of Object.keys(values)) if (!Object.hasOwn(schema.properties, key)) errors[key] = 'unknown'
  for (const [key, field] of Object.entries(schema.properties)) {
    const value = values[key]
    if (value === undefined || (value === '' && schema.required?.includes(key))) {
      if (schema.required?.includes(key)) errors[key] = 'required'
      continue
    }
    if (field.type === 'array') {
      if (!Array.isArray(value)) errors[key] = 'type'
      else if (value.some((v) => !field.items.enum.includes(v))) errors[key] = 'choice'
      else if (
        new Set(value).size !== value.length ||
        value.length < (field.minItems ?? 0) ||
        value.length > (field.maxItems ?? 100)
      )
        errors[key] = 'range'
    } else if (field.type === 'string') {
      if (typeof value !== 'string') errors[key] = 'type'
      else if ([...value].length < (field.minLength ?? 0) || [...value].length > (field.maxLength ?? 4000))
        errors[key] = 'range'
      else if (field.enum && !field.enum.includes(value)) errors[key] = 'choice'
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') errors[key] = 'type'
      else if (field.enum && !field.enum.includes(value)) errors[key] = 'choice'
    } else {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        Math.abs(value) > Number.MAX_SAFE_INTEGER ||
        (field.type === 'integer' && !Number.isSafeInteger(value))
      )
        errors[key] = 'type'
      else if (value < (field.minimum ?? -Infinity) || value > (field.maximum ?? Infinity))
        errors[key] = 'range'
      else if (field.enum && !field.enum.includes(value)) errors[key] = 'choice'
    }
  }
  return errors
}

export function splitModuleSecrets(schema: ModuleSchema | null | undefined, values: ModuleFields) {
  const fields: ModuleFields = {}
  const secrets: ModuleFields = {}
  for (const [key, value] of Object.entries(values)) {
    const field = schema?.properties[key]
    if (!field) continue
    if (field.type === 'string' && field.writeOnly) secrets[key] = value
    else fields[key] = value
  }
  return { fields, secrets }
}
