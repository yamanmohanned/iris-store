import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ImageField } from '@/components/admin/ImageField';
import { AdminPage, Button, Card, EmptyState, Field, inputClass, OfflineNotice, ReadOnlyNotice, Toggle } from '@/components/admin/ui';
import { VideoField } from '@/components/admin/VideoField';
import { Icon } from '@/components/common/Icon';
import { badgeLabels, useCatalog } from '@/data/catalog';
import type { Product, ProductBadge } from '@/data/types';
import { cn } from '@/lib/cn';
import { METAL_STYLES } from '@/pages/store/product/productOptions';
import { useAdminAuth } from '@/state/adminAuth';
import { newId, slugify, uniqueSlug, useCatalogEditor } from './useCatalogEditor';

type Swatch = NonNullable<Product['swatches']>[number];
type CustomColor = NonNullable<Product['customColors']>[number];
const SWATCHES = Object.keys(METAL_STYLES) as Swatch[];
const MAX_CUSTOM_COLORS = 12;

interface Form {
  name: string;
  shortName: string;
  category: string;
  price: string;
  oldPrice: string;
  stock: string;
  sku: string;
  metal: string;
  summary: string;
  image: string;
  gallery: string[];
  videos: string[];
  badge: ProductBadge | '';
  swatches: Swatch[];
  customColors: CustomColor[];
  sizes: Array<{ label: string; soldOut: boolean; note?: string }>;
  description: string;
  specs: string;
  hidden: boolean;
}

function toForm(p: Product | undefined, category: string): Form {
  return {
    name: p?.name ?? '',
    shortName: p?.shortName ?? '',
    category: p?.category ?? category,
    price: p ? String(p.price) : '',
    oldPrice: p?.oldPrice ? String(p.oldPrice) : '',
    stock: p ? String(p.stock) : '1',
    sku: p?.sku ?? '',
    metal: p?.metal ?? '',
    summary: p?.summary ?? '',
    image: p?.image ?? '',
    gallery: (p?.gallery ?? []).filter((g) => g !== p?.image),
    videos: p?.videos ?? [],
    badge: p?.badge ?? '',
    swatches: p?.swatches ?? [],
    customColors: p?.customColors ?? [],
    sizes: (p?.sizes ?? []).map((s) => ({ label: s.label, soldOut: !!s.soldOut, note: s.note })),
    description: (p?.content?.description ?? []).join('\n\n'),
    specs: (p?.content?.specs ?? []).map((s) => `${s.label}: ${s.value}`).join('\n'),
    hidden: !!p?.hidden,
  };
}

const num = (v: string) => Number(v.replace(/[^\d]/g, ''));

/** إضافة منتج (`/admin/products/new`) أو تعديله (`/admin/products/:id`) وتخصيص قسمه. */
export default function ProductEditor() {
  const { productId } = useParams();
  const [params] = useSearchParams();
  const catalog = useCatalog();
  const existing = productId ? catalog.byId.get(productId) : undefined;
  if (productId && !existing) {
    return (
      <AdminPage title="المنتج غير موجود">
        <EmptyState
          icon="search_off"
          title="لم نجد هذا المنتج"
          action={
            <Link to="/admin/products" className="text-imperial-burgundy underline">
              العودة إلى المنتجات
            </Link>
          }
        />
      </AdminPage>
    );
  }
  const initialCategory = params.get('category') ?? catalog.categories[0]?.slug ?? '';
  return <EditorForm key={productId ?? 'new'} existing={existing} initialCategory={initialCategory} />;
}

function EditorForm({ existing, initialCategory }: { existing?: Product; initialCategory: string }) {
  const catalog = useCatalog();
  const { commit, saving, online } = useCatalogEditor();
  const navigate = useNavigate();
  const readOnly = !useAdminAuth().can('products', 'edit');
  const [f, setF] = useState<Form>(() => toForm(existing, initialCategory));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setF((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const e: typeof errors = {};
    if (!f.name.trim()) e.name = 'اكتب اسم المنتج.';
    if (!f.category) e.category = 'اختر القسم.';
    if (!f.price || num(f.price) <= 0) e.price = 'اكتب السعر بالدينار.';
    if (f.oldPrice && num(f.oldPrice) <= num(f.price)) e.oldPrice = 'السعر قبل الخصم يجب أن يكون أعلى من السعر الحالي.';
    if (!f.image) e.image = 'أضف صورة للمنتج.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const ok = await commit(
      (d) => {
        const name = f.name.trim();
        const shortName = f.shortName.trim() || name;
        const id = existing?.id ?? newId('p');
        const sizes = f.sizes
          .filter((s) => s.label.trim())
          .map((s) => ({ label: s.label.trim(), ...(s.note ? { note: s.note } : {}), ...(s.soldOut ? { soldOut: true } : {}) }));
        const description = f.description
          .split(/\n\s*\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        const specs = f.specs
          .split('\n')
          .map((line) => line.split(/[:：]/))
          .filter((parts) => parts.length >= 2 && parts[0].trim() && parts.slice(1).join(':').trim())
          .map((parts) => ({ label: parts[0].trim(), value: parts.slice(1).join(':').trim() }));
        // يُحتفظ بالقصة والشهادة الموجودة؛ بلا وصف ولا مواصفات تُعرض التفاصيل العامة للقطعة
        const content = description.length || specs.length ? { ...existing?.content, description, specs } : undefined;
        const product: Product = {
          id,
          slug:
            existing?.slug ??
            uniqueSlug(
              slugify(shortName),
              d.products.map((p) => p.slug),
            ),
          sku: f.sku.trim() || `IR-${id.slice(-5).toUpperCase()}`,
          name,
          shortName,
          category: f.category,
          summary: f.summary.trim(),
          metal: f.metal.trim(),
          price: num(f.price),
          ...(f.oldPrice ? { oldPrice: num(f.oldPrice) } : {}),
          ...(f.badge ? { badge: f.badge } : {}),
          stock: Math.max(0, num(f.stock || '0')),
          image: f.image,
          gallery: [f.image, ...f.gallery.filter(Boolean)],
          ...(f.videos.length ? { videos: f.videos } : {}),
          ...(existing?.source ? { source: existing.source, ...(existing.sourceUrl ? { sourceUrl: existing.sourceUrl } : {}) } : {}),
          ...(f.swatches.length ? { swatches: f.swatches } : {}),
          ...(f.customColors.length ? { customColors: f.customColors } : {}),
          ...(sizes.length ? { sizes } : {}),
          ...(existing?.tags ? { tags: existing.tags } : {}),
          ...(f.hidden ? { hidden: true } : {}),
          ...(content ? { content } : {}),
        };
        d.products = existing ? d.products.map((p) => (p.id === existing.id ? product : p)) : [...d.products, product];
        return d;
      },
      existing ? 'تم حفظ التعديلات' : 'تمت إضافة المنتج',
    );
    if (ok) navigate('/admin/products');
  };

  return (
    <AdminPage
      title={existing ? (readOnly ? existing.shortName : `تعديل: ${existing.shortName}`) : 'منتج جديد'}
      subtitle="القسم الذي تختاره هنا هو الذي يظهر فيه المنتج في المتجر."
      actions={
        <>
          {existing && (
            <a
              href={`/products/${existing.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-label-md text-label-md text-imperial-burgundy hover:bg-blush-surface"
            >
              <Icon name="open_in_new" className="text-[18px]" /> عرض في المتجر
            </a>
          )}
          {existing?.sourceUrl && (
            <a
              href={existing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-label-md text-label-md text-imperial-burgundy hover:bg-blush-surface"
            >
              <Icon name="photo_library" className="text-[18px]" /> المنشور الأصلي
            </a>
          )}
          <Button variant="secondary" onClick={() => navigate('/admin/products')}>
            {readOnly ? 'رجوع' : 'إلغاء'}
          </Button>
          {!readOnly && (
            <Button icon="check" busy={saving} onClick={() => void save()}>
              حفظ المنتج
            </Button>
          )}
        </>
      }
    >
      {readOnly && <ReadOnlyNotice />}
      {!online && <OfflineNotice message="الخادم غير متاح حالياً، لذلك لن يُحفظ المنتج." />}
      {catalog.categories.length === 0 && <OfflineNotice message="أضف قسماً واحداً على الأقل من صفحة الأقسام قبل إضافة المنتجات." />}

      <fieldset disabled={readOnly} className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Card className="flex flex-col gap-4">
            <Field label="اسم المنتج" required error={errors.name}>
              <input
                className={inputClass}
                value={f.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={200}
                placeholder="مثال: قلادة الأمنيات 11:11"
              />
            </Field>
            <Field label="الاسم المختصر" hint="يظهر على البطاقات والسلة؛ يُستخدم الاسم الكامل إن تُرك فارغاً.">
              <input className={inputClass} value={f.shortName} onChange={(e) => set('shortName', e.target.value)} maxLength={120} />
            </Field>
            <Field label="القسم" required error={errors.category}>
              <select className={inputClass} value={f.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">اختر القسم…</option>
                {catalog.categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                    {c.hidden ? ' (مخفي)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="السعر (د.ع)" required error={errors.price}>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  dir="ltr"
                  value={f.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="25000"
                />
              </Field>
              <Field label="السعر قبل الخصم" error={errors.oldPrice} hint="اختياري — يظهر مشطوباً">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  dir="ltr"
                  value={f.oldPrice}
                  onChange={(e) => set('oldPrice', e.target.value)}
                />
              </Field>
              <Field label="الكمية المتوفرة" hint="0 = نفدت الكمية">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  dir="ltr"
                  value={f.stock}
                  onChange={(e) => set('stock', e.target.value)}
                />
              </Field>
              <Field label="رمز القطعة (SKU)" hint="يُنشأ تلقائياً إن تُرك فارغاً">
                <input className={inputClass} dir="ltr" value={f.sku} onChange={(e) => set('sku', e.target.value)} maxLength={40} />
              </Field>
            </div>
            <Field label="الخامة" hint="مثال: ستانلس ستيل بطلاء ذهبي ثابت">
              <input className={inputClass} value={f.metal} onChange={(e) => set('metal', e.target.value)} maxLength={120} />
            </Field>
            <Field label="وصف قصير" hint="سطر واحد يظهر تحت اسم المنتج في بطاقة القسم.">
              <input className={inputClass} value={f.summary} onChange={(e) => set('summary', e.target.value)} maxLength={500} />
            </Field>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">الخيارات</h2>
            <div>
              <p className="font-label-lg text-label-lg text-warm-ink">الألوان المتاحة</p>
              <p className="mb-2 font-label-sm text-label-sm text-muted-rosewood">اختر من الألوان الجاهزة، أو أضف لوناً جديداً باسمه ودرجته.</p>
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((k) => {
                  const on = f.swatches.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => set('swatches', on ? f.swatches.filter((x) => x !== k) : [...f.swatches, k])}
                      className={cn(
                        'flex items-center gap-2 rounded-full px-3 py-1.5 font-label-md text-label-md',
                        on ? 'bg-imperial-burgundy text-ivory-canvas' : 'bg-blush-surface text-warm-ink',
                      )}
                    >
                      <span className={cn('h-4 w-4 rounded-full bg-gradient-to-br ring-1 ring-black/10', METAL_STYLES[k].gradient)} />
                      {METAL_STYLES[k].label}
                    </button>
                  );
                })}
                {f.customColors.map((c) => (
                  <span
                    key={c.name}
                    className="flex items-center gap-2 rounded-full bg-imperial-burgundy py-1 pe-1 ps-3 font-label-md text-label-md text-ivory-canvas"
                  >
                    <span className="h-4 w-4 rounded-full ring-1 ring-white/40" style={{ background: c.hex }} />
                    {c.name}
                    <button
                      type="button"
                      aria-label={`حذف اللون ${c.name}`}
                      onClick={() =>
                        set(
                          'customColors',
                          f.customColors.filter((x) => x.name !== c.name),
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/15"
                    >
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  </span>
                ))}
              </div>
              {f.customColors.length < MAX_CUSTOM_COLORS && (
                <CustomColorAdd
                  taken={[...SWATCHES.map((k) => METAL_STYLES[k].label), ...f.customColors.map((c) => c.name)]}
                  onAdd={(c) => set('customColors', [...f.customColors, c])}
                />
              )}
            </div>
            <div>
              <p className="mb-2 font-label-lg text-label-lg text-warm-ink">المقاسات / الأطوال</p>
              <div className="flex flex-col gap-2">
                {f.sizes.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={cn(inputClass, 'py-2')}
                      value={s.label}
                      placeholder="مثال: 45 سم أو 14"
                      onChange={(e) =>
                        set(
                          'sizes',
                          f.sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                        )
                      }
                    />
                    <label className="flex shrink-0 items-center gap-1 font-label-sm text-label-sm text-muted-rosewood">
                      <input
                        type="checkbox"
                        checked={s.soldOut}
                        onChange={(e) =>
                          set(
                            'sizes',
                            f.sizes.map((x, j) => (j === i ? { ...x, soldOut: e.target.checked } : x)),
                          )
                        }
                      />
                      نفد
                    </label>
                    <button
                      type="button"
                      aria-label="حذف المقاس"
                      onClick={() =>
                        set(
                          'sizes',
                          f.sizes.filter((_, j) => j !== i),
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-semantic-error hover:bg-semantic-error-bg"
                    >
                      <Icon name="close" className="text-[18px]" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  icon="add"
                  className="self-start"
                  onClick={() => set('sizes', [...f.sizes, { label: '', soldOut: false }])}
                >
                  إضافة مقاس
                </Button>
              </div>
            </div>
            <Field label="الشارة على الصورة">
              <select className={inputClass} value={f.badge} onChange={(e) => set('badge', e.target.value as Form['badge'])}>
                <option value="">بدون</option>
                {(Object.keys(badgeLabels) as ProductBadge[]).map((b) => (
                  <option key={b} value={b}>
                    {badgeLabels[b]}
                  </option>
                ))}
              </select>
            </Field>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">التفاصيل (اختياري)</h2>
            <Field label="الوصف التفصيلي" hint="يظهر في صفحة المنتج. اترك سطراً فارغاً بين الفقرات.">
              <textarea
                className={cn(inputClass, 'min-h-[120px]')}
                value={f.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
            <Field label="المواصفات" hint="كل سطر بصيغة «الاسم: القيمة»، مثل: الوزن: 4.8 غرام">
              <textarea className={cn(inputClass, 'min-h-[100px]')} value={f.specs} onChange={(e) => set('specs', e.target.value)} />
            </Field>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-5">
          <Card className="flex flex-col gap-3">
            <Field label="الصورة الرئيسية" required error={errors.image}>
              <ImageField value={f.image} onChange={(url) => set('image', url)} />
            </Field>
            <p className="font-label-lg text-label-lg text-warm-ink">صور إضافية</p>
            <div className="grid grid-cols-3 gap-2">
              {f.gallery.map((g, i) => (
                <div key={g + i} className="relative aspect-square overflow-hidden rounded-lg bg-blush-surface">
                  <img src={g} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="حذف الصورة"
                    onClick={() =>
                      set(
                        'gallery',
                        f.gallery.filter((_, j) => j !== i),
                      )
                    }
                    className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-wine-night/70 text-ivory-canvas"
                  >
                    <Icon name="close" className="text-[16px]" />
                  </button>
                </div>
              ))}
            </div>
            {f.gallery.length < 8 && <GalleryAdd onAdd={(url) => set('gallery', [...f.gallery, url])} />}
          </Card>
          <Card className="flex flex-col gap-3">
            <div>
              <p className="font-label-lg text-label-lg text-warm-ink">فيديو المنتج</p>
              <p className="font-label-sm text-label-sm text-muted-rosewood">
                يظهر بعد الصورة الرئيسية في صفحة المنتج، صامتاً ومتكرراً. حتى 3 مقاطع قصيرة.
              </p>
            </div>
            <VideoField value={f.videos} onChange={(v) => set('videos', v)} />
          </Card>
          <Card>
            <Toggle checked={f.hidden} onChange={(v) => set('hidden', v)} label="إخفاء المنتج عن الزوار (مسودة)" />
          </Card>
        </div>
      </fieldset>
    </AdminPage>
  );
}

/** لون جديد غير الجاهزة: اسم يظهر للزبون + درجة من منتقي الألوان. */
function CustomColorAdd({ taken, onAdd }: { taken: string[]; onAdd: (c: CustomColor) => void }) {
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#1f3a93');
  const [error, setError] = useState('');
  const add = () => {
    const n = name.trim();
    if (!n) return setError('اكتب اسم اللون كما سيظهر للزبون.');
    if (taken.includes(n)) return setError('هذا اللون مضاف مسبقاً.');
    onAdd({ name: n, hex: hex.toLowerCase() });
    setName('');
    setError('');
  };
  return (
    <div className="mt-3 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full shadow-sm ring-1 ring-black/15"
          style={{ background: hex }}
          title="اختر درجة اللون"
        >
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            aria-label="درجة اللون الجديد"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <div className="min-w-[160px] flex-1">
          <input
            className={cn(inputClass, 'py-2')}
            value={name}
            maxLength={30}
            placeholder="اسم اللون، مثل: أزرق ملكي"
            aria-label="اسم اللون الجديد"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>
        <Button variant="secondary" icon="add" onClick={add}>
          إضافة لون
        </Button>
      </div>
      {error && <p className="font-label-sm text-label-sm text-semantic-error">{error}</p>}
    </div>
  );
}

function GalleryAdd({ onAdd }: { onAdd: (url: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="max-w-[160px]">
      <ImageField
        value={value}
        aspect="aspect-square"
        onChange={(url) => {
          if (!url) return;
          onAdd(url);
          setValue('');
        }}
      />
    </div>
  );
}
