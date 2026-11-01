import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** Two-way binding between a list filter and the URL query, so filtered views are shareable. */
export function useQueryParam<T extends string>(name: string, fallback: T) {
  const route = useRoute()
  const router = useRouter()
  return computed<T>({
    get: () =>
      typeof route.query[name] === 'string' && route.query[name] ? (route.query[name] as T) : fallback,
    set: (v) =>
      void router.replace({ query: { ...route.query, [name]: v === fallback || !v ? undefined : v } }),
  })
}
