import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { AdminPage, Button, EmptyState, inputClass, OfflineNotice, ReadOnlyNotice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { badgeLabels, useCatalog } from '@/data/catalog';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { useAdminAuth } from '@/state/adminAuth';
import { useCatalogEditor } from './useCatalogEditor';

/** قائمة المنتجات: بحث، تصفية حسب القسم، إخفاء/إظهار، حذف، والانتقال للتعديل. */
export default function ProductsAdmin() {
  const catalog = useCatalog();
  const { commit, saving, online } = useCatalogEditor();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const canEdit = useAdminAuth().can('products', 'edit');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const categoryName = (slug: string) => catalog.categories.find((c) => c.slug === slug)?.name ?? '—';
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.products.filter(
      (p) =>
        (category === 'all' || p.category === category) && (!q || [p.name, p.shortName, p.sku].some((s) => s.toLowerCase().includes(q))),
    );
  }, [catalog.products, category, query]);

  const toggleHidden = (p: Product) =>
    commit(
      (d) => ({ ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, hidden: !x.hidden || undefined } : x)) }),
      p.hidden ? 'المنتج ظاهر الآن للزوار' : 'تم إخفاء المنتج',
    );

  const remove = async (p: Product) => {
    const ok = await confirm({
      title: `حذف «${p.shortName}»؟`,
      body: 'يُحذف المنتج نهائياً من المتجر. لإخفائه مؤقتاً استخدم زر العين بدلاً من الحذف.',
      confirmLabel: 'حذف المنتج',
      tone: 'danger',
    });
    if (ok) void commit((d) => ({ ...d, products: d.products.filter((x) => x.id !== p.id) }), 'تم حذف المنتج');
  };

  const addNew = () =>
    navigate(category !== 'all' ? `/admin/products/new?category=${encodeURIComponent(category)}` : '/admin/products/new');

  return (
    <AdminPage
      title="المنتجات"
      subtitle={`${catalog.products.length} منتجاً في ${catalog.categories.length} أقسام`}
      actions={
        canEdit && (
          <>
            <Button variant="secondary" icon="photo_library" onClick={() => navigate('/admin/instagram')}>
              استيراد من إنستغرام
            </Button>
            <Button icon="add" onClick={addNew}>
              إضافة منتج
            </Button>
          </>
        )
      }
    >
      {!online && <OfflineNotice message="الخادم غير متاح حالياً، لذلك لن تُحفظ التعديلات." />}
      {!canEdit && <ReadOnlyNotice />}

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-antique-gold" />
          <input
            className={cn(inputClass, 'pr-10')}
            placeholder="ابحث بالاسم أو رمز القطعة…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[{ slug: 'all', name: 'الكل' }, ...catalog.categories].map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCategory(c.slug)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 font-label-md text-label-md transition-colors',
                category === c.slug ? 'bg-imperial-burgundy text-ivory-canvas' : 'bg-blush-surface text-warm-ink hover:bg-rose-mist',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="diamond"
          title={catalog.products.length ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات بعد'}
          body={catalog.products.length ? undefined : 'أضف أول قطعة يدوياً، أو استوردها مع صورها وفيديوهاتها من حساب إنستغرام.'}
          action={
            canEdit && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon="add" onClick={addNew}>
                  إضافة منتج
                </Button>
                <Button variant="secondary" icon="photo_library" onClick={() => navigate('/admin/instagram')}>
                  استيراد من إنستغرام
                </Button>
              </div>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-2.5 shadow-luxury md:p-3">
              <Link to={`/admin/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <img
                  src={p.image}
                  alt=""
                  loading="lazy"
                  className={cn('h-16 w-16 shrink-0 rounded-xl object-cover', p.hidden && 'opacity-40 grayscale')}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-label-lg text-label-lg font-semibold text-deep-oxblood">{p.shortName}</span>
                    {p.hidden && (
                      <span className="rounded-full bg-surface-container-high px-2 font-label-sm text-label-sm text-muted-rosewood">
                        مخفي
                      </span>
                    )}
                    {p.stock <= 0 && (
                      <span className="rounded-full bg-semantic-error-bg px-2 font-label-sm text-label-sm text-semantic-error">نفد</span>
                    )}
                    {p.videos?.length ? (
                      <span title="فيه فيديو" className="flex">
                        <Icon name="smart_display" className="text-[16px] text-antique-gold" />
                      </span>
                    ) : null}
                    {p.source?.startsWith('ig:') && (
                      <span title="مستورد من إنستغرام" className="flex">
                        <Icon name="photo_library" className="text-[16px] text-antique-gold" />
                      </span>
                    )}
                    {p.badge && p.badge !== 'soldout' && (
                      <span className="rounded-full bg-champagne-gold/40 px-2 font-label-sm text-label-sm text-antique-gold">
                        {badgeLabels[p.badge]}
                      </span>
                    )}
                  </span>
                  <span className="block truncate font-label-sm text-label-sm text-muted-rosewood">
                    {categoryName(p.category)} · {p.sku || 'بلا رمز'} · المتوفر: {p.stock}
                  </span>
                  <span className="block font-label-md text-label-md font-bold text-imperial-burgundy tabular-nums">
                    {formatNumber(p.price)} د.ع
                  </span>
                </span>
              </Link>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={p.hidden ? 'إظهار المنتج' : 'إخفاء المنتج'}
                    title={p.hidden ? 'إظهار' : 'إخفاء'}
                    disabled={saving}
                    onClick={() => void toggleHidden(p)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-rosewood hover:bg-blush-surface"
                  >
                    <Icon name={p.hidden ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="حذف المنتج"
                    title="حذف"
                    disabled={saving}
                    onClick={() => void remove(p)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-semantic-error hover:bg-semantic-error-bg"
                  >
                    <Icon name="delete" className="text-[20px]" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
