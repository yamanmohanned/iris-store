import { Link } from 'react-router';
import { AdminPage, Card, OfflineNotice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import { formatNumber } from '@/lib/format';
import { useAdminOrders } from '@/state/adminOrders';
import { useCatalogSync } from '@/state/catalog';
import { StatusPill } from './OrdersAdmin';

function Stat({ icon, label, value, to }: { icon: string; label: string; value: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-luxury transition-shadow hover:shadow-luxury-hover"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blush-surface text-imperial-burgundy">
        <Icon name={icon} className="text-[22px]" />
      </span>
      <span className="min-w-0">
        <span className="block font-label-sm text-label-sm text-muted-rosewood">{label}</span>
        <span className="block font-headline-sm text-headline-sm font-bold text-deep-oxblood tabular-nums">{value}</span>
      </span>
    </Link>
  );
}

/** الصفحة الأولى للوحة الإدارة: أرقام المتجر الحقيقية وآخر الطلبات واختصارات. */
export default function AdminOverview() {
  const catalog = useCatalog();
  const { online, source } = useCatalogSync();
  const { orders, pending, error } = useAdminOrders();

  const today = new Date().toDateString();
  const todayCount = orders.filter((o) => new Date(o.createdAt).toDateString() === today).length;
  const sales = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'returned').reduce((s, o) => s + o.total, 0);
  const outOfStock = catalog.products.filter((p) => p.stock <= 0).length;

  return (
    <AdminPage title="نظرة عامة" subtitle="ملخص المتجر الآن.">
      {(!online || error) && <OfflineNotice message={error ?? 'الخادم غير متاح؛ تأكد من رفع مجلد api مع الموقع.'} />}
      {online && source === 'seed' && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-semantic-info-bg p-4 text-semantic-info">
          <Icon name="info" className="mt-0.5 text-[20px]" />
          <p className="font-body-sm text-body-sm">
            المتجر يعرض حالياً الأقسام والمنتجات التجريبية الأولية. عدّلها أو احذفها من صفحتي{' '}
            <Link to="/admin/categories" className="font-semibold underline">
              الأقسام
            </Link>{' '}
            و
            <Link to="/admin/products" className="font-semibold underline">
              المنتجات
            </Link>
            ، وأول حفظ يجعلها كتالوجك الخاص.
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="notifications_active" label="طلبات جديدة" value={String(pending)} to="/admin/orders" />
        <Stat icon="today" label="طلبات اليوم" value={String(todayCount)} to="/admin/orders" />
        <Stat icon="payments" label="إجمالي المبيعات (د.ع)" value={formatNumber(sales)} to="/admin/orders" />
        <Stat icon="inventory_2" label="منتجات نفدت" value={String(outOfStock)} to="/admin/products" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">آخر الطلبات</h2>
            <Link to="/admin/orders" className="font-label-md text-label-md text-imperial-burgundy">
              كل الطلبات
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="py-6 text-center font-body-sm text-body-sm text-muted-rosewood">لا توجد طلبات بعد.</p>
          ) : (
            <ul className="divide-y divide-hairline-burgundy">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5">
                    <span className="font-mono text-label-md font-bold text-imperial-burgundy">#{o.id}</span>
                    <span className="min-w-0 flex-1 truncate font-label-md text-label-md text-warm-ink">{o.customer.name}</span>
                    <StatusPill status={o.status} />
                    <span className="w-20 text-left font-label-md text-label-md tabular-nums">{formatNumber(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-2 lg:col-span-4">
          <h2 className="mb-1 font-headline-sm text-headline-sm font-semibold text-deep-oxblood">اختصارات</h2>
          {[
            { to: '/admin/products/new', icon: 'add_circle', label: 'إضافة منتج' },
            { to: '/admin/categories', icon: 'category', label: `الأقسام (${catalog.categories.length})` },
            { to: '/admin/products', icon: 'diamond', label: `المنتجات (${catalog.products.length})` },
            { to: '/admin/settings', icon: 'tune', label: 'التوصيل والقسائم وكلمة المرور' },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-label-lg text-label-lg text-warm-ink hover:bg-blush-surface"
            >
              <Icon name={a.icon} className="text-[22px] text-antique-gold" />
              {a.label}
            </Link>
          ))}
        </Card>
      </div>
    </AdminPage>
  );
}
