import { z } from 'zod'
import { Country, CurrencyCode, Email, Id, Locale, Revision, Timestamp } from './common'

export * from './auth'

export const Profile = z
  .object({
    id: Id,
    email: Email,
    name: z.string().max(120),
    company: z.string().max(160),
    phone: z.string().max(40),
    country: Country,
    address_line1: z.string().max(200),
    address_line2: z.string().max(200),
    city: z.string().max(120),
    state: z.string().max(120),
    postal_code: z.string().max(32),
    locale: Locale,
    currency: CurrencyCode,
    currency_locked: z.boolean(),
    email_verified: z.boolean(),
    marketing_emails: z.boolean(),
    created_at: Timestamp,
    revision: Revision,
  })
  .meta({ id: 'Profile' })
export type Profile = z.infer<typeof Profile>

export const ProfileUpdate = Profile.pick({
  name: true,
  company: true,
  phone: true,
  country: true,
  address_line1: true,
  address_line2: true,
  city: true,
  state: true,
  postal_code: true,
  locale: true,
  marketing_emails: true,
  revision: true,
})
  .partial()
  .extend({ revision: Revision, currency: CurrencyCode.optional() })

export const PasswordChange = z.object({
  current_password: z.string().min(1).max(256),
  new_password: z.string().min(10).max(256),
})

export const AccountSession = z
  .object({
    id: Id,
    current: z.boolean(),
    ip: z.string(),
    user_agent: z.string(),
    created_at: Timestamp,
    last_seen_at: Timestamp,
  })
  .meta({ id: 'AccountSession' })
export type AccountSession = z.infer<typeof AccountSession>

export const LoginEvent = z
  .object({
    id: Id,
    at: Timestamp,
    ip: z.string(),
    user_agent: z.string(),
    result: z.enum(['success', 'failed']),
  })
  .meta({ id: 'LoginEvent' })

export const SshKey = z
  .object({
    id: Id,
    name: z.string().max(80),
    fingerprint: z.string(),
    algorithm: z.enum(['ssh-ed25519', 'ecdsa-sha2-nistp256', 'ssh-rsa']),
    created_at: Timestamp,
  })
  .meta({ id: 'SshKey' })
export type SshKey = z.infer<typeof SshKey>
export const SshKeyCreate = z.object({
  name: z.string().min(1).max(80),
  public_key: z.string().min(40).max(16384),
})

export const NotificationPreferences = z
  .object({
    invoice_created: z.boolean(),
    invoice_reminder: z.boolean(),
    service_events: z.boolean(),
    ticket_replies: z.boolean(),
    announcements: z.boolean(),
  })
  .meta({ id: 'NotificationPreferences' })

export const ApiToken = z
  .object({
    id: Id,
    name: z.string().max(60),
    /** First characters of the token, for recognition only. */
    prefix: z.string().max(16),
    scopes: z.array(z.enum(['read', 'write'])).min(1),
    ip_allowlist: z.array(z.string().max(64)).max(20),
    last_used_at: Timestamp.nullable(),
    expires_at: Timestamp.nullable(),
    created_at: Timestamp,
  })
  .meta({ id: 'ApiToken' })
export type ApiToken = z.infer<typeof ApiToken>
export const ApiTokenCreate = z.object({
  name: z.string().min(1).max(60),
  scopes: z.array(z.enum(['read', 'write'])).min(1),
  ip_allowlist: z.array(z.string().max(64)).max(20),
  expires_in_days: z.int().min(1).max(365).nullable(),
})
/** The secret is returned exactly once, at creation. */
export const ApiTokenCreated = z
  .object({ token: ApiToken, secret: z.string().min(32) })
  .meta({ id: 'ApiTokenCreated' })
