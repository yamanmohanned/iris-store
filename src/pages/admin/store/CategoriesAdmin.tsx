import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import {
  AdminPage,
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  inputClass,
  OfflineNotice,
  ReadOnlyNotice,
  Toggle,
} from '@/components/admin/ui';
import { ImageField } from '@/components/admin/ImageField';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import type { Category, Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { piecesCount } from '@/lib/format';
import { useAdminAuth } from '@/state/adminAuth';
import { useToast } from '@/state/toast';
import { slugify, uniqueSlug, useCatalogEditor } from './useCatalogEditor';

interface Draft {
  slug: string | null; // null = قسم جديد
  name: string;
  title: string;
  description: string;
  image: string;
  unit: string;
  hidden: boolean;
}

const EMPTY: Draft = { slug: null, name: '', title: '', description: '', image: '', unit: '', hidden: false };

/** يحرّك عنصراً خطوة للأعلى/للأسفل داخل مصفوفة. */
function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

/**
 * إدارة الأقسام (قلائد، أساور، محابس…): إضافة، تعديل، ترتيب، إخفاء، حذف،
 * وتحديد المنتجات التي تظهر تحت كل قسم وترتيبها.
 */
export default function CategoriesAdmin() {
  const catalog = useCatalog();
  const { commit, saving, online } = useCatalogEditor();
  const { can } = useAdminAuth();
  const canEdit = can('categories', 'edit');
  const canEditProducts = can('products', 'edit');
  const { confirm, choose } = useConfirm();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string>();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    catalog.products.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1));
    return m;
  }, [catalog.products]);

  const openNew = () => {
    setError(undefined);
    setDraft({ ...EMPTY });
  };
  const openEdit = (c: Category) => {
    setError(undefined);
    setDraft({
      slug: c.slug,
      name: c.name,
      title: c.title,
      description: c.description,
      image: c.image,
      unit: c.unit ?? '',
      hidden: !!c.hidden,
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError('اكتب اسم القسم.');
      return;
    }
    const ok = await commit(
      (d) => {
        const data: Category = {
          slug:
            draft.slug ??
            uniqueSlug(
              slugify(name),
              d.categories.map((c) => c.slug),
            ),
          name,
          title: draft.title.trim() || name,
          description: draft.description.trim(),
          image: draft.image,
          ...(draft.unit.trim() ? { unit: draft.unit.trim() } : {}),
          ...(draft.hidden ? { hidden: true } : {}),
        };
        d.categories = draft.slug ? d.categories.map((c) => (c.slug === draft.slug ? data : c)) : [...d.categories, data];
        return d;
      },
      draft.slug ? 'تم حفظ القسم' : 'تمت إضافة القسم',
    );
    if (ok) setDraft(null);
  };

  const reorder = (index: number, dir: -1 | 1) => commit((d) => ({ ...d, categories: move(d.categories, index, dir) }));

  const toggleHidden = (c: Category) =>
    commit(
      (d) => ({ ...d, categories: d.categories.map((x) => (x.slug === c.slug ? { ...x, hidden: !x.hidden || undefined } : x)) }),
      c.hidden ? 'القسم ظاهر الآن للزوار' : 'تم إخفاء القسم عن الزوار',
    );

  const remove = async (c: Category) => {
    const count = counts.get(c.slug) ?? 0;
    if (count > 0) {
      if (!canEditProducts) {
        toast.show('في هذا القسم منتجات؛ نقلها يحتاج صلاحية تعديل المنتجات.', 'error');
        return;
      }
      const others = catalog.categories.filter((x) => x.slug !== c.slug);
      if (!others.length) {
        toast.show('لا يمكن حذف القسم الوحيد وفيه منتجات. أضف قسماً آخر أولاً أو احذف المنتجات.', 'error');
        return;
      }
      const target = await choose({
        title: `حذف قسم «${c.name}»؟`,
        body: `في هذا القسم ${piecesCount(count)}. اختر القسم الذي تُنقل إليه قبل الحذف.`,
        choiceLabel: 'انقل المنتجات إلى',
        choices: others.map((o) => ({ value: o.slug, label: o.name })),
        confirmLabel: 'نقل المنتجات وحذف القسم',
        tone: 'danger',
      });
      const dest = others.find((o) => o.slug === target);
      if (!dest) return;
      await commit(
        (d) => ({
          ...d,
          categories: d.categories.filter((x) => x.slug !== c.slug),
          products: d.products.map((p) => (p.category === c.slug ? { ...p, category: dest.slug } : p)),
        }),
        `تم حذف «${c.name}» ونقل منتجاته إلى «${dest.name}»`,
      );
      return;
    }
    const ok = await confirm({
      title: `حذف قسم «${c.name}»؟`,
      body: 'القسم فارغ، ولن يتأثر أي منتج.',
      confirmLabel: 'حذف القسم',
      tone: 'danger',
    });
    if (ok) await commit((d) => ({ ...d, categories: d.categories.filter((x) => x.slug !== c.slug) }), 'تم حذف القسم');
  };

  return (
    <AdminPage
      title="الأقسام"
      subtitle="الأقسام تظهر في الصفحة الرئيسية بنفس الترتيب هنا، وكل قسم يعرض المنتجات التي تخصصها له."
      actions={
        canEdit && (
          <Button icon="add" onClick={openNew}>
            إضافة قسم
          </Button>
        )
      }
    >
      {!canEdit && <ReadOnlyNotice />}
      {!online && (
        <OfflineNotice message="الخادم غير متاح حالياً، لذلك لن تُحفظ التعديلات. تأكد من رفع مجلد api مع الموقع على استضافة تدعم PHP." />
      )}

      {catalog.categories.length === 0 ? (
        <EmptyState
          icon="category"
          title="لا توجد أقسام بعد"
          body="ابدأ بإضافة أول قسم مثل: قلائد، أساور، تطقيمات."
          action={
            canEdit && (
              <Button icon="add" onClick={openNew}>
                إضافة قسم
              </Button>
            )
          }
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {catalog.categories.map((c, i) => (
            <li key={c.slug}>
              <Card className="flex items-center gap-3 !p-3 md:gap-4">
                <div className={cn('flex flex-col', !canEdit && 'hidden')}>
                  <button
                    type="button"
                    aria-label="تحريك للأعلى"
                    disabled={i === 0 || saving}
                    onClick={() => void reorder(i, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-rosewood hover:bg-blush-surface disabled:opacity-25"
                  >
                    <Icon name="keyboard_arrow_up" className="text-[22px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="تحريك للأسفل"
                    disabled={i === catalog.categories.length - 1 || saving}
                    onClick={() => void reorder(i, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-rosewood hover:bg-blush-surface disabled:opacity-25"
                  >
                    <Icon name="keyboard_arrow_down" className="text-[22px]" />
                  </button>
                </div>
                <button type="button" onClick={() => openEdit(c)} className="flex min-w-0 flex-1 items-center gap-3 text-right">
                  <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-blush-surface">
                    {c.image ? (
                      <img src={c.image} alt="" className={cn('h-full w-full object-cover', c.hidden && 'opacity-40 grayscale')} />
                    ) : (
                      <Icon name="image" className="m-auto mt-5 block text-center text-[24px] text-rose-mist" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-headline-sm text-headline-sm font-semibold text-deep-oxblood">{c.name}</span>
                      {c.hidden && (
                        <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-muted-rosewood">
                          مخفي
                        </span>
                      )}
                    </span>
                    <span className="block font-label-md text-label-md text-muted-rosewood">
                      {(counts.get(c.slug) ?? 0) > 0 ? piecesCount(counts.get(c.slug) ?? 0) : 'لا توجد منتجات'}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    hidden={!canEdit}
                    title={c.hidden ? 'إظهار' : 'إخفاء'}
                    aria-label={c.hidden ? 'إظهار القسم' : 'إخفاء القسم'}
                    disabled={saving}
                    onClick={() => void toggleHidden(c)}
                    className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-rosewood hover:bg-blush-surface sm:flex"
                  >
                    <Icon name={c.hidden ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                  </button>
                  <Link
                    to={`/collections/${c.slug}`}
                    target="_blank"
                    title="عرض في المتجر"
                    aria-label="عرض في المتجر"
                    className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-rosewood hover:bg-blush-surface sm:flex"
                  >
                    <Icon name="open_in_new" className="text-[20px]" />
                  </Link>
                  <button
                    type="button"
                    title={canEdit ? 'تعديل' : 'عرض'}
                    aria-label={canEdit ? 'تعديل القسم' : 'عرض القسم'}
                    onClick={() => openEdit(c)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-imperial-burgundy hover:bg-blush-surface"
                  >
                    <Icon name={canEdit ? 'edit' : 'visibility'} className="text-[20px]" />
                  </button>
                  <button
                    type="button"
                    hidden={!canEdit}
                    title="حذف"
                    aria-label="حذف القسم"
                    disabled={saving}
                    onClick={() => void remove(c)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-semantic-error hover:bg-semantic-error-bg"
                  >
                    <Icon name="delete" className="text-[20px]" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <Drawer
        open={!!draft}
        title={draft?.slug ? (canEdit ? 'تعديل القسم' : 'تفاصيل القسم') : 'قسم جديد'}
        onClose={() => setDraft(null)}
        footer={
          canEdit && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                إلغاء
              </Button>
              <Button icon="check" busy={saving} onClick={() => void saveDraft()}>
                حفظ القسم
              </Button>
            </div>
          )
        }
      >
        {draft && (
          <div className="flex flex-col gap-5">
            <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-5">
              <Field label="اسم القسم" required error={error} hint="يظهر على بطاقة القسم، مثل: قلائد، أساور، محابس.">
                <input
                  className={inputClass}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  maxLength={80}
                  autoFocus
                />
              </Field>
              <Field label="صورة القسم" hint="صورة أفقية واضحة؛ تُعرض كبطاقة كبيرة في الرئيسية وغلافاً لصفحة القسم.">
                <ImageField value={draft.image} onChange={(image) => setDraft({ ...draft, image })} aspect="aspect-[16/10]" />
              </Field>
              <Field label="وصف قصير" hint="يظهر أعلى صفحة القسم (اختياري).">
                <textarea
                  className={cn(inputClass, 'min-h-[96px]')}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  maxLength={1500}
                />
              </Field>
              <details className="rounded-xl bg-surface-container-low px-4 py-3">
                <summary className="cursor-pointer font-label-lg text-label-lg text-warm-ink">خيارات إضافية</summary>
                <div className="mt-4 flex flex-col gap-4">
                  <Field label="عنوان صفحة القسم" hint="للديسكتوب؛ يُستخدم اسم القسم إن تُرك فارغاً.">
                    <input
                      className={inputClass}
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      maxLength={120}
                    />
                  </Field>
                  <Field label="وحدة العد" hint="مثل: قطعة، سيت.">
                    <input
                      className={inputClass}
                      value={draft.unit}
                      onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                      maxLength={40}
                    />
                  </Field>
                </div>
              </details>
              <Toggle checked={draft.hidden} onChange={(hidden) => setDraft({ ...draft, hidden })} label="إخفاء القسم عن الزوار مؤقتاً" />
            </fieldset>
            {draft.slug && <CategoryProducts slug={draft.slug} editable={canEditProducts} />}
          </div>
        )}
      </Drawer>
    </AdminPage>
  );
}

/** منتجات القسم: ترتيبها، نقلها لقسم آخر، وإضافة منتجات من أقسام أخرى. */
function CategoryProducts({ slug, editable }: { slug: string; editable: boolean }) {
  const catalog = useCatalog();
  const { commit, saving } = useCatalogEditor();
  const [adding, setAdding] = useState('');
  const items = catalog.products.filter((p) => p.category === slug);
  const others = catalog.products.filter((p) => p.category !== slug);
  const categoryName = (s: string) => catalog.categories.find((c) => c.slug === s)?.name ?? s;

  /** تبديل مكان المنتج مع جاره في القسم نفسه داخل الترتيب العام. */
  const reorder = (p: Product, dir: -1 | 1) =>
    commit((d) => {
      const idx = d.products.findIndex((x) => x.id === p.id);
      let j = idx + dir;
      while (j >= 0 && j < d.products.length && d.products[j].category !== slug) j += dir;
      if (j < 0 || j >= d.products.length) return d;
      const products = [...d.products];
      [products[idx], products[j]] = [products[j], products[idx]];
      return { ...d, products };
    });

  const moveTo = (p: Product, target: string) =>
    commit(
      (d) => ({ ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, category: target } : x)) }),
      `نُقلت «${p.shortName}» إلى «${categoryName(target)}»`,
    );

  return (
    <section className="flex flex-col gap-3 border-t border-hairline-burgundy pt-5">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">منتجات هذا القسم</h3>
        <Link
          to={`/admin/products/new?category=${encodeURIComponent(slug)}`}
          hidden={!editable}
          className="inline-flex items-center gap-1 font-label-md text-label-md text-imperial-burgundy"
        >
          <Icon name="add" className="text-[18px]" /> منتج جديد
        </Link>
      </div>
      {items.length === 0 && <p className="font-body-sm text-body-sm text-muted-rosewood">لم تخصص أي منتج لهذا القسم بعد.</p>}
      <ul className="flex flex-col gap-2">
        {items.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-surface-container-lowest p-2 shadow-sm">
            <div className={cn('flex flex-col', !editable && 'hidden')}>
              <button
                type="button"
                aria-label="للأعلى"
                disabled={i === 0 || saving}
                onClick={() => void reorder(p, -1)}
                className="text-muted-rosewood disabled:opacity-25"
              >
                <Icon name="keyboard_arrow_up" className="text-[20px]" />
              </button>
              <button
                type="button"
                aria-label="للأسفل"
                disabled={i === items.length - 1 || saving}
                onClick={() => void reorder(p, 1)}
                className="text-muted-rosewood disabled:opacity-25"
              >
                <Icon name="keyboard_arrow_down" className="text-[20px]" />
              </button>
            </div>
            <img src={p.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            <Link
              to={`/admin/products/${p.id}`}
              className="min-w-0 flex-1 truncate font-label-md text-label-md text-warm-ink hover:text-imperial-burgundy"
            >
              {p.shortName}
              {p.hidden && <span className="mr-2 text-muted-rosewood">(مخفي)</span>}
            </Link>
            <select
              aria-label="نقل إلى قسم"
              value=""
              hidden={!editable}
              disabled={saving}
              onChange={(e) => e.target.value && void moveTo(p, e.target.value)}
              className="max-w-[120px] rounded-lg bg-blush-surface px-2 py-1.5 font-label-sm text-label-sm text-warm-ink"
            >
              <option value="">نقل إلى…</option>
              {catalog.categories
                .filter((c) => c.slug !== slug)
                .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
            </select>
          </li>
        ))}
      </ul>
      {editable && others.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            aria-label="إضافة منتج موجود"
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            className={cn(inputClass, 'py-2')}
          >
            <option value="">أضف منتجاً موجوداً إلى هذا القسم…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName} — ({categoryName(p.category)})
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={!adding}
            busy={saving}
            onClick={() => {
              const p = others.find((x) => x.id === adding);
              if (p) void moveTo(p, slug).then(() => setAdding(''));
            }}
          >
            إضافة
          </Button>
        </div>
      )}
    </section>
  );
}
