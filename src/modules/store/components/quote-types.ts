import type { z } from 'zod'
import { api } from '@/contract'
import type { QuoteRequest } from '@/contract/commerce'

export { api }
export type QuoteRequestBody = z.input<typeof QuoteRequest>
