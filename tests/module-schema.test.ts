import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import type { ModuleSchema } from '@/contract/server'
import {
  schemaDefaults,
  schemaText,
  splitModuleSecrets,
  validateModuleFields,
} from '@/shared/lib/module-schema'
import SchemaForm from '@/shared/ui/SchemaForm.vue'
import en from '@/shared/i18n/en'
import zh from '@/shared/i18n/zh-CN'
import { useCart } from '@/shared/stores/cart'

const schema: ModuleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['count', 'enabled', 'password'],
  properties: {
    count: {
      type: 'integer',
      minimum: 1,
      maximum: 4,
      default: 1,
      'x-i18n': { en: { title: 'Count' }, 'zh-CN': { title: '数量' } },
    },
    enabled: { type: 'boolean' },
    password: { type: 'string', writeOnly: true, minLength: 12, title: 'Password' },
    ratio: { type: 'number', minimum: 0, maximum: 1 },
    region: { type: 'string', enum: ['east', 'west'] },
    features: { type: 'array', items: { type: 'string', enum: ['a', 'b'] }, maxItems: 1 },
  },
}
afterEach(() => localStorage.clear())
describe('module schema forms', () => {
  it('matches server Unicode length, optional empty field and safe number rules', () => {
    const unicode: ModuleSchema = {
      type: 'object',
      additionalProperties: false,
      properties: { label: { type: 'string', minLength: 1, maxLength: 2 }, count: { type: 'number' } },
    }
    expect(validateModuleFields(unicode, { label: '🌊岛', count: 1.5 })).toEqual({})
    expect(validateModuleFields(unicode, { label: '' })).toEqual({ label: 'range' })
    expect(validateModuleFields(unicode, { label: '🌊🌊岛' })).toEqual({ label: 'range' })
    expect(validateModuleFields(unicode, { count: Number.MAX_SAFE_INTEGER + 1 })).toEqual({ count: 'type' })
  })
  it('validates required false, numeric types, enums, boundaries and unknown fields', () => {
    const values = { count: 2, enabled: false, password: 'test-password-only' }
    expect(validateModuleFields(schema, values)).toEqual({})
    expect(
      validateModuleFields(schema, {
        ...values,
        count: 1.5,
        ratio: 2,
        region: 'bad',
        features: ['a', 'a'],
        extra: true,
      }),
    ).toEqual({ count: 'type', ratio: 'range', region: 'choice', features: 'range', extra: 'unknown' })
    expect(validateModuleFields(schema, {})).toEqual({
      count: 'required',
      enabled: 'required',
      password: 'required',
    })
    expect(schemaDefaults(schema)).toEqual({ count: 1 })
    expect(schemaText(schema.properties.count!, 'title', 'zh-CN')).toBe('数量')
  })
  it('renders translated labels, password inputs and validation feedback', async () => {
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, 'zh-CN': zh } })
    const wrapper = mount(SchemaForm, { props: { schema, modelValue: {} }, global: { plugins: [i18n] } })
    expect(wrapper.text()).toContain('Count')
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.vm.validate()).toBe(false)
    await nextTick()
    expect(wrapper.findAll('[role="alert"]').length).toBeGreaterThan(0)
    i18n.global.locale.value = 'zh-CN'
    await nextTick()
    expect(wrapper.text()).toContain('数量')
    expect(wrapper.text()).toContain('请填写此项')
    wrapper.unmount()
  })
  it('keeps password module fields out of persistent cart storage and drops them on removal', async () => {
    setActivePinia(createPinia())
    const cart = useCart()
    const { fields, secrets } = splitModuleSecrets(schema, { count: 2, password: 'module-secret-fixture' })
    const key = cart.add(
      {
        product_id: 'p',
        cycle: 'monthly',
        quantity: 1,
        options: {},
        module_fields: fields,
        module_secret_keys: ['password'],
      },
      undefined,
      secrets,
    )
    await nextTick()
    expect(localStorage.getItem('bis.cart.v1')).not.toContain('module-secret-fixture')
    expect(cart.inputs()[0]?.module_fields?.password).toBe('module-secret-fixture')
    expect(cart.hasModuleSecrets(key)).toBe(true)
    setActivePinia(createPinia())
    const reloaded = useCart()
    expect(reloaded.hasModuleSecrets(key)).toBe(false)
    expect(reloaded.inputs()[0]?.module_fields?.password).toBeUndefined()
    cart.remove(key)
    expect(cart.inputs()).toEqual([])
  })
})
