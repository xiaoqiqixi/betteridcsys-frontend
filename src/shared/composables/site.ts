import { computed } from 'vue'
import { api as endpoints } from '@/contract'
import { useApiQuery } from '@/shared/api/query'
import { usePrefs } from '@/shared/stores/prefs'
import { useSession } from '@/shared/stores/session'

/** Public site configuration shared by every layout (cached for the whole visit). */
export function useSite() {
  const settings = useApiQuery(endpoints.site.settings, {}, { staleTime: 5 * 60_000 })
  const currencies = useApiQuery(endpoints.site.currencies, {}, { staleTime: 5 * 60_000 })
  const taxonomy = useApiQuery(endpoints.site.taxonomy, {}, { staleTime: 5 * 60_000 })
  const prefs = usePrefs()
  const session = useSession()

  const name = computed(() => settings.data.value?.site_name || '星屿云')
  const enabledCurrencies = computed(() =>
    (currencies.data.value?.currencies ?? [])
      .filter((c) => c.enabled)
      .sort((a, b) => a.sort_order - b.sort_order),
  )
  /** Signed-in clients always shop in their account currency; visitors may choose. */
  const currency = computed(() => {
    const own = session.user?.role === 'customer' ? session.user.currency : null
    const wanted = own ?? prefs.currency ?? currencies.data.value?.default_currency
    return (
      enabledCurrencies.value.find((c) => c.code === wanted)?.code ??
      enabledCurrencies.value[0]?.code ??
      'USD'
    )
  })
  const currencyFormat = computed(() => enabledCurrencies.value.find((c) => c.code === currency.value))

  return { settings, currencies, taxonomy, name, enabledCurrencies, currency, currencyFormat }
}
