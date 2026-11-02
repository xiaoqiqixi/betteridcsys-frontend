import { z } from 'zod'
import { BillingCycle, Id, MinorAmount, Money, Revision, TaskStatus, Timestamp } from './common'

import { ProductKind, ProductSpecs, OsImage } from './catalog'
export * from './catalog'
import { QuoteRequest, PaymentGateway } from './purchase'
export * from './purchase'

/* ------------------------------------------------------------------ orders */

export const OrderStatus = z
  .enum(['pending_payment', 'paid', 'active', 'cancelled', 'fraud'])
  .meta({ id: 'OrderStatus' })

export const OrderItem = z
  .object({
    product_id: Id,
    product_name: z.string(),
    cycle: BillingCycle,
    quantity: z.int(),
    hostname: z.string().nullable(),
    options_summary: z.array(z.string()),
    amount: Money,
    service_ids: z.array(Id),
  })
  .meta({ id: 'OrderItem' })

export const Order = z
  .object({
    id: Id,
    number: z.string(),
    status: OrderStatus,
    items: z.array(OrderItem),
    total: Money,
    invoice_id: Id.nullable(),
    coupon_code: z.string().nullable(),
    created_at: Timestamp,
    paid_at: Timestamp.nullable(),
    cancelled_at: Timestamp.nullable(),
  })
  .meta({ id: 'Order' })
export type Order = z.infer<typeof Order>

export const OrderCreate = QuoteRequest.extend({
  quote_digest: z.string().regex(/^[0-9a-f]{64}$/),
  /** Apply available account credit before asking for a gateway payment. */
  apply_credit: z.boolean(),
})

/* ---------------------------------------------------------------- invoices */

export const InvoiceStatus = z
  .enum(['unpaid', 'paid', 'cancelled', 'refunded', 'partially_refunded'])
  .meta({ id: 'InvoiceStatus' })
export const InvoiceKind = z
  .enum(['order', 'renewal', 'upgrade', 'top_up', 'manual'])
  .meta({ id: 'InvoiceKind' })

export const InvoiceLine = z
  .object({
    description: z.string(),
    service_id: Id.nullable(),
    amount: Money,
    period: z.string().nullable(),
  })
  .meta({ id: 'InvoiceLine' })

export const InvoicePayment = z
  .object({
    id: Id,
    method: z.enum(['credit', 'gateway', 'manual']),
    gateway: z.string().nullable(),
    reference: z.string().nullable(),
    amount: Money,
    status: z.enum(['pending', 'succeeded', 'expired', 'voided', 'refunded', 'duplicate']),
    created_at: Timestamp,
  })
  .meta({ id: 'InvoicePayment' })

export const Invoice = z
  .object({
    id: Id,
    number: z.string(),
    kind: InvoiceKind,
    status: InvoiceStatus,
    lines: z.array(InvoiceLine),
    subtotal: Money,
    credit_applied: Money,
    total: Money,
    amount_paid: Money,
    balance_due: Money,
    issued_at: Timestamp,
    due_at: Timestamp,
    paid_at: Timestamp.nullable(),
    order_id: Id.nullable(),
    payments: z.array(InvoicePayment),
    issuer: z.object({ name: z.string(), address: z.string() }),
    billed_to: z.object({ name: z.string(), company: z.string(), address: z.string() }),
  })
  .meta({ id: 'Invoice' })
export type Invoice = z.infer<typeof Invoice>

export const InvoiceSummary = Invoice.pick({
  id: true,
  number: true,
  kind: true,
  status: true,
  total: true,
  balance_due: true,
  issued_at: true,
  due_at: true,
  paid_at: true,
}).meta({ id: 'InvoiceSummary' })
export type InvoiceSummary = z.infer<typeof InvoiceSummary>

export const PayRequest = z.discriminatedUnion('method', [
  z.object({ method: z.literal('credit') }),
  z.object({ method: z.literal('gateway'), gateway_id: PaymentGateway.shape.id }),
])
export const PayResult = z
  .discriminatedUnion('status', [
    z.object({ status: z.literal('paid'), invoice: Invoice }),
    z.object({ status: z.literal('redirect'), payment_id: Id, checkout_url: z.url(), expires_at: Timestamp }),
    z.object({
      status: z.literal('qr'),
      payment_id: Id,
      qr_payload: z.string().min(1).max(2048),
      amount: Money,
      expires_at: Timestamp,
    }),
    z.object({
      status: z.literal('instructions'),
      payment_id: Id,
      /** Plain text (no HTML); the UI renders it verbatim with line breaks. */
      instructions: z.string().max(8000),
      reference: z.string().max(120),
      amount: Money,
      expires_at: Timestamp.nullable(),
    }),
  ])
  .meta({ id: 'PayResult' })
export type PayResult = z.infer<typeof PayResult>

export const PaymentStatus = z
  .object({
    payment_id: Id,
    status: z.enum(['pending', 'succeeded', 'expired', 'voided', 'failed']),
    invoice_status: InvoiceStatus,
  })
  .meta({ id: 'PaymentStatus' })

/* ------------------------------------------------------------------ credit */

export const CreditEntry = z
  .object({
    id: Id,
    kind: z.enum(['top_up', 'invoice_payment', 'refund', 'adjustment', 'affiliate_payout', 'overpayment']),
    amount: Money,
    balance_after: Money,
    description: z.string(),
    invoice_id: Id.nullable(),
    created_at: Timestamp,
  })
  .meta({ id: 'CreditEntry' })
export type CreditEntry = z.infer<typeof CreditEntry>

export const CreditSummary = z
  .object({
    balance: Money,
    top_up: z.object({ min: Money, max: Money, presets: z.array(Money) }),
  })
  .meta({ id: 'CreditSummary' })
export type CreditSummary = z.infer<typeof CreditSummary>

export const TopUpRequest = z.object({ amount_minor: MinorAmount.min(1) })

/* ---------------------------------------------------------------- services */

export const ServiceStatus = z
  .enum(['pending', 'provisioning', 'active', 'suspended', 'terminated', 'cancelled', 'failed'])
  .meta({ id: 'ServiceStatus' })
export type ServiceStatus = z.infer<typeof ServiceStatus>

export const PowerState = z
  .enum(['running', 'stopped', 'starting', 'stopping', 'rebooting', 'reinstalling', 'unknown'])
  .meta({ id: 'PowerState' })
export type PowerState = z.infer<typeof PowerState>

export const ServiceSummary = z
  .object({
    id: Id,
    label: z.string().max(80),
    product_name: z.string(),
    kind: ProductKind,
    status: ServiceStatus,
    region: z.string(),
    country: z.string(),
    hostname: z.string().nullable(),
    primary_ipv4: z.string().nullable(),
    cycle: BillingCycle,
    recurring: Money,
    next_due_at: Timestamp.nullable(),
    auto_renew: z.boolean(),
    power: PowerState.nullable(),
    created_at: Timestamp,
  })
  .meta({ id: 'ServiceSummary' })
export type ServiceSummary = z.infer<typeof ServiceSummary>

export const ServiceTask = z
  .object({
    id: Id,
    action: z.enum([
      'provision',
      'start',
      'stop',
      'reboot',
      'force_off',
      'reinstall',
      'reset_password',
      'rescue_enter',
      'rescue_exit',
      'snapshot_create',
      'snapshot_restore',
      'snapshot_delete',
      'upgrade',
      'suspend',
      'unsuspend',
      'terminate',
    ]),
    status: TaskStatus,
    message: z.string().nullable(),
    created_at: Timestamp,
    finished_at: Timestamp.nullable(),
  })
  .meta({ id: 'ServiceTask' })
export type ServiceTask = z.infer<typeof ServiceTask>

/** What the provisioning backend can do for this service; the UI only offers these. */
export const ServiceCapabilities = z
  .object({
    power: z.boolean(),
    reinstall: z.boolean(),
    reset_password: z.boolean(),
    console: z.boolean(),
    rescue: z.boolean(),
    snapshots: z.boolean(),
    metrics: z.boolean(),
    upgrade: z.boolean(),
  })
  .meta({ id: 'ServiceCapabilities' })
export type ServiceCapabilities = z.infer<typeof ServiceCapabilities>

export const Service = ServiceSummary.extend({
  capabilities: ServiceCapabilities,
  rescue: z.object({ active: z.boolean(), since: Timestamp }).nullable(),
  specs: ProductSpecs,
  os_image: OsImage.nullable(),
  /** Images this service may be reinstalled with (the product's enabled images). */
  available_images: z.array(OsImage),
  ipv4: z.array(z.string()),
  ipv6: z.array(z.string()),
  node_label: z.string(),
  traffic: z
    .object({ used_gb: z.number().min(0), limit_gb: z.int().nullable(), resets_at: Timestamp })
    .nullable(),
  cancellation: z
    .object({ type: z.enum(['immediate', 'end_of_period']), reason: z.string(), requested_at: Timestamp })
    .nullable(),
  suspension_reason: z.string().nullable(),
  terminates_at: Timestamp.nullable(),
  tasks: z.array(ServiceTask),
  renewal_options: z.array(z.object({ cycle: BillingCycle, amount: Money })),
}).meta({ id: 'Service' })
export type Service = z.infer<typeof Service>

export const ServicePatch = z.object({
  label: z.string().max(80).optional(),
  auto_renew: z.boolean().optional(),
})
export const PowerRequest = z.object({ action: z.enum(['start', 'stop', 'reboot', 'force_off']) })
export const ReinstallRequest = z.object({
  os_image_id: Id,
  root_password: z.string().min(12).max(128).optional(),
  ssh_key_ids: z.array(Id).max(10).optional(),
  /** Must equal the service hostname or id; guards against reinstalling the wrong machine. */
  confirm: z.string().min(1).max(253),
})
export const ResetPasswordRequest = z.object({ root_password: z.string().min(12).max(128) })
export const RenewRequest = z.object({ cycle: BillingCycle })
export const CancellationRequest = z.object({
  type: z.enum(['immediate', 'end_of_period']),
  reason: z.string().min(1).max(1000),
})
export const RescueRequest = z.object({ root_password: z.string().min(12).max(128) })

export const Snapshot = z
  .object({
    id: Id,
    name: z.string().max(60),
    status: z.enum(['creating', 'ready', 'restoring', 'failed']),
    size_gb: z.number().min(0).nullable(),
    created_at: Timestamp,
  })
  .meta({ id: 'Snapshot' })
export type Snapshot = z.infer<typeof Snapshot>
export const SnapshotList = z
  .object({ items: z.array(Snapshot), limit: z.int().min(0), requires_stopped: z.boolean() })
  .meta({ id: 'SnapshotList' })
export const SnapshotCreate = z.object({ name: z.string().min(1).max(60) })

/** Prorated plan change (按剩余时间比例计算). Negative amounts are credited to the account. */
export const UpgradeOption = z
  .object({
    product_id: Id,
    product_name: z.string(),
    specs: ProductSpecs,
    direction: z.enum(['upgrade', 'downgrade']),
    recurring: Money,
    prorated: Money,
    available: z.boolean(),
  })
  .meta({ id: 'UpgradeOption' })
export type UpgradeOption = z.infer<typeof UpgradeOption>
export const UpgradeQuote = z
  .object({
    target_product_id: Id,
    prorated: Money,
    days_remaining: z.int().min(0),
    requires_restart: z.boolean(),
    quote_digest: z.string().regex(/^[0-9a-f]{64}$/),
    expires_at: Timestamp,
  })
  .meta({ id: 'UpgradeQuote' })
export type UpgradeQuote = z.infer<typeof UpgradeQuote>
export const UpgradeRequest = z.object({
  target_product_id: Id,
  quote_digest: z.string().regex(/^[0-9a-f]{64}$/),
})
export const UpgradeResult = z
  .discriminatedUnion('status', [
    z.object({ status: z.literal('invoice'), invoice: z.lazy(() => Invoice) }),
    z.object({ status: z.literal('scheduled'), task: z.lazy(() => ServiceTask) }),
  ])
  .meta({ id: 'UpgradeResult' })

export const ConsoleTicket = z
  .object({ url: z.string(), expires_at: Timestamp })
  .meta({ id: 'ConsoleTicket' })

export const MetricsRange = z.enum(['1h', '24h', '7d', '30d'])
export const ServiceMetrics = z
  .object({
    range: MetricsRange,
    step_seconds: z.int(),
    points: z.array(
      z.object({
        at: Timestamp,
        cpu_percent: z.number().nullable(),
        net_in_bps: z.number().nullable(),
        net_out_bps: z.number().nullable(),
        disk_read_bps: z.number().nullable(),
        disk_write_bps: z.number().nullable(),
      }),
    ),
  })
  .meta({ id: 'ServiceMetrics' })
export type ServiceMetrics = z.infer<typeof ServiceMetrics>

export { Revision }
