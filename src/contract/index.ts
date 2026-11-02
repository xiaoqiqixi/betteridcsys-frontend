import { z } from 'zod'
import * as C from './catalog'
import { Empty, page, PageQuery } from './common'
import { endpoint } from './endpoint'
import * as I from './auth'
import * as S from './site'

const idQuery = PageQuery
import { ok } from './responses'

/* ----------------------------------------------------------------- public */

const site = {
  session: endpoint({
    id: 'getSession',
    method: 'GET',
    path: '/session',
    access: 'public',
    tag: 'Auth',
    summary: 'Current session and CSRF token',
    response: I.Session,
  }),
  settings: endpoint({
    id: 'getSiteSettings',
    method: 'GET',
    path: '/site-settings',
    access: 'public',
    tag: 'Site',
    summary: 'Public site settings',
    response: S.SiteSettings,
  }),
  currencies: endpoint({
    id: 'listCurrencies',
    method: 'GET',
    path: '/currencies',
    access: 'public',
    tag: 'Site',
    summary: 'Enabled currencies',
    response: S.CurrencyRegistry,
  }),
  taxonomy: endpoint({
    id: 'getCatalogTaxonomy',
    method: 'GET',
    path: '/catalog-taxonomy',
    access: 'public',
    tag: 'Catalog',
    summary: 'Product families, regions and nodes',
    response: S.CatalogTaxonomy,
  }),
  products: endpoint({
    id: 'listProducts',
    method: 'GET',
    path: '/products',
    access: 'public',
    tag: 'Catalog',
    summary: 'Purchasable products',
    query: C.ProductQuery,
    response: z.array(C.Product),
  }),
  product: endpoint({
    id: 'getProduct',
    method: 'GET',
    path: '/products/{id}',
    access: 'public',
    tag: 'Catalog',
    summary: 'One product with options and images',
    response: C.Product,
  }),
  announcements: endpoint({
    id: 'listAnnouncements',
    method: 'GET',
    path: '/announcements',
    access: 'public',
    tag: 'Content',
    summary: 'Published announcements',
    query: idQuery,
    response: page(S.Announcement),
  }),
}

const auth = {
  login: endpoint({
    id: 'login',
    method: 'POST',
    path: '/auth/login',
    access: 'public',
    tag: 'Auth',
    summary: 'Password login',
    body: I.LoginRequest,
    response: I.Session,
  }),
  logout: endpoint({
    id: 'logout',
    method: 'POST',
    path: '/auth/logout',
    access: 'public',
    tag: 'Auth',
    summary: 'End the session',
    body: Empty,
    response: I.Session,
  }),
  register: endpoint({
    id: 'register',
    method: 'POST',
    path: '/auth/register',
    access: 'public',
    tag: 'Auth',
    summary: 'Create a client account',
    body: I.RegisterRequest,
    response: I.Session,
    idempotent: true,
  }),
  verifyEmail: endpoint({
    id: 'verifyEmail',
    method: 'POST',
    path: '/auth/email/verify',
    access: 'public',
    tag: 'Auth',
    summary: 'Confirm email ownership',
    body: I.EmailVerifyRequest,
    response: ok,
  }),
  resendVerification: endpoint({
    id: 'resendVerification',
    method: 'POST',
    path: '/auth/email/resend',
    access: 'client',
    tag: 'Auth',
    summary: 'Send a new verification email',
    body: Empty,
    response: ok,
  }),
  forgotPassword: endpoint({
    id: 'forgotPassword',
    method: 'POST',
    path: '/auth/password/forgot',
    access: 'public',
    tag: 'Auth',
    summary: 'Always succeeds; emails a reset link when the account exists',
    body: I.PasswordForgotRequest,
    response: ok,
  }),
  resetPassword: endpoint({
    id: 'resetPassword',
    method: 'POST',
    path: '/auth/password/reset',
    access: 'public',
    tag: 'Auth',
    summary: 'Set a new password with a reset token',
    body: I.PasswordResetRequest,
    response: ok,
  }),
}

export const api = { site, auth }

export * from './common'
export type { AnyEndpoint, CallInput, Result } from './endpoint'
