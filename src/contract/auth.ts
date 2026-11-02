import { z } from 'zod'
import { Country, CurrencyCode, Email, Id, Locale } from './common'

export const Role = z.enum(['customer', 'admin']).meta({ id: 'Role' })

/**
 * Staff permissions. `admin` role users hold a staff role whose permission list is
 * checked on every admin request; hiding a button is never an authorization decision.
 */
export const Permission = z
  .enum([
    'overview.read',
    'clients.read',
    'clients.write',
    'clients.credit',
    'orders.read',
    'orders.write',
    'invoices.read',
    'invoices.write',
    'invoices.refund',
    'services.read',
    'services.write',
    'services.power',
    'services.terminate',
    'products.read',
    'products.write',
    'promotions.write',
    'tickets.read',
    'tickets.write',
    'content.write',
    'automation.write',
    'integrations.write',
    'staff.write',
    'settings.write',
    'audit.read',
    'updates.write',
  ])
  .meta({ id: 'Permission' })
export type Permission = z.infer<typeof Permission>

export const SessionUser = z
  .object({
    id: Id,
    email: Email,
    name: z.string().max(120),
    role: Role,
    locale: Locale,
    currency: CurrencyCode,
    email_verified: z.boolean(),
    /** Present for staff only. */
    permissions: z.array(Permission).optional(),
  })
  .meta({ id: 'SessionUser' })
export type SessionUser = z.infer<typeof SessionUser>

export const Session = z
  .object({
    user: SessionUser.nullable(),
    csrf_token: z.string(),
    demo_mode: z.boolean(),
  })
  .meta({ id: 'Session' })
export type Session = z.infer<typeof Session>

export const LoginRequest = z.object({
  email: Email,
  password: z.string().min(1).max(256),
  remember: z.boolean().optional(),
})

export const RegisterRequest = z.object({
  email: Email,
  password: z.string().min(10).max(256),
  name: z.string().min(1).max(120),
  country: Country,
  locale: Locale,
  /** Account currency. Fixed once the first invoice exists. */
  currency: CurrencyCode,
  accept_terms: z.literal(true),
  referral_code: z.string().max(64).optional(),
})

export const PasswordForgotRequest = z.object({ email: Email })
export const PasswordResetRequest = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(10).max(256),
})
export const EmailVerifyRequest = z.object({ token: z.string().min(16).max(256) })
