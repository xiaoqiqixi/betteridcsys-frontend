import type { z } from 'zod'
import { api } from '@/contract/client-endpoints'
import type { QuoteRequest } from '@/contract/commerce'

export { api }
export type QuoteRequestBody = z.input<typeof QuoteRequest>
