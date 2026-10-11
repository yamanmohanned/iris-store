import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { MOBILE_CARD, MobileSectionTitle } from '@/components/mobile/MobilePage';
import { MOBILE_TOP_OFFSET, MobileTopBar, topBarButtonClass } from '@/components/mobile/MobileTopBar';
import { ProductRail } from '@/components/mobile/ProductRail';
import { badgeLabels, getCategory, getProduct, isProductVisible, useCatalog } from '@/data/catalog';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import NotFoundPage from '@/pages/store/system/NotFoundPage';
import { defaultSizeFor, genericContent, metalOptionsFor, remainingText } from '@/pages/store/product/productOptions';
import { MAX_QTY, useCart } from '@/state/cart';
import { useToast } from '@/state/toast';
import { useWishlist } from '@/state/wishlist';

/** صفحة المنتج على الهاتف (`/products/:slug`) — مربوطة بالكتالوج والسلة. */
export default function ProductMobile() {
  const { slug } = useParams();
  useCatalog();
  const product = getProduct(slug);
  if (!product || !isProductVisible(product)) return <NotFoundPage />;
  return <ProductMobileView key={product.id} product={product} />;
}

const SIZE_TITLES: Record<string, string> = {
  necklaces: 'طول السلسلة',
  rings: 'مقاس الخاتم',
  bracelets: 'مقاس السوار',
  earrings: 'المقاس',
  gifts: 'الخيار',
};

const METAL_SWATCH_BG: Record<string, string> = {
  gold: 'linear-gradient(135deg,#8A6620,#E9D49C)',
  white: 'linear-gradient(135deg,#B9BCC2,#F4F4F5)',
  rose: 'linear-gradient(135deg,#C98B7A,#F3D3C4)',
  silver: 'linear-gradient(135deg,#9EA2A8,#E7E8EA)',
  black: 'linear-gradient(135deg,#1F1F22,#55555B)',
};


function AccordionItem({ id, icon, title, defaultOpen, children }: { id: string; icon: string; title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-hairline-burgundy last:border-b-0">
      <button
        type="button"
        aria-controls={`acc-${id}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-right"
      >
        <span className="flex items-center gap-2.5 font-label-lg text-label-lg font-semibold text-deep-oxblood">
          <Icon name={icon} className="text-[19px] text-antique-gold" />
          {title}
        </span>
        <Icon name="expand_more" className={cn('text-[22px] text-muted-rosewood transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div id={`acc-${id}`} className="flex flex-col gap-2 pb-4 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
          {children}
        </div>
      )}
    </div>
  );
}

/** معرض صور قابل للسحب أفقياً مع مؤشر الصورة الحالية. */
function Gallery({ images, alt, badge }: { images: string[]; alt: string; badge?: string | null }) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (i !== index) setIndex(Math.max(0, Math.min(images.length - 1, i)));
  };
  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    // RTL: التمرير الأفقي سالب في المتصفحات الحديثة
    el.scrollTo({ left: -i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-wine-night shadow-[0_14px_36px_rgba(42,3,13,0.18)]">
      <div ref={scroller} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
        {images.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={i === 0 ? alt : `${alt} — صورة ${i + 1}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="aspect-[4/5] w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-ivory-canvas/90 px-3 py-1 font-label-sm text-label-sm font-bold text-imperial-burgundy backdrop-blur">
          {badge}
        </span>
      )}
      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={`الصورة ${i + 1} من ${images.length}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className="flex h-5 items-center px-0.5"
            >
              <span className={cn('h-1.5 rounded-full transition-all duration-300', i === index ? 'w-5 bg-champagne-gold' : 'w-1.5 bg-ivory-canvas/60')} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductMobileView({ product: p }: { product: Product }) {
  const cart = useCart();
  const toast = useToast();
  const wishlist = useWishlist();
  const { visibleProducts, settings } = useCatalog();
  const category = getCategory(p.category);

  const gallery = p.gallery.length ? p.gallery : [p.image];
  const metalOptions = useMemo(() => metalOptionsFor(p), [p]);
  const [metal, setMetal] = useState(metalOptions[0]?.label ?? p.metal);
  const [size, setSize] = useState(defaultSizeFor(p));
  const [qty, setQty] = useState(1);

  const soldOut = p.stock <= 0;
  const maxQty = Math.max(1, Math.min(MAX_QTY, p.stock));
  const liked = wishlist.has(p.id);
  const savingPct = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : null;
  const content = p.content ?? genericContent(p);
  const related = useMemo(
    () => visibleProducts.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 8),
    [p, visibleProducts],
  );
  const badgeText = soldOut ? 'نفد مؤقتاً' : savingPct ? `خصم ${savingPct}%` : p.badge && p.badge !== 'soldout' ? badgeLabels[p.badge] : null;
  const whatsapp = settings.whatsapp?.replace(/\D/g, '');
  const waText = encodeURIComponent(`مرحباً دار آيريس، أود الاستفسار عن ${p.shortName} (${p.sku})`);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: p.shortName, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
      toast.show('تم نسخ رابط القطعة', 'content_copy');
    } catch {
      /* ألغى المستخدم المشاركة */
    }
  };

  const toggleWishlist = () => {
    const nowLiked = wishlist.toggle(p.id);
    toast.show(nowLiked ? 'أُضيفت القطعة إلى المفضلة' : 'أُزيلت القطعة من المفضلة', 'favorite');
  };

  const addToCart = () => {
    if (soldOut) return;
    if (p.sizes?.length && !size) {
      toast.show('اختاري المقاس أولاً', 'straighten');
      return;
    }
    cart.add(p.id, qty, { metal, size });
    toast.show(`أُضيفت «${p.shortName}» إلى السلة`, 'shopping_bag');
  };

  const btn = topBarButtonClass(true);
  const shippingLine =
    settings.shippingFee <= 0
      ? 'خلال 1–4 أيام عمل · مجاناً'
      : settings.freeShippingThreshold > 0
        ? `مجاناً للطلبات فوق ${formatNumber(settings.freeShippingThreshold)} د.ع`
        : `خلال 1–4 أيام عمل · ${formatNumber(settings.shippingFee)} د.ع`;

  return (
    <div className="flex min-h-screen flex-col bg-ivory-canvas text-warm-ink">
      <MobileTopBar
        back={`/collections/${p.category}`}
        title={category?.name}
        end={
          <>
            <button type="button" aria-label="مشاركة" onClick={() => void share()} className={btn}>
              <Icon name="share" className="text-[21px]" />
            </button>
            <button
              type="button"
              aria-label={liked ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              aria-pressed={liked}
              onClick={toggleWishlist}
              className={btn}
            >
              <Icon name="favorite" fill={liked} className={cn('text-[22px]', liked && 'text-imperial-burgundy')} />
            </button>
          </>
        }
      />

      <main className={cn('flex-1 px-gutter-mobile pb-36', MOBILE_TOP_OFFSET)}>
        <div className="pt-3">
          <Gallery images={gallery} alt={p.shortName} badge={badgeText} />
        </div>

        {/* الاسم والسعر */}
        <section className="pt-5">
          <h1 className="font-headline-md text-headline-md font-semibold leading-snug text-deep-oxblood">{p.shortName}</h1>
          <p className="mt-1 font-body-sm text-body-sm text-muted-rosewood">{[...new Set([p.metal, p.summary].filter(Boolean))].join(' — ')}</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-headline-md text-headline-md font-bold text-imperial-burgundy tabular-nums">
              {formatNumber(p.price)} <span className="font-label-lg text-label-lg font-medium text-muted-rosewood">د.ع</span>
            </span>
            {p.oldPrice && p.oldPrice > p.price && (
              <span className="font-body-md text-body-md text-muted-rosewood line-through tabular-nums">{formatNumber(p.oldPrice)} د.ع</span>
            )}
            {savingPct !== null && (
              <span className="rounded-full bg-blush-surface px-2.5 py-0.5 font-label-sm text-label-sm font-bold text-imperial-burgundy">وفّري {savingPct}%</span>
            )}
          </div>
          <p className="mt-2 font-label-md text-label-md text-muted-rosewood">
            رقم القطعة: <span dir="ltr" className="tabular-nums">{p.sku}</span>
          </p>
        </section>

        {/* الخيارات */}
        <section className="mt-5 flex flex-col gap-5 border-t border-hairline-burgundy pt-5">
          {metalOptions.length > 0 && (
            <div>
              <p className="mb-2.5 font-label-lg text-label-lg font-semibold text-deep-oxblood">
                المعدن: <span className="font-medium text-antique-gold">{metal}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {metalOptions.map((m) => {
                  const on = m.label === metal;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setMetal(m.label)}
                      className={cn(
                        'flex min-h-[40px] items-center gap-2 rounded-full px-3.5 font-label-md text-label-md transition-all',
                        on
                          ? 'bg-blush-surface font-semibold text-deep-oxblood shadow-[0_0_0_1.5px_#4E1825]'
                          : 'bg-surface-container-lowest text-on-surface-variant shadow-[0_0_0_1px_rgba(78,24,37,0.14)]',
                      )}
                    >
                      <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: METAL_SWATCH_BG[m.key] ?? METAL_SWATCH_BG.gold }} />
                      {m.label.replace(/ عيار \d+$/, '')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!!p.sizes?.length && (
            <div>
              <p className="mb-2.5 font-label-lg text-label-lg font-semibold text-deep-oxblood">{SIZE_TITLES[p.category] ?? 'المقاس'}</p>
              <div className="flex flex-wrap gap-2">
                {p.sizes.map((s) => {
                  const on = s.label === size;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      disabled={s.soldOut}
                      aria-pressed={on}
                      onClick={() => setSize(s.label)}
                      className={cn(
                        'flex min-h-[44px] min-w-[64px] flex-col items-center justify-center rounded-xl px-3 py-1.5 font-label-md text-label-md transition-all',
                        s.soldOut
                          ? 'cursor-not-allowed bg-surface-container-high/60 text-muted-rosewood/60'
                          : on
                            ? 'bg-imperial-burgundy font-semibold text-ivory-canvas shadow-[0_4px_12px_rgba(78,24,37,0.22)]'
                            : 'bg-surface-container-lowest text-warm-ink shadow-[0_0_0_1px_rgba(78,24,37,0.14)]',
                      )}
                    >
                      <span className={cn(s.soldOut && 'line-through')}>{s.label}</span>
                      {(s.soldOut || s.note) && (
                        <span className={cn('font-label-sm text-[11px] font-normal', on ? 'text-champagne-gold' : 'text-muted-rosewood')}>
                          {s.soldOut ? 'نفد' : s.note}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {soldOut ? (
            <p className="flex items-center gap-2 rounded-xl bg-semantic-error-bg px-3.5 py-3 font-label-md text-label-md text-semantic-error">
              <Icon name="info" className="text-[18px]" /> نفدت هذه القطعة مؤقتاً — تواصلي معنا لحجزها.
            </p>
          ) : (
            p.stock <= 5 && (
              <p className="flex items-center gap-2 rounded-xl bg-semantic-warning-bg/70 px-3.5 py-3 font-label-md text-label-md text-semantic-warning">
                <Icon name="hourglass_top" className="text-[18px]" /> {remainingText(p.stock)}
              </p>
            )
          )}
        </section>

        {/* التوصيل */}
        <section className={cn(MOBILE_CARD, 'mt-5 flex flex-col gap-3')}>
          {[
            { icon: 'local_shipping', title: 'التوصيل لجميع المحافظات', text: shippingLine },
            { icon: 'payments', title: 'الدفع عند الاستلام', text: 'ادفعي نقداً بعد معاينة القطعة' },
            { icon: 'autorenew', title: 'استبدال خلال 7 أيام', text: 'بحالتها الأصلية مع العلبة والشهادة' },
          ].map((f) => (
            <div key={f.icon} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
                <Icon name={f.icon} className="text-[20px]" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-label-lg text-label-lg font-semibold text-deep-oxblood">{f.title}</span>
                <span className="font-label-md text-label-md text-muted-rosewood">{f.text}</span>
              </span>
            </div>
          ))}
        </section>

        {/* التفاصيل */}
        <section className={cn(MOBILE_CARD, 'mt-4 py-1')}>
          <AccordionItem id="desc" icon="diamond" title="وصف القطعة" defaultOpen>
            {content.description.map((para) => (
              <p key={para}>{para}</p>
            ))}
          </AccordionItem>
          <AccordionItem id="specs" icon="verified" title="المواصفات">
            <dl className="grid grid-cols-2 gap-2">
              {content.specs.map((s) => (
                <div key={s.label} className="rounded-lg bg-ivory-canvas p-2.5">
                  <dt className="font-label-sm text-label-sm text-antique-gold">{s.label}</dt>
                  <dd className="mt-0.5 font-label-md text-label-md font-medium text-warm-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </AccordionItem>
          <AccordionItem id="care" icon="auto_awesome" title="العناية بالقطعة">
            <p>• ضعي العطور ومستحضرات التجميل قبل ارتداء القطعة لتجنب الرواسب على المعدن والأحجار.</p>
            <p>• احفظيها في علبتها المخملية الأصلية لمنع الخدوش والتشابك.</p>
            <p>• امسحيها بقطعة قماش ناعمة وجافة بعد كل استخدام.</p>
          </AccordionItem>
          <AccordionItem id="ship" icon="local_shipping" title="التوصيل والاستبدال">
            <p>نوصل الطلبات إلى جميع المحافظات خلال 1–4 أيام عمل، مغلّفة في علبة الدار، والدفع نقداً عند الاستلام.</p>
            <p>الاستبدال متاح خلال 7 أيام من الاستلام إذا كانت القطعة بحالتها الأصلية مع العلبة والشهادة.</p>
          </AccordionItem>
        </section>

        {related.length > 0 && (
          <section className="mt-7">
            <MobileSectionTitle action={{ to: `/collections/${p.category}`, label: 'عرض القسم' }}>قد يعجبكِ أيضاً</MobileSectionTitle>
            <ProductRail products={related} />
          </section>
        )}
      </main>

      {/* شريط الإضافة الثابت */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-ivory-canvas/95 shadow-[0_-1px_0_rgba(78,24,37,0.08),0_-8px_24px_rgba(42,3,13,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[480px] items-center gap-2.5 px-gutter-mobile py-3">
          {!soldOut && (
            <div className="flex h-12 items-center rounded-xl bg-surface-container-lowest px-1 shadow-[0_0_0_1px_rgba(78,24,37,0.16)]">
              <button
                type="button"
                aria-label="زيادة الكمية"
                disabled={qty >= maxQty}
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="flex h-10 w-9 items-center justify-center text-imperial-burgundy disabled:opacity-30"
              >
                <Icon name="add" className="text-[20px]" />
              </button>
              <span aria-live="polite" className="w-6 text-center font-label-lg text-label-lg font-bold text-deep-oxblood tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                aria-label="إنقاص الكمية"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-10 w-9 items-center justify-center text-imperial-burgundy disabled:opacity-30"
              >
                <Icon name="remove" className="text-[20px]" />
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={soldOut}
            onClick={addToCart}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-imperial-burgundy px-4 font-label-lg text-label-lg font-semibold text-ivory-canvas shadow-[0_8px_20px_rgba(78,24,37,0.25)] transition-colors active:translate-y-px disabled:bg-surface-container-high disabled:text-muted-rosewood disabled:shadow-none"
          >
            <Icon name="shopping_bag" className="text-[20px] text-champagne-gold" />
            {soldOut ? 'نفدت حالياً' : <span className="tabular-nums">أضيفي للسلة · {formatNumber(p.price * qty)} د.ع</span>}
          </button>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              aria-label="استفسار عبر واتساب"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1F8F4E] text-white shadow-[0_6px_16px_rgba(31,143,78,0.3)]"
            >
              <WhatsAppIcon className="h-6 w-6" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
