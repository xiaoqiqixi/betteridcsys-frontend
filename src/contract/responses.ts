import { z } from 'zod'
export const ok = z.object({ ok: z.literal(true) }).meta({ id: 'Ok' })
