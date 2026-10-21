import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AdminPage, Card, Notice, OfflineNotice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import { instagramApi, staffApi } from '@/lib/adminApi';
import { isBrowserOnly } from '@/lib/api';
import { cn } from '@/lib/cn';
import { importedKeys, isPostImported } from '@/lib/instagram/imported';
import { formatNumber } from '@/lib/format';
import { useAdminAuth } from '@/state/adminAuth';
import { useAdminOrders } from '@/state/adminOrders';
import { useCatalogSync } from '@/state/catalog';
import { readJSON, writeJSON } from '@/state/storage';
import { StatusPill } from './OrdersAdmin';

const DISMISS_KEY = 'iris.admin.onboarding.dismissed';

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

/** حالة ربط إنستغرام وعدد المنشورات الجديدة غير المستوردة (للمالك ومن يملك تعديل المنتجات). */
function useInstagramSummary(enabled: boolean) {
  const catalog = useCatalog();
  const [state, setState] = useState<{ connected: boolean; fresh: number | null } | null>(null);
  useEffect(() => {
    if (!enabled || isBrowserOnly()) return;
    let alive = true;
    instagramApi
      .status()
      .then(async (s) => {
        if (!alive) return;
        setState({ connected: s.connected, fresh: null });
        if (!s.connected) return;
        const { posts } = await instagramApi.media();
        const imported = importedKeys(catalog.products);
        if (alive) setState({ connected: true, fresh: posts.filter((p) => !isPostImported(imported, p)).length });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // يكفي فحص واحد عند فتح الصفحة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return state;
}

/** الصفحة الأولى للوحة الإدارة: خطوات البدء، أرقام المتجر الحقيقية، آخر الطلبات، واختصارات — بحسب صلاحيات الحساب. */
export default function AdminOverview() {
  const catalog = useCatalog();
  const { online, source } = useCatalogSync();
  const { admin, can, isOwner } = useAdminAuth();
  const canOrders = can('orders');
  const { orders, pending, error } = useAdminOrders(canOrders);
  const instagram = useInstagramSummary(can('products', 'edit'));
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(() => readJSON<boolean>(DISMISS_KEY, false));

  useEffect(() => {
    if (isOwner) staffApi.list().then((r) => setStaffCount(r.users.length), () => undefined);
  }, [isOwner]);

  const today = new Date().toDateString();
  const todayCount = orders.filter((o) => new Date(o.createdAt).toDateString() === today).length;
  const sales = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'returned').reduce((s, o) => s + o.total, 0);
  const outOfStock = catalog.products.filter((p) => p.stock <= 0).length;
  const drafts = catalog.products.filter((p) => p.hidden).length;

  const steps = [
    { done: Boolean(catalog.settings.branding), label: 'أضف شعارك واختر خطوط المتجر', to: '/admin/settings/branding', visible: can('settings', 'edit') },
    { done: Boolean(catalog.settings.whatsapp), label: 'اكتب رقم واتساب المتجر', to: '/admin/settings/store', visible: can('settings', 'edit') },
    { done: catalog.categories.length > 0, label: 'أنشئ أقسام المتجر', to: '/admin/categories', visible: can('categories', 'edit') },
    { done: catalog.products.length > 0, label: 'أضف أول منتج', to: '/admin/products/new', visible: can('products', 'edit') },
    { done: Boolean(instagram?.connected), label: 'اربط حساب إنستغرام للاستيراد', to: '/admin/settings/instagram', visible: isOwner && !isBrowserOnly() },
    { done: (staffCount ?? 0) > 0, label: 'أضف حسابات فريق العمل', to: '/admin/staff', visible: isOwner },
  ].filter((s) => s.visible);
  const remaining = steps.filter((s) => !s.done).length;
  const showSteps = !dismissed && steps.length > 0 && remaining > 0;

  const shortcuts = [
    { to: '/admin/products/new', icon: 'add_circle', label: 'إضافة منتج', visible: can('products', 'edit') },
    { to: '/admin/instagram', icon: 'photo_library', label: 'الاستيراد من إنستغرام', visible: can('products', 'edit') },
    { to: '/admin/categories', icon: 'category', label: `الأقسام (${catalog.categories.length})`, visible: can('categories') },
    { to: '/admin/products', icon: 'diamond', label: `المنتجات (${catalog.products.length})`, visible: can('products') },
    { to: '/admin/staff', icon: 'badge', label: 'فريق العمل', visible: isOwner },
    { to: '/admin/settings', icon: 'tune', label: 'الإعدادات', visible: true },
  ].filter((s) => s.visible);

  return (
    <AdminPage title={`أهلاً ${admin?.name ?? ''}`} subtitle="ملخص المتجر الآن.">
      {(!online || (canOrders && error)) && <OfflineNotice message={(canOrders && error) || 'الخادم غير متاح؛ تأكد من رفع مجلد api مع الموقع.'} />}
      {online && source === 'seed' && can('products', 'edit') && (
        <Notice className="mb-5">
          المتجر يعرض المحتوى الافتتاحي (أول منتجات إنستغرام). عدّلها أو احذفها من{' '}
          <Link to="/admin/products" className="font-semibold underline">
            المنتجات
          </Link>
          ، وأول حفظ يجعلها كتالوجك الخاص. ولبدء متجر فارغ تماماً استخدم «الإعدادات ← إعادة الضبط».
        </Notice>
      )}

      {showSteps && (
        <Card className="mb-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">جهّز متجرك</h2>
              <p className="font-body-sm text-body-sm text-muted-rosewood">
                {steps.length - remaining} من {steps.length} خطوات مكتملة
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                writeJSON(DISMISS_KEY, true);
                setDismissed(true);
              }}
              className="font-label-sm text-label-sm text-muted-rosewood underline underline-offset-4"
            >
              إخفاء
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-blush-surface">
            <div className="h-full rounded-full bg-royal-gold transition-all" style={{ width: `${((steps.length - remaining) / steps.length) * 100}%` }} />
          </div>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {steps.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 font-label-lg text-label-lg transition-colors',
                    s.done ? 'text-muted-rosewood line-through decoration-muted-rosewood/40' : 'bg-blush-surface/60 text-warm-ink hover:bg-blush-surface',
                  )}
                >
                  <Icon
                    name={s.done ? 'check_circle' : 'radio_button_unchecked'}
                    fill={s.done}
                    className={cn('text-[22px]', s.done ? 'text-semantic-success' : 'text-antique-gold')}
                  />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {instagram?.fresh ? (
        <Link
          to="/admin/instagram"
          className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-l from-imperial-burgundy to-deep-oxblood p-4 text-ivory-canvas shadow-luxury"
        >
          <Icon name="photo_library" className="text-[26px] text-champagne-gold" />
          <span className="flex-1 font-label-lg text-label-lg">
            {instagram.fresh} {instagram.fresh === 1 ? 'منشور جديد' : 'منشورات جديدة'} في إنستغرام لم تُستورد بعد
          </span>
          <Icon name="arrow_back" className="text-[22px] text-champagne-gold" />
        </Link>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canOrders && <Stat icon="notifications_active" label="طلبات جديدة" value={String(pending)} to="/admin/orders" />}
        {canOrders && <Stat icon="today" label="طلبات اليوم" value={String(todayCount)} to="/admin/orders" />}
        {canOrders && <Stat icon="payments" label="إجمالي المبيعات (د.ع)" value={formatNumber(sales)} to="/admin/orders" />}
        {can('products') && <Stat icon="inventory_2" label="منتجات نفدت" value={String(outOfStock)} to="/admin/products" />}
        {!canOrders && can('products') && <Stat icon="diamond" label="المنتجات" value={String(catalog.products.length)} to="/admin/products" />}
        {!canOrders && can('products') && <Stat icon="edit_note" label="مسودات مخفية" value={String(drafts)} to="/admin/products" />}
        {!canOrders && can('categories') && <Stat icon="category" label="الأقسام" value={String(catalog.categories.length)} to="/admin/categories" />}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {canOrders && (
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
        )}

        <Card className={cn('flex flex-col gap-2', canOrders ? 'lg:col-span-4' : 'lg:col-span-12')}>
          <h2 className="mb-1 font-headline-sm text-headline-sm font-semibold text-deep-oxblood">اختصارات</h2>
          <div className={cn('grid grid-cols-1 gap-1', !canOrders && 'sm:grid-cols-2 lg:grid-cols-3')}>
            {shortcuts.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-label-lg text-label-lg text-warm-ink hover:bg-blush-surface"
              >
                <Icon name={a.icon} className="text-[22px] text-antique-gold" />
                {a.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
