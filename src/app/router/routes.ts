import type { RouteRecordRaw } from 'vue-router'
import type { Permission } from '@/contract/identity'

declare module 'vue-router' {
  interface RouteMeta {
    /** public: anyone · guest: signed-out only · client: customers · staff: admin console */
    access?: 'public' | 'guest' | 'client' | 'staff'
    permission?: Permission
    /** i18n key for the document title. */
    title?: string
  }
}

const StoreLayout = () => import('../layouts/StoreLayout.vue')
const AuthLayout = () => import('../layouts/AuthLayout.vue')
const PortalLayout = () => import('../layouts/PortalLayout.vue')
const AdminLayout = () => import('../layouts/AdminLayout.vue')

const pages = import.meta.glob('../../modules/*/pages/**/*.vue')
function page(module: string) {
  return (name: string) => {
    const load = pages[`../../modules/${module}/pages/${name}.vue`]
    if (!load) throw new Error(`missing page ${module}/${name}`)
    return load
  }
}
const store = page('store')
const auth = page('auth')
const portal = page('portal')
const admin = page('admin')

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: StoreLayout,
    meta: { access: 'public' },
    children: [
      { path: '', name: 'home', component: store('HomePage'), meta: { title: 'titles.home' } },
      { path: 'store', name: 'store', component: store('StorePage'), meta: { title: 'titles.store' } },
      {
        path: 'store/:id',
        name: 'configure',
        component: store('ConfigurePage'),
        meta: { title: 'titles.configure' },
      },
      {
        path: 'checkout',
        name: 'checkout',
        component: store('CheckoutPage'),
        meta: { title: 'titles.checkout' },
      },
      {
        path: 'announcements',
        name: 'announcements',
        component: store('AnnouncementsPage'),
        meta: { title: 'titles.announcements' },
      },
    ],
  },
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'login',
        component: auth('LoginPage'),
        meta: { access: 'guest', title: 'titles.login' },
      },
      {
        path: 'register',
        name: 'register',
        component: auth('RegisterPage'),
        meta: { access: 'guest', title: 'titles.register' },
      },
      {
        path: 'forgot-password',
        name: 'forgot',
        component: auth('ForgotPasswordPage'),
        meta: { access: 'guest', title: 'titles.forgot' },
      },
      {
        path: 'reset-password',
        name: 'reset',
        component: auth('ResetPasswordPage'),
        meta: { access: 'public', title: 'titles.reset' },
      },
      {
        path: 'verify-email',
        name: 'verify',
        component: auth('VerifyEmailPage'),
        meta: { access: 'public', title: 'titles.verify' },
      },
    ],
  },
  {
    path: '/',
    component: PortalLayout,
    meta: { access: 'client' },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: portal('DashboardPage'),
        meta: { title: 'nav.dashboard' },
      },
      {
        path: 'services',
        name: 'services',
        component: portal('ServicesPage'),
        meta: { title: 'nav.services' },
      },
      {
        path: 'services/:id',
        name: 'service',
        component: portal('ServiceDetailPage'),
        meta: { title: 'nav.services' },
      },
      { path: 'orders', name: 'orders', component: portal('OrdersPage'), meta: { title: 'nav.orders' } },
      {
        path: 'orders/:id',
        name: 'order',
        component: portal('OrderDetailPage'),
        meta: { title: 'nav.orders' },
      },
      {
        path: 'invoices',
        name: 'invoices',
        component: portal('InvoicesPage'),
        meta: { title: 'nav.invoices' },
      },
      {
        path: 'invoices/:id',
        name: 'invoice',
        component: portal('InvoiceDetailPage'),
        meta: { title: 'nav.invoices' },
      },
      { path: 'billing', name: 'billing', component: portal('BillingPage'), meta: { title: 'nav.credit' } },
      { path: 'tickets', name: 'tickets', component: portal('TicketsPage'), meta: { title: 'nav.tickets' } },
      {
        path: 'tickets/new',
        name: 'ticket-new',
        component: portal('TicketNewPage'),
        meta: { title: 'nav.tickets' },
      },
      {
        path: 'tickets/:id',
        name: 'ticket',
        component: portal('TicketDetailPage'),
        meta: { title: 'nav.tickets' },
      },
      {
        path: 'affiliate',
        name: 'affiliate',
        component: portal('AffiliatePage'),
        meta: { title: 'nav.affiliate' },
      },
      {
        path: 'account',
        component: portal('AccountPage'),
        meta: { title: 'nav.account' },
        children: [
          { path: '', name: 'account', component: portal('account/ProfileTab') },
          { path: 'security', name: 'account-security', component: portal('account/SecurityTab') },
          { path: 'ssh-keys', name: 'account-ssh', component: portal('account/SshKeysTab') },
          { path: 'api-tokens', name: 'account-tokens', component: portal('account/ApiTokensTab') },
          {
            path: 'notifications',
            name: 'account-notifications',
            component: portal('account/NotificationsTab'),
          },
          { path: 'activity', name: 'account-activity', component: portal('account/ActivityTab') },
        ],
      },
    ],
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { access: 'staff' },
    children: [
      {
        path: '',
        name: 'admin',
        component: admin('OverviewPage'),
        meta: { permission: 'overview.read', title: 'admin.nav.overview' },
      },
      {
        path: 'clients',
        name: 'admin-clients',
        component: admin('ClientsPage'),
        meta: { permission: 'clients.read', title: 'admin.nav.clients' },
      },
      {
        path: 'clients/:id',
        name: 'admin-client',
        component: admin('ClientDetailPage'),
        meta: { permission: 'clients.read', title: 'admin.nav.clients' },
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: admin('OrdersPage'),
        meta: { permission: 'orders.read', title: 'admin.nav.orders' },
      },
      {
        path: 'orders/:id',
        name: 'admin-order',
        component: admin('OrderDetailPage'),
        meta: { permission: 'orders.read', title: 'admin.nav.orders' },
      },
      {
        path: 'services',
        name: 'admin-services',
        component: admin('ServicesPage'),
        meta: { permission: 'services.read', title: 'admin.nav.services' },
      },
      {
        path: 'services/:id',
        name: 'admin-service',
        component: admin('ServiceDetailPage'),
        meta: { permission: 'services.read', title: 'admin.nav.services' },
      },
      {
        path: 'invoices',
        name: 'admin-invoices',
        component: admin('InvoicesPage'),
        meta: { permission: 'invoices.read', title: 'admin.nav.invoices' },
      },
      {
        path: 'invoices/:id',
        name: 'admin-invoice',
        component: admin('InvoiceDetailPage'),
        meta: { permission: 'invoices.read', title: 'admin.nav.invoices' },
      },
      {
        path: 'coupons',
        name: 'admin-coupons',
        component: admin('CouponsPage'),
        meta: { permission: 'products.read', title: 'admin.nav.coupons' },
      },
      {
        path: 'products',
        name: 'admin-products',
        component: admin('ProductsPage'),
        meta: { permission: 'products.read', title: 'admin.nav.products' },
      },
      {
        path: 'products/new',
        name: 'admin-product-new',
        component: admin('ProductEditorPage'),
        meta: { permission: 'products.write', title: 'admin.nav.products' },
      },
      {
        path: 'products/:id',
        name: 'admin-product',
        component: admin('ProductEditorPage'),
        meta: { permission: 'products.read', title: 'admin.nav.products' },
      },
      {
        path: 'catalog',
        name: 'admin-catalog',
        component: admin('CatalogPage'),
        meta: { permission: 'products.read', title: 'admin.nav.catalog' },
      },
      {
        path: 'tickets',
        name: 'admin-tickets',
        component: admin('TicketsPage'),
        meta: { permission: 'tickets.read', title: 'admin.nav.tickets' },
      },
      {
        path: 'tickets/:id',
        name: 'admin-ticket',
        component: admin('TicketDetailPage'),
        meta: { permission: 'tickets.read', title: 'admin.nav.tickets' },
      },
      {
        path: 'announcements',
        name: 'admin-announcements',
        component: admin('AnnouncementsPage'),
        meta: { permission: 'content.write', title: 'admin.nav.announcements' },
      },
      {
        path: 'automation',
        name: 'admin-automation',
        component: admin('AutomationPage'),
        meta: { permission: 'automation.write', title: 'admin.nav.automation' },
      },
      {
        path: 'integrations',
        name: 'admin-integrations',
        component: admin('IntegrationsPage'),
        meta: { permission: 'integrations.write', title: 'admin.nav.integrations' },
      },
      {
        path: 'staff',
        name: 'admin-staff',
        component: admin('StaffPage'),
        meta: { permission: 'staff.write', title: 'admin.nav.staff' },
      },
      {
        path: 'audit',
        name: 'admin-audit',
        component: admin('AuditPage'),
        meta: { permission: 'audit.read', title: 'admin.nav.audit' },
      },
      {
        path: 'affiliate',
        name: 'admin-affiliate',
        component: () => import('@/modules/admin/pages/AffiliatePage.vue'),
        meta: { permission: 'settings.write', title: 'admin.nav.affiliate' },
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: admin('SettingsPage'),
        meta: { permission: 'settings.write', title: 'admin.nav.settings' },
      },
      {
        path: 'forbidden',
        name: 'admin-forbidden',
        component: () => import('../pages/ForbiddenPage.vue'),
        meta: { title: 'titles.forbidden' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFoundPage.vue'),
    meta: { access: 'public', title: 'titles.notFound' },
  },
]
