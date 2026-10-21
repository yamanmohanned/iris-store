import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer, Field, inputClass, Notice, Toggle } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import type { Category, Product } from '@/data/types';
import { instagramApi, type IgPost } from '@/lib/adminApi';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { parseCaption, suggestCategory } from '@/lib/instagram/caption';
import { useAdminAuth } from '@/state/adminAuth';
import { useToast } from '@/state/toast';
import { newId, slugify, uniqueSlug, useCatalogEditor } from '../useCatalogEditor';
import type { ScanMap } from './InstagramImport';

const NEW_CATEGORY = '__new__';

interface Draft {
  post: IgPost;
  items: string[];
  name: string;
  price: string;
  priceMax: number | null;
  category: string;
  newCategory: string;
  stock: string;
  hidden: boolean;
}

const digits = (v: string) => Number(v.replace(/[^\d]/g, '') || 0);

/** مراجعة المنشورات المختارة ثم استيرادها: كل منشور منتج واحد بصوره وفيديوهاته. */
export function ImportReview({ posts, scan, onClose, onDone }: { posts: IgPost[]; scan: ScanMap; onClose: () => void; onDone: () => void }) {
  const catalog = useCatalog();
  const { commit } = useCatalogEditor();
  const canCategories = useAdminAuth().can('categories', 'edit');
  const navigate = useNavigate();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    posts.map((post) => {
      const parsed = parseCaption(post.caption);
      return {
        post,
        items: post.items.filter((i) => scan[i.id] !== 'people').map((i) => i.id),
        name: parsed.name,
        price: parsed.price ? String(parsed.price) : '',
        priceMax: parsed.priceMax,
        category: suggestCategory(post.caption, catalog.categories) ?? '',
        newCategory: '',
        stock: '5',
        hidden: !parsed.price,
      };
    }),
  );
  const [progress, setProgress] = useState<{ done: number; current: string } | null>(null);
  const [failures, setFailures] = useState<string[]>([]);

  const update = (i: number, patch: Partial<Draft>) => setDrafts((all) => all.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const problems = useMemo(
    () =>
      drafts.map((d) => {
        if (!d.items.length) return 'اختر صورة واحدة على الأقل';
        if (!d.name.trim()) return 'اكتب اسم المنتج';
        if (!d.category || (d.category === NEW_CATEGORY && !d.newCategory.trim())) return 'اختر القسم';
        return null;
      }),
    [drafts],
  );
  const ready = problems.every((p) => p === null);

  const run = async () => {
    const products: Product[] = [];
    const categories: Category[] = [];
    const slugs = new Set(catalog.products.map((p) => p.slug));
    const catSlugs = new Set(catalog.categories.map((c) => c.slug));
    const failed: string[] = [];

    for (const [i, d] of drafts.entries()) {
      setProgress({ done: i, current: d.name });
      try {
        const res = await instagramApi.fetch(d.post.id, d.items);
        const images = res.media.filter((m) => m.kind === 'image').map((m) => m.url);
        const videos = res.media.filter((m) => m.kind === 'video');
        const image = images[0] ?? videos.find((v) => v.poster)?.poster;
        if (!image) throw new Error('لا توجد صورة صالحة');
        const parsed = parseCaption(res.caption || d.post.caption);

        let category = d.category;
        if (category === NEW_CATEGORY) {
          const name = d.newCategory.trim();
          const existing = categories.find((c) => c.name === name);
          if (existing) category = existing.slug;
          else {
            category = uniqueSlug(slugify(name), catSlugs);
            catSlugs.add(category);
            categories.push({ slug: category, name, title: name, description: '', image });
          }
        }

        const name = d.name.trim();
        const slug = uniqueSlug(slugify(name), slugs);
        slugs.add(slug);
        const price = digits(d.price);
        products.push({
          id: newId('p'),
          slug,
          sku: `IG-${d.post.id.slice(-6)}`,
          name,
          shortName: name,
          category,
          summary: (parsed.paragraphs.find((p) => p !== parsed.name) ?? '').slice(0, 160),
          metal: parsed.material,
          price,
          stock: Math.max(0, digits(d.stock)),
          image,
          gallery: images.length ? images : [image],
          ...(videos.length ? { videos: videos.map((v) => v.url) } : {}),
          ...(parsed.swatches.length ? { swatches: parsed.swatches } : {}),
          source: `ig:${d.post.id}`,
          ...(res.permalink || d.post.permalink ? { sourceUrl: res.permalink || d.post.permalink } : {}),
          ...(d.hidden || !price ? { hidden: true } : {}),
          content: {
            description: parsed.paragraphs,
            specs: d.priceMax ? [{ label: 'السعر', value: `من ${formatNumber(price)} إلى ${formatNumber(d.priceMax)} د.ع حسب الموديل` }] : [],
          },
        });
      } catch (e) {
        failed.push(`${d.name || 'منشور'}: ${e instanceof Error ? e.message : 'خطأ'}`);
      }
    }
    setProgress({ done: drafts.length, current: '' });

    if (products.length) {
      const ok = await commit(
        (data) => ({ ...data, categories: [...data.categories, ...categories], products: [...data.products, ...products] }),
        `تم استيراد ${products.length} ${products.length === 1 ? 'منتج' : 'منتجات'} من إنستغرام`,
      );
      if (!ok) failed.push('تعذر حفظ المنتجات المستوردة؛ الصور رُفعت ويمكنك المحاولة مجدداً.');
    }
    setFailures(failed);
    setProgress(null);
    if (!failed.length) {
      onDone();
      navigate('/admin/products');
    } else if (products.length) toast.show(`استُورد ${products.length} وتعذر ${failed.length}`, 'error');
  };

  const busy = progress !== null;

  return (
    <Drawer
      open
      title={`مراجعة ${drafts.length} ${drafts.length === 1 ? 'منشور' : 'منشورات'} قبل الاستيراد`}
      onClose={busy ? () => undefined : onClose}
      footer={
        busy ? (
          <div className="flex flex-col gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-blush-surface">
              <div className="h-full rounded-full bg-imperial-burgundy transition-all" style={{ width: `${(progress.done / drafts.length) * 100}%` }} />
            </div>
            <p className="font-label-sm text-label-sm text-muted-rosewood">
              {progress.current ? `تنزيل صور «${progress.current}» (${progress.done + 1} من ${drafts.length})…` : 'حفظ المنتجات…'}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={onClose}>
              رجوع
            </Button>
            <Button icon="download" disabled={!ready} onClick={() => void run()}>
              استيراد {drafts.length} {drafts.length === 1 ? 'منتج' : 'منتجات'}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {failures.length > 0 && (
          <Notice tone="danger">
            <ul className="list-inside list-disc">
              {failures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Notice>
        )}
        <p className="font-body-sm text-body-sm text-muted-rosewood">
          الصور المعلَّمة بـ <Icon name="person" className="align-middle text-[14px] text-semantic-error" /> استبعدها الفحص التلقائي لأن فيها أشخاصاً — اضغط
          أي صورة لتضمينها أو استبعادها. المنتج بلا سعر يُستورد مخفياً (مسودة) حتى تكمل سعره.
        </p>
        {drafts.map((d, i) => (
          <fieldset key={d.post.id} disabled={busy} className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-luxury">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {d.post.items.map((item) => {
                const on = d.items.includes(item.id);
                const people = scan[item.id] === 'people';
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={on ? 'استبعاد هذه الصورة' : 'تضمين هذه الصورة'}
                    onClick={() => update(i, { items: on ? d.items.filter((x) => x !== item.id) : [...d.items, item.id] })}
                    className={cn('relative h-24 w-20 shrink-0 overflow-hidden rounded-xl', on ? 'ring-[3px] ring-imperial-burgundy' : 'opacity-40')}
                  >
                    <img src={item.preview} alt="" className="h-full w-full object-cover" />
                    {item.type === 'VIDEO' && <Icon name="smart_display" className="absolute bottom-1 right-1 text-[18px] text-white drop-shadow" />}
                    {people && (
                      <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-semantic-error text-white">
                        <Icon name="person" className="text-[13px]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="اسم المنتج" required>
                <input className={inputClass} value={d.name} maxLength={120} onChange={(e) => update(i, { name: e.target.value })} />
              </Field>
              <Field label="السعر (د.ع)" hint={d.priceMax ? `في المنشور: ${formatNumber(digits(d.price))}–${formatNumber(d.priceMax)} حسب الموديل` : undefined}>
                <input
                  className={inputClass}
                  dir="ltr"
                  inputMode="numeric"
                  value={d.price}
                  placeholder="بلا سعر = مسودة"
                  onChange={(e) => update(i, { price: e.target.value, hidden: !digits(e.target.value) || d.hidden })}
                />
              </Field>
              <Field label="القسم" required>
                <select className={inputClass} value={d.category} onChange={(e) => update(i, { category: e.target.value })}>
                  <option value="">اختر القسم…</option>
                  {catalog.categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                      {c.hidden ? ' (مخفي)' : ''}
                    </option>
                  ))}
                  {canCategories && <option value={NEW_CATEGORY}>+ قسم جديد…</option>}
                </select>
              </Field>
              {d.category === NEW_CATEGORY ? (
                <Field label="اسم القسم الجديد" required>
                  <input className={inputClass} value={d.newCategory} maxLength={80} placeholder="مثل: ساعات، ميداليات" onChange={(e) => update(i, { newCategory: e.target.value })} />
                </Field>
              ) : (
                <Field label="الكمية المتوفرة">
                  <input className={inputClass} dir="ltr" inputMode="numeric" value={d.stock} onChange={(e) => update(i, { stock: e.target.value })} />
                </Field>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Toggle checked={d.hidden} onChange={(hidden) => update(i, { hidden })} label="استيراد كمسودة مخفية" />
              {problems[i] && (
                <span className="flex items-center gap-1 font-label-sm text-label-sm text-semantic-error">
                  <Icon name="error" className="text-[14px]" />
                  {problems[i]}
                </span>
              )}
            </div>
          </fieldset>
        ))}
      </div>
    </Drawer>
  );
}
