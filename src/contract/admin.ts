import { z } from 'zod'
import { AdminProductModule, ProductModule, ModuleId } from './server'
export * from './server'
import {
  BillingCycle,
  Country,
  CurrencyCode,
  Email,
  Id,
  Locale,
  LocalizedText,
  MinorAmount,
  Money,
  Revision,
  TaskStatus,
  Timestamp,
} from './common'
import {
  Invoice,
  InvoiceKind,
  InvoiceStatus,
  InvoiceSummary,
  OrderStatus,
  OsImage,
  PricePoint,
  Product,
  ProductKind,
  ProductOption,
  ProductSpecs,
  Service,
  ServiceStatus,
  ServiceSummary,
} from './commerce'
import { Permission } from './identity'
import { TicketPriority, TicketStatus, TicketSummary } from './support'

/* ---------------------------------------------------------------- overview */

export const AdminOverview = z
  .object({
    currency: CurrencyCode,
    revenue_today: Money,
    revenue_month: Money,
    revenue_prev_month: Money,
    outstanding: Money,
    counts: z.object({
      clients: z.int(),
      new_clients_month: z.int(),
      active_services: z.int(),
      pending_orders: z.int(),
      open_tickets: z.int(),
      overdue_invoices: z.int(),
    }),
    revenue_series: z.array(z.object({ date: z.iso.date(), amount: Money })),
    attention: z.array(
      z.object({
        kind: z.enum([
          'provisioning_failed',
          'task_uncertain',
          'duplicate_payment',
          'ticket_waiting',
          'cancellation_request',
        ]),
        title: z.string(),
        ref_id: Id,
        at: Timestamp,
      }),
    ),
  })
  .meta({ id: 'AdminOverview' })
export type AdminOverview = z.infer<typeof AdminOverview>

/* ----------------------------------------------------------------- clients */

export const ClientStatus = z.enum(['active', 'disabled', 'closed']).meta({ id: 'ClientStatus' })

export const AdminClientSummary = z
  .object({
    id: Id,
    email: Email,
    name: z.string(),
    company: z.string(),
    country: Country,
    currency: CurrencyCode,
    status: ClientStatus,
    services: z.int(),
    credit: Money,
    created_at: Timestamp,
    last_login_at: Timestamp.nullable(),
  })
  .meta({ id: 'AdminClientSummary' })
export type AdminClientSummary = z.infer<typeof AdminClientSummary>

export const AdminClient = AdminClientSummary.extend({
  phone: z.string(),
  address: z.string(),
  locale: Locale,
  email_verified: z.boolean(),
  notes: z.string().max(8000),
  lifetime_paid: Money,
  outstanding: Money,
  referrer_id: Id.nullable(),
  revision: Revision,
}).meta({ id: 'AdminClient' })
export type AdminClient = z.infer<typeof AdminClient>

export const AdminClientCreate = z.object({
  email: Email,
  name: z.string().min(1).max(120),
  company: z.string().max(160).optional(),
  country: Country,
  currency: CurrencyCode,
  locale: Locale,
  /** When omitted the client receives a password-setup email. */
  password: z.string().min(10).max(256).optional(),
})
export const AdminClientPatch = z.object({
  revision: Revision,
  name: z.string().min(1).max(120).optional(),
  company: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  country: Country.optional(),
  status: ClientStatus.optional(),
  notes: z.string().max(8000).optional(),
})
export const CreditAdjustment = z.object({
  /** Signed. Negative values may not take the balance below zero. */
  amount_minor: MinorAmount.refine((v) => v !== 0),
  reason: z.string().min(3).max(500),
})

/* ------------------------------------------------------------------ orders */

export const AdminOrderSummary = z
  .object({
    id: Id,
    number: z.string(),
    client_id: Id,
    client_email: Email,
    status: OrderStatus,
    total: Money,
    items: z.int(),
    created_at: Timestamp,
  })
  .meta({ id: 'AdminOrderSummary' })
export type AdminOrderSummary = z.infer<typeof AdminOrderSummary>

/* ---------------------------------------------------------------- invoices */

export const AdminInvoiceSummary = InvoiceSummary.extend({ client_id: Id, client_email: Email }).meta({
  id: 'AdminInvoiceSummary',
})
export type AdminInvoiceSummary = z.infer<typeof AdminInvoiceSummary>
export const AdminInvoice = Invoice.extend({
  client_id: Id,
  client_email: Email,
  flags: z.array(z.enum(['duplicate_payment', 'overdue', 'manual'])),
}).meta({ id: 'AdminInvoice' })
export type AdminInvoice = z.infer<typeof AdminInvoice>

export const ManualPayment = z.object({
  amount_minor: MinorAmount.min(1),
  method: z.enum(['bank_transfer', 'cash', 'other']),
  reference: z.string().min(1).max(120),
  received_at: Timestamp,
})
export const RefundRequest = z.object({
  payment_id: Id,
  amount_minor: MinorAmount.min(1),
  destination: z.enum(['credit', 'original']),
  reason: z.string().min(3).max(500),
})
export const ManualInvoiceCreate = z.object({
  client_id: Id,
  due_at: Timestamp,
  lines: z
    .array(z.object({ description: z.string().min(1).max(300), amount_minor: MinorAmount }))
    .min(1)
    .max(50),
})
export const InvoiceQuery = z.object({
  status: InvoiceStatus.optional(),
  kind: InvoiceKind.optional(),
  q: z.string().max(120).optional(),
  client_id: Id.optional(),
})

/* ---------------------------------------------------------------- services */

export const AdminServiceSummary = ServiceSummary.extend({ client_id: Id, client_email: Email }).meta({
  id: 'AdminServiceSummary',
})
export type AdminServiceSummary = z.infer<typeof AdminServiceSummary>
export const AdminService = Service.extend({
  client_id: Id,
  client_email: Email,
  module_id: ModuleId.nullable(),
  connection_id: Id.nullable(),
  resource_id: z.string().nullable(),
  provisioning_job_id: Id.nullable(),
  price_override: Money.nullable(),
  revision: Revision,
}).meta({ id: 'AdminService' })
export type AdminService = z.infer<typeof AdminService>
export const AdminServicePatch = z.object({
  revision: Revision,
  label: z.string().max(80).optional(),
  next_due_at: Timestamp.optional(),
  auto_renew: z.boolean().optional(),
  /** null removes the override and returns to catalog renewal pricing. */
  price_override_minor: MinorAmount.min(0).nullable().optional(),
})
export const AdminServiceAction = z.object({
  action: z.enum([
    'provision',
    'suspend',
    'unsuspend',
    'terminate',
    'start',
    'stop',
    'reboot',
    'force_off',
    'sync',
  ]),
  reason: z.string().max(500).optional(),
  /** Required for terminate: must equal the service id. */
  confirm: z.string().max(64).optional(),
})
export const ServiceQuery = z.object({
  status: ServiceStatus.optional(),
  q: z.string().max(120).optional(),
  client_id: Id.optional(),
})

/* ---------------------------------------------------------------- products */

export const AdminProduct = Product.extend({
  visibility: z.enum(['public', 'hidden', 'retired']),
  module: AdminProductModule.nullable(),
  active_services: z.int(),
  revision: Revision,
}).meta({ id: 'AdminProduct' })
export type AdminProduct = z.infer<typeof AdminProduct>

export const ProductUpsert = z.object({
  revision: Revision.optional(),
  slug: Product.shape.slug,
  kind: ProductKind,
  node_id: Id,
  name: LocalizedText,
  description: LocalizedText,
  badges: Product.shape.badges,
  specs: ProductSpecs,
  prices: z.array(PricePoint),
  options: z.array(ProductOption),
  os_image_ids: z.array(Id),
  stock: z.int().min(0).nullable(),
  visibility: AdminProduct.shape.visibility,
  module: ProductModule.nullable(),
  sort_order: z.int(),
})
export type ProductUpsert = z.infer<typeof ProductUpsert>

export const AdminOsImage = OsImage.extend({
  enabled: z.boolean(),
  connection_id: Id,
  remote_image_id: z.string(),
  sha256: z.string(),
}).meta({ id: 'AdminOsImage' })

/* -------------------------------------------------------------- promotions */

export const Coupon = z
  .object({
    id: Id,
    code: z.string().regex(/^[A-Z0-9-]{3,32}$/),
    kind: z.enum(['percent', 'fixed']),
    /** Basis points for percent (1000 = 10%); per-currency minor amounts for fixed. */
    percent_bp: z.int().min(1).max(10000).nullable(),
    fixed: z.array(z.object({ currency: CurrencyCode, amount_minor: MinorAmount.min(1) })),
    applies_to: z.object({ product_ids: z.array(Id), cycles: z.array(BillingCycle) }),
    recurring: z.boolean(),
    new_clients_only: z.boolean(),
    max_uses: z.int().min(1).nullable(),
    max_uses_per_client: z.int().min(1).nullable(),
    used: z.int().min(0),
    starts_at: Timestamp.nullable(),
    ends_at: Timestamp.nullable(),
    active: z.boolean(),
    revision: Revision,
  })
  .meta({ id: 'Coupon' })
export type Coupon = z.infer<typeof Coupon>
export const CouponUpsert = Coupon.omit({ id: true, used: true, revision: true }).extend({
  revision: Revision.optional(),
})

/* ----------------------------------------------------------------- tickets */

export const AdminTicketSummary = TicketSummary.extend({
  client_id: Id,
  client_email: Email,
  assignee_id: Id.nullable(),
  assignee_name: z.string().nullable(),
}).meta({ id: 'AdminTicketSummary' })
export type AdminTicketSummary = z.infer<typeof AdminTicketSummary>
export const AdminTicketPatch = z.object({
  status: TicketStatus.optional(),
  priority: TicketPriority.optional(),
  department_id: Id.optional(),
  assignee_id: Id.nullable().optional(),
})
export const AdminTicketReply = z.object({ body: z.string().min(1).max(20000), internal: z.boolean() })

/* ------------------------------------------------------------- automation */

export const AutomationSettings = z
  .object({
    invoice_days_before_due: z.int().min(0).max(60),
    reminder_days_before_due: z.array(z.int().min(0).max(60)).max(5),
    overdue_reminder_days: z.array(z.int().min(1).max(60)).max(5),
    suspend_after_days: z.int().min(0).max(60),
    terminate_after_days: z.int().min(1).max(180),
    cancel_unpaid_orders_after_days: z.int().min(1).max(60),
    auto_provision: z.boolean(),
    auto_apply_credit: z.boolean(),
    affiliate_hold_days: z.int().min(0).max(180),
    ticket_autoclose_hours: z.int().min(0).max(720),
    revision: Revision,
  })
  .meta({ id: 'AutomationSettings' })
export type AutomationSettings = z.infer<typeof AutomationSettings>

export const AutomationRun = z
  .object({
    id: Id,
    job: z.enum([
      'generate_renewals',
      'send_reminders',
      'suspend_overdue',
      'terminate_overdue',
      'cancel_unpaid_orders',
      'apply_credit',
      'dispatch_provisioning',
      'release_affiliate',
      'purge_sessions',
      'close_tickets',
    ]),
    status: TaskStatus,
    started_at: Timestamp,
    finished_at: Timestamp.nullable(),
    processed: z.int(),
    failed: z.int(),
    message: z.string().nullable(),
  })
  .meta({ id: 'AutomationRun' })
export type AutomationRun = z.infer<typeof AutomationRun>

/* ------------------------------------------------------------ integrations */

/** One installed payment plugin slot. Credentials stay host-managed; the web UI never sees them. */
export const GatewayStatus = z
  .object({
    id: z.string(),
    name: LocalizedText,
    plugin_id: z.string(),
    plugin_version: z.string(),
    flow: z.enum(['redirect', 'qr', 'instructions']),
    enabled: z.boolean(),
    status: z.enum(['ready', 'stopped', 'misconfigured', 'incompatible']),
    currencies: z.array(CurrencyCode),
    display_order: z.int(),
    last_checked_at: Timestamp.nullable(),
    revision: Revision,
  })
  .meta({ id: 'GatewayStatus' })

export const EmailTemplate = z
  .object({
    key: z.enum([
      'welcome',
      'email_verification',
      'password_reset',
      'invoice_created',
      'invoice_reminder',
      'invoice_overdue',
      'payment_received',
      'service_active',
      'service_suspended',
      'service_terminated',
      'ticket_reply',
      'ticket_opened',
    ]),
    subject: LocalizedText,
    body: LocalizedText,
    enabled: z.boolean(),
    variables: z.array(z.string()),
    revision: Revision,
  })
  .meta({ id: 'EmailTemplate' })
export type EmailTemplate = z.infer<typeof EmailTemplate>

export const SmtpSettings = z
  .object({
    host: z.string().max(253),
    port: z.int().min(1).max(65535),
    security: z.enum(['tls', 'starttls']),
    username: z.string().max(254),
    password_configured: z.boolean(),
    from_email: z.string().max(254),
    from_name: z.string().max(120),
    enabled: z.boolean(),
    revision: Revision,
  })
  .meta({ id: 'SmtpSettings' })

/* ------------------------------------------------------------------- staff */

export const StaffRole = z
  .object({
    id: Id,
    name: z.string().max(60),
    description: z.string().max(240),
    permissions: z.array(Permission),
    builtin: z.boolean(),
    members: z.int(),
    revision: Revision,
  })
  .meta({ id: 'StaffRole' })
export type StaffRole = z.infer<typeof StaffRole>

export const StaffMember = z
  .object({
    id: Id,
    email: Email,
    name: z.string(),
    role_id: Id,
    status: z.enum(['active', 'disabled']),
    last_login_at: Timestamp.nullable(),
    revision: Revision,
  })
  .meta({ id: 'StaffMember' })
export type StaffMember = z.infer<typeof StaffMember>

export const AuditEvent = z
  .object({
    id: Id,
    at: Timestamp,
    actor_type: z.enum(['client', 'staff', 'system']),
    actor_email: z.string().nullable(),
    action: z.string(),
    target_type: z.string().nullable(),
    target_id: z.string().nullable(),
    ip: z.string().nullable(),
    reason: z.string().nullable(),
  })
  .meta({ id: 'AuditEvent' })
export type AuditEvent = z.infer<typeof AuditEvent>

export const SecuritySettings = z
  .object({
    client_session_hours: z.int().min(1).max(720),
    staff_session_hours: z.int().min(1).max(24),
    password_min_length: z.int().min(10).max(128),
    revision: Revision,
  })
  .meta({ id: 'SecuritySettings' })

export const UpdateStatus = z
  .object({
    current_version: z.string(),
    latest_version: z.string().nullable(),
    channel: z.enum(['stable', 'prerelease']),
    checked_at: Timestamp.nullable(),
    update_available: z.boolean(),
    release_notes_url: z.string().nullable(),
  })
  .meta({ id: 'UpdateStatus' })

export { Money }
