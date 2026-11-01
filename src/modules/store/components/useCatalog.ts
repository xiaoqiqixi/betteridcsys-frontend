import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { api } from '@/contract'
import type { Product } from '@/contract/commerce'
import { useApiQuery } from '@/shared/api/query'
import { useSite } from '@/shared/composables/site'

/** Products for the active currency joined with their taxonomy entries. */
export function useCatalog(filter: MaybeRefOrGetter<{ type?: string; region?: string }> = {}) {
  const site = useSite()
  const products = useApiQuery(
    api.site.products,
    () => ({ query: { currency: site.currency.value, ...toValue(filter) } }),
    { staleTime: 60_000, keepPrevious: true },
  )
  const tax = computed(() => site.taxonomy.data.value)
  const regionOf = (p: Product) => tax.value?.regions.find((r) => r.id === p.region_id)
  const nodeOf = (p: Product) => tax.value?.nodes.find((n) => n.id === p.node_id)
  const typeOf = (p: Product) => tax.value?.types.find((t) => t.id === p.type_id)
  const visibleTypes = computed(() =>
    (tax.value?.types ?? []).filter((t) => t.visible).sort((a, b) => a.sort_order - b.sort_order),
  )
  const visibleRegions = computed(() =>
    (tax.value?.regions ?? []).filter((r) => r.visible).sort((a, b) => a.sort_order - b.sort_order),
  )
  return { site, products, regionOf, nodeOf, typeOf, visibleTypes, visibleRegions }
}
