import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import type { Service, Snapshot } from '@/contract/commerce'
import SnapshotsPanel from '@/modules/portal/components/service/SnapshotsPanel.vue'
import { createApi, type TransportRequest } from '@/shared/api'
import en from '@/shared/i18n/en'
import privateEn from '@/shared/i18n/en-private'

const service: Service = {
  id: 'service-1',
  label: 'My server',
  product_name: 'Small',
  kind: 'cloud_server',
  status: 'active',
  region: 'Local',
  country: 'US',
  hostname: 'my-server',
  primary_ipv4: '192.0.2.10',
  cycle: 'monthly',
  recurring: { currency: 'USD', amount_minor: 1000, decimal_places: 2 },
  next_due_at: null,
  auto_renew: true,
  power: 'stopped',
  created_at: '2026-01-01T00:00:00Z',
  capabilities: {
    power: true,
    reinstall: true,
    reset_password: true,
    console: true,
    rescue: false,
    snapshots: true,
    metrics: true,
    upgrade: true,
  },
  custom_actions: [],
  rescue: null,
  specs: {
    cpu_cores: 1,
    memory_mb: 512,
    disk_gb: 4,
    bandwidth_mbps: 0,
    traffic_gb: null,
    ipv4: 1,
    ipv6: false,
  },
  os_image: null,
  available_images: [],
  ipv4: ['192.0.2.10'],
  ipv6: [],
  node_label: 'Local node',
  traffic: null,
  cancellation: null,
  suspension_reason: null,
  terminates_at: null,
  tasks: [],
  renewal_options: [],
}

let wrapper: VueWrapper | undefined
let client: QueryClient | undefined

afterEach(() => {
  wrapper?.unmount()
  client?.clear()
  vi.useRealTimers()
})

function renderPanel(items: () => Snapshot[]) {
  const requests: TransportRequest[] = []
  createApi(async (request) => {
    requests.push(request)
    return {
      status: 200,
      header: () => null,
      json: async () => ({ data: { items: items(), limit: 2, requires_stopped: true } }),
    }
  }, {})
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  wrapper = mount(SnapshotsPanel, {
    props: { service },
    global: {
      plugins: [
        [VueQueryPlugin, { queryClient: client }],
        createI18n({ legacy: false, locale: 'en', messages: { en: { ...en, ...privateEn } } }),
      ],
      stubs: { UiTooltip: { template: '<span><slot /></span>' } },
    },
  })
  return { panel: wrapper, requests }
}

describe('snapshot panel', () => {
  it('opens the snapshot form with the real query lifecycle', async () => {
    const { panel, requests } = renderPanel(() => [])
    await flushPromises()
    expect(requests.map((request) => request.url)).toEqual(['/api/v1/services/service-1/snapshots'])
    await panel.get('input[placeholder="Snapshot name"]').setValue('Before upgrade')
    expect(panel.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await panel.setProps({ service: { ...service, power: 'running' } })
    expect(panel.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it.each(['creating', 'restoring'] as const)(
    'polls %s snapshots until they become ready',
    async (status) => {
      vi.useFakeTimers()
      let current: Snapshot['status'] = status
      const { panel, requests } = renderPanel(() => [
        {
          id: 'snapshot-1',
          name: 'Before upgrade',
          status: current,
          size_gb: 4,
          created_at: '2026-01-01T00:00:00Z',
        },
      ])
      await flushPromises()
      const restore = () => panel.findAll('button').find((button) => button.text() === 'Restore')!
      expect(restore().attributes('disabled')).toBeDefined()
      expect(requests).toHaveLength(1)
      current = 'ready'
      await vi.advanceTimersByTimeAsync(4000)
      await flushPromises()
      expect(requests).toHaveLength(2)
      expect(restore().attributes('disabled')).toBeUndefined()
      await vi.advanceTimersByTimeAsync(12000)
      expect(requests).toHaveLength(2)
    },
  )
})
