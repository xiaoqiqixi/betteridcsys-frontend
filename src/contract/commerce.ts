import { z } from 'zod'
import {
  BillingCycle,
  CurrencyCode,
  Id,
  LocalizedText,
  MinorAmount,
  Money,
  Revision,
  TaskStatus,
  Timestamp,
} from './common'

/* ---------------------------------------------------------------- products */

export const ProductKind = z
  .enum(['cloud_server', 'dedicated_server', 'generic'])
  .meta({ id: 'ProductKind', description: 'cloud_server is provisioned through a cloud controller.' })

export const ProductSpecs = z
  .object({
    cpu_cores: z.int().min(0),
    memory_mb: z.int().min(0),
    disk_gb: z.int().min(0),
    bandwidth_mbps: z.int().min(0),
    /** null = unmetered. */
    traffic_gb: z.int().min(0).nullable(),
    ipv4: z.int().min(0),
    ipv6: z.boolean(),
  })
  .meta({ id: 'ProductSpecs' })
export type ProductSpecs = z.infer<typeof ProductSpecs>

/** Price of one billing cycle in one currency. Missing combinations are not sold. */
export const PricePoint = z
  .object({
    cycle: BillingCycle,
    currency: CurrencyCode,
    recurring_minor: MinorAmount.min(0),
    setup_minor: MinorAmount.min(0),
    decimal_places: z.int().min(0).max(6),
  })
  .meta({ id: 'PricePoint' })
export type PricePoint = z.infer<typeof PricePoint>

export const OptionChoice = z
  .object({
    id: Id,
    label: LocalizedText,
    /** Extra recurring charge per cycle and currency; empty means free. */
    prices: z.array(PricePoint),
  })
  .meta({ id: 'OptionChoice' })

/**
 * Configurable option (配置项). `os_image` choices are resolved from the cloud image catalog;
 * `quantity` options multiply the unit price.
 */
export const ProductOption = z
  .object({
    id: Id,
    key: z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),
    kind: z.enum(['select', 'quantity', 'os_image']),
    label: LocalizedText,
    required: z.boolean(),
    choices: z.array(OptionChoice),
    min: z.int().min(0).optional(),
    max: z.int().min(0).optional(),
    unit_prices: z.array(PricePoint).optional(),
  })
  .meta({ id: 'ProductOption' })
export type ProductOption = z.infer<typeof ProductOption>

export const OsImage = z
  .object({
    id: Id,
    family: z.enum([
      'ubuntu',
      'debian',
      'centos',
      'rocky',
      'alma',
      'fedora',
      'windows',
      'alpine',
      'arch',
      'other',
    ]),
    name: z.string().max(80),
    version: z.string().max(40),
    min_disk_gb: z.int().min(1),
  })
  .meta({ id: 'OsImage' })
export type OsImage = z.infer<typeof OsImage>

export const Product = z
  .object({
    id: Id,
    slug: z.string().regex(/^[a-z0-9-]{1,64}$/),
    kind: ProductKind,
    type_id: Id,
    region_id: Id,
    node_id: Id,
    name: LocalizedText,
    description: LocalizedText,
    badges: z.array(z.enum(['new', 'hot', 'limited', 'best_value'])),
    specs: ProductSpecs,
    prices: z.array(PricePoint),
    options: z.array(ProductOption),
    os_images: z.array(OsImage),
    /** null = unlimited. */
    stock: z.int().min(0).nullable(),
    available: z.boolean(),
    sort_order: z.int(),
  })
  .meta({ id: 'Product' })
export type Product = z.infer<typeof Product>

export const ProductQuery = z.object({
  type: z.string().max(64).optional(),
  region: z.string().max(64).optional(),
  currency: CurrencyCode.optional(),
})

/* -------------------------------------------------------------- cart/quote */

export const CartItemInput = z
  .object({
    product_id: Id,
    cycle: BillingCycle,
    quantity: z.int().min(1).max(20),
    options: z.record(z.string(), z.union([z.string(), z.int()])),
    hostname: z
      .string()
      .regex(/^(?=.{1,63}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/)
      .optional(),
    /** Credentials for the first boot. Never echoed back. */
    root_password: z.string().min(12).max(128).optional(),
    ssh_key_ids: z.array(Id).max(10).optional(),
  })
  .meta({ id: 'CartItemInput' })
export type CartItemInput = z.infer<typeof CartItemInput>

export const QuoteRequest = z.object({
  items: z.array(CartItemInput).min(1).max(20),
  coupon: z.string().max(64).optional(),
  currency: CurrencyCode,
})
export type QuoteRequest = z.infer<typeof QuoteRequest>

export const QuoteLine = z
  .object({
    kind: z.enum(['product', 'option', 'setup', 'discount']),
    item_index: z.int().min(0).nullable(),
    description: z.string(),
    amount: Money,
  })
  .meta({ id: 'QuoteLine' })
export type QuoteLine = z.infer<typeof QuoteLine>

export const Quote = z
  .object({
    currency: CurrencyCode,
    lines: z.array(QuoteLine),
    subtotal: Money,
    discount: Money,
    total: Money,
    /** Recurring amount per item after the first period, for display. */
    renewals: z.array(z.object({ item_index: z.int(), cycle: BillingCycle, amount: Money })),
    coupon: z.object({ code: z.string(), valid: z.boolean(), message: z.string().optional() }).nullable(),
    /** Digest the order endpoint compares against to reject stale prices (409 QUOTE_CHANGED). */
    quote_digest: z.string().regex(/^[0-9a-f]{64}$/),
    expires_at: Timestamp,
  })
  .meta({ id: 'Quote' })
export type Quote = z.infer<typeof Quote>

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

/**
 * A payment method provided by an installed payment plugin (slot). Any number of plugins can
 * be active at once; the UI renders whatever the backend lists, so adding a gateway never
 * needs a frontend change.
 */
export const CheckoutFlow = z.enum(['redirect', 'qr', 'instructions']).meta({
  id: 'CheckoutFlow',
  description: 'redirect: hosted page · qr: scan-to-pay payload · instructions: offline transfer details',
})

export const PaymentGateway = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/),
    name: LocalizedText,
    description: LocalizedText.optional(),
    /** `data:image/svg+xml;base64,…` or `data:image/png;base64,…`, ≤ 16 KiB, supplied by the plugin manifest. */
    logo: z
      .string()
      .max(22000)
      .regex(/^data:image\/(svg\+xml|png);base64,[A-Za-z0-9+/=]+$/)
      .nullable(),
    flow: CheckoutFlow,
    currencies: z.array(CurrencyCode),
    /** Fee the gateway adds on top, shown before paying. Absent when free. */
    fee: z
      .object({
        percent_bp: z.int().min(0).max(10000),
        fixed: z.array(z.object({ currency: CurrencyCode, amount_minor: MinorAmount.min(0) })),
      })
      .nullable(),
    min: z.array(z.object({ currency: CurrencyCode, amount_minor: MinorAmount.min(0) })),
    max: z.array(z.object({ currency: CurrencyCode, amount_minor: MinorAmount.min(0) })),
  })
  .meta({ id: 'PaymentGateway' })
export type PaymentGateway = z.infer<typeof PaymentGateway>

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
