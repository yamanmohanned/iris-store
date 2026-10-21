/**
 * Which app route reproduces which Stitch screen — used by app-vs-design.mjs.
 *
 * mobile: true  → 390px viewport
 * admin:  true  → pre-seeds an admin session
 * cart:   'empty' | 'filled' (default: filled seed) → pre-seeds the cart
 * user:   true  → pre-seeds a signed-in customer
 * composite: true → several screens form one route; pixel diff is not meaningful
 * redesigned: true → the route was rebuilt on purpose (owner-managed catalog, menu-style mobile layout,
 *                    real tracking/orders); the Stitch screen is kept only as a visual reference
 * admin routes need a real owner session (POST /api/index.php?r=auth/login), not localStorage
 */
export const entries = [
  // storefront · desktop
  { id: '5f1b5f', route: '/', composite: true },
  { id: 'c44246', route: '/collections/necklaces' },
  { id: '7259a8', route: '/products/swan-necklace' },
  { id: '5e85a1', route: '/cart', cart: 'filled' },
  { id: 'b6360e', route: '/cart', cart: 'empty' },
  { id: '6adf31', route: '/order-success/1054' },
  { id: '6bc8f4', route: '/track-order', redesigned: true },
  { id: '343a4f', route: '/account', user: true },
  { id: '0837ea', route: '/login' },
  { id: '2e208f', route: '/about' },
  { id: '0813f4', route: '/contact' },
  { id: '21ced7', route: '/faq' },
  { id: 'c9b417', route: '/404' },
  { id: '28f996', route: '/maintenance' },
  { id: 'e27c41', route: '/returns/new' },

  // storefront · mobile
  { id: '02d9de', route: '/welcome', mobile: true },
  { id: '508175', route: '/', mobile: true, redesigned: true },
  { id: '47b5a7', route: '/categories', mobile: true, redesigned: true },
  { id: 'f4d07a', route: '/collections/necklaces', mobile: true, redesigned: true },
  { id: 'cf7867', route: '/products/swan-necklace', mobile: true },
  { id: '55072e', route: '/search?q=102', mobile: true, redesigned: true },
  { id: '913ca2', route: '/cart', mobile: true, cart: 'filled' },
  { id: '0713e3', route: '/cart', mobile: true, cart: 'empty' },
  { id: '7966c5', route: '/checkout', mobile: true },
  { id: 'b050d8', route: '/checkout/delivery', mobile: true },
  { id: '8e0fe8', route: '/checkout/review', mobile: true },
  { id: '11405c', route: '/order-success/1054', mobile: true },
  { id: '5a05ad', route: '/track-order', mobile: true, redesigned: true },
  { id: '7036a8', route: '/account/orders', mobile: true, user: true, redesigned: true },
  { id: '5be606', route: '/login', mobile: true },
  { id: '8eb6ca', route: '/account', mobile: true, user: true },
  { id: 'a53831', route: '/verify', mobile: true },
  { id: '797aa4', route: '/notifications', mobile: true },
  { id: '1231af', route: '/chat', mobile: true },
  { id: 'd4e71c', route: '/contact', mobile: true },
  { id: 'f764ec', route: '/returns/new', mobile: true },
  { id: '536c3e', route: '/system-updates', mobile: true },
  { id: 'e58238', route: '/offline', mobile: true },

  // admin
  { id: '46f076', route: '/admin/login', redesigned: true },
  { id: '643bbc', route: '/admin/dashboard', admin: true },
  { id: '2626db', route: '/admin/employee', admin: true },
  { id: 'a1d4ac', route: '/admin/orders', admin: true, redesigned: true },
  { id: 'b0d88e', route: '/admin/returns/R-0031', admin: true },
  { id: 'ac18e2', route: '/admin/products', admin: true, redesigned: true },
  { id: '0ebf15', route: '/admin/products/new', admin: true, redesigned: true },
  { id: '1e3d58', route: '/admin/categories', admin: true, redesigned: true },
  { id: '5371b3', route: '/admin/inventory', admin: true },
  { id: '78b6a7', route: '/admin/inventory/movements', admin: true },
  { id: 'ca767d', route: '/admin/inventory/adjust', admin: true },
  { id: 'd604b8', route: '/admin/stock-count', admin: true },
  { id: '83ac46', route: '/admin/purchases', admin: true },
  { id: 'd0a516', route: '/admin/purchases/new', admin: true },
  { id: '5b5323', route: '/admin/suppliers', admin: true },
  { id: '8bd4b9', route: '/admin/suppliers/s-1', admin: true },
  { id: 'ff4dcc', route: '/admin/customers', admin: true },
  { id: '572420', route: '/admin/customers/c-1', admin: true },
  { id: 'f4c00b', route: '/admin/inbox', admin: true },
  { id: '52df11', route: '/admin/payments', admin: true },
  { id: '12c68c', route: '/admin/expenses', admin: true },
  { id: 'f9ce0e', route: '/admin/accounting', admin: true },
  { id: '32fb6d', route: '/admin/accounting/settings', admin: true },
  { id: '764a28', route: '/admin/coupons', admin: true },
  { id: 'f4b8e3', route: '/admin/storefront', admin: true },
  { id: '8c1b02', route: '/admin/reports', admin: true },
  { id: '2ae5d9', route: '/admin/reports/sales-by-channel', admin: true },
  { id: '8c9b50', route: '/admin/staff', admin: true },
  { id: '844813', route: '/admin/staff/permissions', admin: true },
  { id: '443019', route: '/admin/audit-log', admin: true },
  { id: '67d13f', route: '/admin/system-health', admin: true },
  { id: '5dcaa1', route: '/admin/archive', admin: true },
  { id: 'a31466', route: '/admin/notifications', admin: true },
  { id: '31e185', route: '/admin/settings/social', admin: true },
  { id: 'e99901', route: '/admin/settings/currency', admin: true },
];
