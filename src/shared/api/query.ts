import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/vue-query'
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import type { AnyEndpoint, CallInput, Page, Result } from '@/contract'
import { api, idempotencyKey } from '.'
import { isApiError } from './errors'

type Input<E extends AnyEndpoint> = Omit<CallInput<E>, 'signal' | 'idempotencyKey'>

export function queryKey<E extends AnyEndpoint>(endpoint: E, input?: unknown) {
  return input === undefined ? [endpoint.id] : [endpoint.id, input]
}

/** Read an endpoint. Pass `null` as input to keep the query disabled. */
export function useApiQuery<E extends AnyEndpoint>(
  endpoint: E,
  input: MaybeRefOrGetter<Input<E> | null> = {} as Input<E>,
  options: {
    enabled?: MaybeRefOrGetter<boolean>
    staleTime?: number
    refetchInterval?: MaybeRefOrGetter<number | false>
    keepPrevious?: boolean
  } = {},
) {
  return useQuery({
    queryKey: computed(() => queryKey(endpoint, toValue(input) ?? {})),
    queryFn: ({ signal }) =>
      api().call(endpoint, { ...(toValue(input) as Input<E>), signal } as CallInput<E>),
    enabled: computed(() => toValue(input) !== null && (toValue(options.enabled) ?? true)),
    staleTime: options.staleTime,
    refetchInterval: computed(() => toValue(options.refetchInterval) ?? false),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  })
}

/** Cursor-paginated list with "load more". */
export function useApiList<E extends AnyEndpoint>(
  endpoint: E,
  input: MaybeRefOrGetter<Input<E>> = {} as Input<E>,
) {
  const q = useInfiniteQuery({
    queryKey: computed(() => [...queryKey(endpoint, toValue(input)), 'list']),
    queryFn: ({ pageParam, signal }) => {
      const base = toValue(input) as Input<E> & { query?: Record<string, unknown> }
      return api().call(endpoint, {
        ...base,
        query: { ...(base.query ?? {}), ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
      } as CallInput<E>) as Promise<Page<unknown>>
    },
    initialPageParam: '' as string,
    getNextPageParam: (last: Page<unknown>) => last.next_cursor ?? undefined,
    placeholderData: keepPreviousData,
  })
  type Item = Result<E> extends Page<infer T> ? T : never
  const items = computed(() => (q.data.value?.pages.flatMap((p) => p.items) ?? []) as Item[])
  const total = computed(() => q.data.value?.pages[0]?.total)
  return Object.assign(q, { items, total })
}

export function invalidate(client: QueryClient, endpoints: AnyEndpoint[]) {
  const ids = new Set(endpoints.map((e) => e.id))
  return client.invalidateQueries({ predicate: (q) => ids.has(String(q.queryKey[0])) })
}

/**
 * Write to an endpoint. The idempotency key survives an *uncertain* failure so a
 * user-initiated retry replays the same operation instead of creating a second one.
 */
export function useApiMutation<E extends AnyEndpoint>(
  endpoint: E,
  options: {
    invalidates?: AnyEndpoint[]
    onSuccess?: (data: Result<E>, input: Input<E>) => unknown
  } = {},
) {
  const client = useQueryClient()
  const attemptKey = ref<string | null>(null)
  const m = useMutation({
    mutationFn: (input: Input<E>) => {
      const key = attemptKey.value ?? idempotencyKey()
      attemptKey.value = key
      return api().call(endpoint, { ...input, idempotencyKey: key } as CallInput<E>)
    },
    onSuccess: async (data, input) => {
      attemptKey.value = null
      if (options.invalidates?.length) await invalidate(client, options.invalidates)
      await options.onSuccess?.(data as Result<E>, input)
    },
    onError: (err) => {
      if (!(isApiError(err) && err.uncertain)) attemptKey.value = null
    },
  })
  const uncertain = computed(() => isApiError(m.error.value) && m.error.value.uncertain)
  /** Call after the user has re-read the resource and wants a genuinely new attempt. */
  function newAttempt() {
    attemptKey.value = null
    m.reset()
  }
  return Object.assign(m, { uncertain, newAttempt })
}
