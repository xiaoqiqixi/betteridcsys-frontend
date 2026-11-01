import { QueryClient } from '@tanstack/vue-query'
import { isApiError } from './errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      // Client errors are answers, not glitches; only transient failures are retried.
      retry: (count, error) =>
        count < 2 &&
        (!isApiError(error) || error.status === 0 || error.status >= 500) &&
        !(isApiError(error) && error.code === 'INVALID_RESPONSE'),
    },
    mutations: { retry: false },
  },
})
