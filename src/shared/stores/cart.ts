import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import type { ModuleFields } from '@/contract/server'
import type { BillingCycle } from '@/contract'
import type { CartItemInput } from '@/contract/commerce'

export interface CartLine {
  key: string
  product_id: string
  cycle: BillingCycle
  quantity: number
  options: Record<string, string | number>
  module_fields?: ModuleFields
  module_secret_keys?: string[]
  hostname?: string
  ssh_key_ids?: string[]
}

/**
 * Cart contents persist in localStorage so a visitor can sign in mid-checkout.
 * Root passwords never touch storage: they live in memory only and are dropped on reload.
 */
export const useCart = defineStore('cart', () => {
  const lines = useStorage<CartLine[]>('bis.cart.v1', [], localStorage)
  const secrets = reactive(new Map<string, string>())

  const moduleSecrets = reactive(new Map<string, ModuleFields>())

  function add(line: Omit<CartLine, 'key'>, rootPassword?: string, privateFields?: ModuleFields): string {
    const key = crypto.getRandomValues(new Uint32Array(2)).join('-')
    lines.value = [...lines.value, { ...line, key }]
    if (privateFields) moduleSecrets.set(key, privateFields)
    if (rootPassword) secrets.set(key, rootPassword)
    return key
  }
  function update(key: string, patch: Partial<Omit<CartLine, 'key'>>, rootPassword?: string | null) {
    lines.value = lines.value.map((l) => (l.key === key ? { ...l, ...patch } : l))
    if (rootPassword === null) secrets.delete(key)
    else if (rootPassword) secrets.set(key, rootPassword)
  }
  function remove(key: string) {
    lines.value = lines.value.filter((l) => l.key !== key)
    secrets.delete(key)
    moduleSecrets.delete(key)
  }
  function clear() {
    lines.value = []
    secrets.clear()
    moduleSecrets.clear()
  }
  function inputs(): CartItemInput[] {
    return lines.value.map((l) => ({
      product_id: l.product_id,
      cycle: l.cycle,
      quantity: l.quantity,
      options: l.options,
      module_fields: { ...l.module_fields, ...moduleSecrets.get(l.key) },
      ...(l.hostname ? { hostname: l.hostname } : {}),
      ...(l.ssh_key_ids?.length ? { ssh_key_ids: l.ssh_key_ids } : {}),
      ...(secrets.get(l.key) ? { root_password: secrets.get(l.key) } : {}),
    }))
  }
  const count = computed(() => lines.value.reduce((n, l) => n + l.quantity, 0))
  const hasModuleSecrets = (key: string) =>
    (lines.value.find((l) => l.key === key)?.module_secret_keys ?? []).every(
      (k) => moduleSecrets.get(key)?.[k] !== undefined,
    )
  const hasPassword = (key: string) => secrets.has(key)
  return { lines, add, update, remove, clear, inputs, count, hasPassword, hasModuleSecrets }
})
