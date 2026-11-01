import { useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { computed, type Ref } from 'vue'
import { api, type QuoteRequestBody } from './quote-types'
import { api as client } from '@/shared/api'

/** Live, debounced server quote. Quotes are side-effect free, so they behave like reads. */
export function useQuote(body: Ref<QuoteRequestBody | null>) {
  const debounced = refDebounced(
    computed(() => (body.value ? JSON.stringify(body.value) : null)),
    300,
  )
  return useQuery({
    queryKey: computed(() => ['quote', debounced.value]),
    queryFn: ({ signal }) =>
      client().call(api.site.quote, { body: JSON.parse(debounced.value!) as QuoteRequestBody, signal }),
    enabled: computed(() => !!debounced.value),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    retry: false,
  })
}
