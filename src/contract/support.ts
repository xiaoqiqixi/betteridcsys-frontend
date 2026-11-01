import { z } from 'zod'
import { Id, LocalizedText, MinorAmount, Money, Timestamp } from './common'
import { Announcement } from './site'
import { InvoiceSummary, ServiceSummary } from './commerce'

/* ----------------------------------------------------------------- tickets */

export const TicketStatus = z
  .enum(['open', 'answered', 'customer_reply', 'on_hold', 'closed'])
  .meta({ id: 'TicketStatus' })
export type TicketStatus = z.infer<typeof TicketStatus>
export const TicketPriority = z.enum(['low', 'normal', 'high', 'urgent']).meta({ id: 'TicketPriority' })
export type TicketPriority = z.infer<typeof TicketPriority>

export const Department = z
  .object({
    id: Id,
    name: LocalizedText,
    description: LocalizedText.optional(),
    visible: z.boolean(),
    sort_order: z.int(),
  })
  .meta({ id: 'Department' })
export type Department = z.infer<typeof Department>

export const TicketMessage = z
  .object({
    id: Id,
    author_type: z.enum(['client', 'staff', 'system']),
    /** Staff display name (not email). Clients see their own name. */
    author_name: z.string(),
    body: z.string().max(20000),
    /** Internal notes are only returned to staff. */
    internal: z.boolean(),
    created_at: Timestamp,
  })
  .meta({ id: 'TicketMessage' })
export type TicketMessage = z.infer<typeof TicketMessage>

export const TicketSummary = z
  .object({
    id: Id,
    number: z.string(),
    subject: z.string().max(200),
    department_id: Id,
    status: TicketStatus,
    priority: TicketPriority,
    service_id: Id.nullable(),
    last_reply_at: Timestamp,
    created_at: Timestamp,
  })
  .meta({ id: 'TicketSummary' })
export type TicketSummary = z.infer<typeof TicketSummary>

export const Ticket = TicketSummary.extend({ messages: z.array(TicketMessage) }).meta({ id: 'Ticket' })
export type Ticket = z.infer<typeof Ticket>

export const TicketCreate = z.object({
  department_id: Id,
  subject: z.string().min(3).max(200),
  priority: TicketPriority,
  service_id: Id.optional(),
  body: z.string().min(10).max(20000),
})
export const TicketReply = z.object({ body: z.string().min(1).max(20000) })

/* --------------------------------------------------------------- affiliate */

export const AffiliateSummary = z
  .object({
    enabled: z.boolean(),
    code: z.string().nullable(),
    link: z.string().nullable(),
    commission_percent: z.number().min(0).max(100),
    referrals: z.int().min(0),
    pending: Money,
    available: Money,
    paid_out: Money,
    hold_days: z.int().min(0),
  })
  .meta({ id: 'AffiliateSummary' })
export type AffiliateSummary = z.infer<typeof AffiliateSummary>

export const AffiliateReferral = z
  .object({
    id: Id,
    joined_at: Timestamp,
    /** Masked, e.g. "j***@example.com". */
    client: z.string(),
    commissions: Money,
    status: z.enum(['signed_up', 'converted']),
  })
  .meta({ id: 'AffiliateReferral' })

export const AffiliateWithdraw = z.object({ amount_minor: MinorAmount.min(1) })

/* ---------------------------------------------------------------- overview */

export const ClientOverview = z
  .object({
    counts: z.object({
      active_services: z.int(),
      unpaid_invoices: z.int(),
      open_tickets: z.int(),
      expiring_soon: z.int(),
    }),
    credit: Money,
    amount_due: Money,
    services: z.array(ServiceSummary),
    invoices: z.array(InvoiceSummary),
    announcements: z.array(Announcement),
  })
  .meta({ id: 'ClientOverview' })
export type ClientOverview = z.infer<typeof ClientOverview>

export const ActivityEvent = z
  .object({
    id: Id,
    at: Timestamp,
    action: z.string(),
    /** Customer views never contain staff identity; staff are shown as actor_type=staff. */
    actor_type: z.enum(['self', 'staff', 'system']),
    subject: z.string().nullable(),
    ip: z.string().nullable(),
  })
  .meta({ id: 'ActivityEvent' })
export type ActivityEvent = z.infer<typeof ActivityEvent>
