import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { badgeLabels, getCategory, useCatalog } from '@/data/catalog';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { productMedia } from '@/lib/media';
import { MAX_QTY, useCart } from '@/state/cart';
import { readJSON, writeJSON } from '@/state/storage';
import { useToast } from '@/state/toast';
import { useWishlist } from '@/state/wishlist';
import { defaultSizeFor, genericContent, metalOptionsFor, remainingText, swatchStyle } from './productOptions';
import { WhatsAppLink } from '@/components/common/WhatsAppLink';

const RECENT_KEY = 'iris.recent.v1';

// مدد التوصيل كما في سياسة الشحن؛ الأجور واحدة لكل المحافظات وتأتي من إعدادات المالك
const CITIES = [{ label: 'بغداد — خلال 1–2 يوم عمل' }, { label: 'باقي المحافظات — خلال 2–4 أيام عمل' }];

function Accordion({ icon, title, defaultOpen, children }: { icon: string; title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl bg-blush-surface text-warm-ink shadow-sm transition-all duration-300">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-space-md text-right font-headline-sm text-headline-sm font-semibold text-warm-ink"
      >
        <span className="flex items-center gap-space-xs">
          <Icon name={icon} className="text-[22px] text-royal-gold" />
          <span>{title}</span>
        </span>
        <Icon name="expand_more" className={cn('transform text-royal-gold transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-space-md pb-space-md pt-0 font-body-md text-body-md leading-relaxed text-on-surface-variant">{children}</div>
      )}
    </div>
  );
}

/** صفحة تفاصيل المنتج (PDP) للديسكتوب. */
export function ProductView({ product: p }: { product: Product }) {
  const cart = useCart();
  const toast = useToast();
  const wishlist = useWishlist();
  const category = getCategory(p.category);

  const gallery = productMedia(p);
  const [index, setIndex] = useState(0);
  const metalOptions = useMemo(() => metalOptionsFor(p), [p]);
  const [metal, setMetal] = useState(metalOptions[0]?.label ?? p.metal);
  const [size, setSize] = useState(defaultSizeFor(p));
  const [qty, setQty] = useState(1);
  const [city, setCity] = useState(0);
  const [copied, setCopied] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const [stuck, setStuck] = useState(false);

  const soldOut = p.stock <= 0;
  const maxQty = Math.max(1, Math.min(MAX_QTY, p.stock));
  const liked = wishlist.has(p.id);
  const savingPct = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : null;
  const content = p.content ?? genericContent(p);
  const generic = genericContent(p);

  // «شاهدتَ مؤخراً»
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    const prev = readJSON<string[]>(RECENT_KEY, []);
    setRecentIds(prev.filter((id) => id !== p.id).slice(0, 3));
    writeJSON(RECENT_KEY, [p.id, ...prev.filter((id) => id !== p.id)].slice(0, 8));
  }, [p.id]);
  const { visibleProducts: products, settings } = useCatalog();
  const recent = recentIds.map((id) => products.find((x) => x.id === id)).filter((x): x is Product => !!x);
  const [recentHidden, setRecentHidden] = useState(false);

  // شريط الشراء الملتصق يظهر عند خروج زر الإضافة من الشاشة (للأعلى)
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [p.id]);

  const related = useMemo(
    () => products.filter((x) => x.id !== p.id && (x.category === p.category || x.badge === 'bestseller')).slice(0, 4),
    [p, products],
  );

  const addToCart = () => {
    if (soldOut) return;
    cart.add(p.id, qty, { metal, size });
    toast.show('أُضيفت القطعة إلى السلة الملكية', 'shopping_bag');
    cart.openDrawer();
  };

  const copySku = () => {
    void navigator.clipboard?.writeText(p.sku).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const pieceNo = p.sku.replace(/\D/g, '').replace(/^0+/, '') || p.sku;
  const waRaw = `مرحباً آيريس، أود طلب ${p.shortName} (${p.sku})`;
  const shown = gallery[Math.min(index, gallery.length - 1)];

  return (
    <main className="min-h-[calc(100vh-64px)] w-full">
      {stuck && (
        <section
          aria-label="شريط الشراء السريع الملتصق"
          className="fixed inset-x-0 top-[66px] z-40 w-full bg-ivory-canvas shadow-[0_12px_32px_rgba(42,3,13,0.12)]"
        >
          <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-space-md px-gutter">
            <div className="flex min-w-0 items-center gap-space-md">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-deep-oxblood shadow-sm">
                <img className="h-full w-full object-cover" src={p.image} alt={p.shortName} />
              </div>
              <div className="flex min-w-0 flex-col justify-center">
                <div className="flex items-center gap-space-xs">
                  <h2 className="truncate font-headline-sm text-headline-sm font-semibold leading-tight text-warm-ink">{p.shortName}</h2>
                  <span className="font-body-sm text-body-sm leading-tight text-antique-gold">— {p.metal}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-space-sm">
                  <span className="font-label-sm text-label-sm tracking-wider text-muted-rosewood">SKU: {p.sku}</span>
                  {!soldOut && p.stock <= 5 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-semantic-success-bg px-2 py-0.5 font-label-sm text-label-sm text-semantic-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-semantic-success" />
                      <span>{remainingText(p.stock)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-space-lg lg:flex">
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-md text-headline-md font-bold leading-none text-imperial-burgundy tabular-nums">
                  {formatNumber(p.price)}
                </span>
                <span className="font-label-md text-label-md font-medium leading-none text-imperial-burgundy">د.ع</span>
                {p.oldPrice && (
                  <span className="mr-1.5 font-body-sm text-body-sm text-muted-rosewood line-through">{formatNumber(p.oldPrice)} د.ع</span>
                )}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blush-surface px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-royal-gold" />
                <span className="font-label-sm text-label-sm font-medium text-deep-oxblood">
                  {metal}
                  {size ? ` / ${size}` : ''}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-space-sm">
              <div className="hidden items-center rounded-lg bg-surface-container p-0.5 sm:flex">
                <button
                  type="button"
                  aria-label="إنقاص الكمية"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center text-body-md font-semibold text-warm-ink hover:text-imperial-burgundy"
                >
                  −
                </button>
                <span className="w-7 select-none text-center font-label-md text-label-md font-bold text-warm-ink tabular-nums">{qty}</span>
                <button
                  type="button"
                  aria-label="زيادة الكمية"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className="flex h-8 w-8 items-center justify-center text-body-md font-semibold text-warm-ink hover:text-imperial-burgundy"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                disabled={soldOut}
                onClick={addToCart}
                className="flex h-11 w-[160px] items-center justify-center gap-space-xs rounded-[10px] bg-primary-container font-label-lg text-label-lg font-semibold text-ivory-canvas shadow-[0_4px_16px_rgba(78,24,37,0.22)] transition-colors hover:bg-burgundy-600 active:translate-y-px disabled:opacity-50"
              >
                <Icon name="shopping_bag" className="text-[18px]" />
                <span>أضف للسلة</span>
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="flex w-full flex-col text-on-surface">
        <div className="flex w-full items-center justify-center bg-blush-surface/60 py-space-sm">
          <div className="flex w-full max-w-[1280px] items-center gap-space-md px-gutter">
            <div className="h-px flex-1 bg-royal-gold/30" />
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm tracking-widest text-royal-gold">
              <span>◆</span> <span>التفاصيل تصنع الفرق</span> <span>◆</span>
            </div>
            <div className="h-px flex-1 bg-royal-gold/30" />
          </div>
        </div>

        <section className="mx-auto w-full max-w-[1280px] px-gutter pb-space-3xl pt-space-xl">
          <div className="mb-space-lg flex flex-wrap items-center justify-between gap-space-sm font-body-sm text-body-sm text-muted-rosewood">
            <nav aria-label="مسار التصفح" className="flex items-center gap-space-xs">
              <Link to="/" className="transition-colors hover:text-primary">
                الرئيسية
              </Link>
              <span className="text-[10px] text-royal-gold/60">‹</span>
              <Link to={`/collections/${p.category}`} className="transition-colors hover:text-primary">
                {category?.name ?? 'المنتجات'}
              </Link>
              <span className="text-[10px] text-royal-gold/60">‹</span>
              <span className="font-medium text-warm-ink">{p.shortName}</span>
            </nav>
            <div className="flex items-center gap-space-md font-label-sm text-label-sm text-muted-rosewood">
              <span className="flex items-center gap-1">
                <Icon name="local_shipping" className="text-[16px] text-royal-gold" /> <span>توصيل لكل المحافظات</span>
              </span>
              <span className="text-royal-gold/30">|</span>
              <span className="flex items-center gap-1">
                <Icon name="payments" className="text-[16px] text-royal-gold" /> <span>الدفع عند الاستلام</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
            {/* ── المعرض ── */}
            <div className="sticky top-24 flex flex-col-reverse gap-space-md md:flex-row lg:col-span-7">
              <div className="flex shrink-0 gap-space-sm overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
                {gallery.map((m, i) => (
                  <button
                    key={m.src + i}
                    type="button"
                    aria-label={m.kind === 'video' ? `تشغيل الفيديو ${i + 1}` : `عرض الصورة ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={cn(
                      'group relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-deep-oxblood shadow-sm transition-all duration-200',
                      i === index ? 'shadow-md ring-2 ring-royal-gold' : 'hover:shadow-md hover:ring-1 hover:ring-royal-gold/50',
                    )}
                  >
                    <img
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      src={m.poster}
                      alt=""
                    />
                    {m.kind === 'video' && (
                      <Icon
                        name="play_circle"
                        fill
                        className="absolute inset-0 m-auto h-fit w-fit text-[30px] text-ivory-canvas/90 drop-shadow"
                      />
                    )}
                    <span className="absolute bottom-1 right-1.5 font-label-sm text-[0.625rem] font-medium text-champagne-gold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </button>
                ))}
                {gallery.length > 1 && (
                  <div className="hidden flex-col items-center gap-1 pt-space-xs text-royal-gold md:flex">
                    <span className="font-mono font-label-sm text-[0.7rem] tracking-widest text-muted-rosewood tabular-nums">
                      {String(index + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}
                    </span>
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="الصورة السابقة"
                        onClick={() => setIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-blush-surface text-warm-ink shadow-sm transition-colors hover:bg-parchment"
                      >
                        <Icon name="expand_less" className="text-[14px]" />
                      </button>
                      <button
                        type="button"
                        aria-label="الصورة التالية"
                        onClick={() => setIndex((i) => (i + 1) % gallery.length)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-blush-surface text-warm-ink shadow-sm transition-colors hover:bg-parchment"
                      >
                        <Icon name="expand_more" className="text-[14px]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div
                className="group relative flex min-h-[580px] flex-1 items-center justify-center overflow-hidden rounded-b-2xl rounded-t-[140px] bg-deep-oxblood shadow-2xl lg:min-h-[640px]"
                style={{ boxShadow: '0 16px 40px rgba(42,3,13,0.18)' }}
              >
                <div className="pointer-events-none absolute inset-2 z-20 rounded-b-xl rounded-t-[132px] shadow-[inset_0_0_0_1px_rgba(201,162,75,0.35)]" />
                <div className="pointer-events-none absolute inset-3 z-20 rounded-b-lg rounded-t-[128px] shadow-[inset_0_0_0_1px_rgba(201,162,75,0.15)]" />
                <div className="relative h-full min-h-[580px] w-full overflow-hidden lg:min-h-[640px]">
                  {shown?.kind === 'video' ? (
                    <video
                      key={shown.src}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      src={shown.src}
                      poster={shown.poster}
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                      aria-label={`فيديو ${p.name}`}
                    />
                  ) : (
                    <img
                      className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                      src={shown?.src}
                      alt={p.name}
                    />
                  )}
                </div>
                <div className="absolute inset-x-6 bottom-6 z-30 flex items-center justify-between rounded-xl bg-wine-night/90 px-space-md py-space-sm text-champagne-gold shadow-lg shadow-wine-night/40 backdrop-blur-md">
                  <div className="flex items-center gap-space-xs">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-royal-gold" />{' '}
                    <span className="font-label-sm text-label-sm text-champagne-gold">آيريس ستور · صور حقيقية للقطعة</span>
                  </div>
                  <span className="font-mono font-label-sm text-[0.75rem] tracking-wider text-champagne-gold/70">{p.sku}</span>
                </div>
              </div>
            </div>

            {/* ── صندوق الشراء ── */}
            <div className="flex flex-col gap-space-md lg:col-span-5">
              <div className="flex flex-wrap items-center gap-space-xs">
                {p.badge === 'new' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-parchment px-3 py-1 font-label-sm text-label-sm font-semibold text-antique-gold shadow-sm">
                    <span className="text-xs text-royal-gold">✦</span> <span>جديد</span>
                  </span>
                )}
                {(p.badge === 'limited' || p.badge === 'exclusive' || p.badge === 'bestseller') && !soldOut && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blush-surface px-3 py-1 font-label-sm text-label-sm font-medium text-imperial-burgundy shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-imperial-burgundy" /> <span>{badgeLabels[p.badge]}</span>
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 font-label-sm text-label-sm font-medium',
                    soldOut ? 'bg-surface-container-high text-muted-rosewood' : 'bg-semantic-success-bg text-semantic-success',
                  )}
                >
                  {soldOut ? 'نفد مؤقتاً' : 'متوفر'}
                </span>
              </div>

              <div className="flex flex-col gap-space-xs">
                <h1 className="font-headline-xl text-headline-xl leading-tight text-warm-ink">{p.name}</h1>
                <div className="flex items-center justify-between pt-1 text-muted-rosewood">
                  <div className="flex items-center gap-space-sm font-mono text-body-sm">
                    <span className="font-semibold text-warm-ink">القطعة: {pieceNo}</span> <span className="text-royal-gold/40">·</span>{' '}
                    <span>SKU: {p.sku}</span>
                  </div>
                  <button
                    type="button"
                    onClick={copySku}
                    className="flex items-center gap-1 rounded px-2 py-1 font-label-sm text-label-sm text-royal-gold transition-colors hover:bg-blush-surface hover:text-antique-gold"
                    title="نسخ رمز القطعة"
                  >
                    <Icon name={copied ? 'check' : 'content_copy'} className="text-[15px]" />{' '}
                    <span>{copied ? 'تم النسخ' : 'نسخ الرمز'}</span>
                  </button>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 py-1">
                <div className="h-px flex-1 bg-royal-gold/30" />
                <span className="text-[10px] text-royal-gold">◆</span>
                <div className="h-px flex-1 bg-royal-gold/30" />
              </div>

              <div className="flex flex-wrap items-baseline gap-space-md py-space-xs">
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-display-lg text-[2.75rem] font-bold leading-none text-warm-ink tabular-nums">
                    {formatNumber(p.price)}
                  </span>
                  <span className="font-headline-sm text-headline-sm font-semibold text-antique-gold">د.ع</span>
                </div>
                {p.oldPrice && p.oldPrice > p.price && (
                  <div className="flex items-center gap-space-sm">
                    <span className="font-body-lg text-body-lg text-muted-rosewood line-through decoration-muted-rosewood/60 tabular-nums">
                      {formatNumber(p.oldPrice)} د.ع
                    </span>
                    {savingPct && (
                      <span className="rounded-full bg-blush-surface px-2 py-0.5 font-label-sm text-label-sm font-bold text-imperial-burgundy shadow-sm">
                        وفر {savingPct}%
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="-mt-space-xs font-label-sm text-label-sm text-muted-rosewood">تُضاف أجور التوصيل عند إتمام الطلب.</p>

              <div className="rounded-xl bg-blush-surface/70 p-space-md text-on-surface shadow-sm">
                <p className="font-body-md text-body-md leading-relaxed text-warm-ink">{content.description[0]}</p>
              </div>

              {metalOptions.length > 0 && (
                <div className="flex flex-col gap-space-xs pt-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md font-semibold text-warm-ink">
                      اللون: <span className="font-normal text-antique-gold">{metal}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-space-md pt-1">
                    {metalOptions.map((m) => {
                      const on = metal === m.label;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setMetal(m.label)}
                          className={cn(
                            'group flex items-center gap-space-xs rounded-xl px-3 py-2 transition-all',
                            on
                              ? 'bg-parchment shadow-md ring-2 ring-royal-gold'
                              : 'bg-surface-container-low shadow-sm hover:bg-blush-surface',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr shadow-inner',
                              m.gradient,
                            )}
                            style={swatchStyle(m)}
                          >
                            {on && <span className="h-2 w-2 rounded-full bg-imperial-burgundy opacity-80" />}
                          </span>
                          <span
                            className={cn(
                              'font-label-sm text-label-sm',
                              on ? 'font-semibold text-warm-ink' : 'font-medium text-muted-rosewood group-hover:text-warm-ink',
                            )}
                          >
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {p.sizes && p.sizes.length > 0 && (
                <div className="flex flex-col gap-space-xs pt-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md font-semibold text-warm-ink">
                      {p.category === 'rings' ? 'المقاس: ' : p.category === 'bracelets' ? 'محيط السوار: ' : 'طول السلسلة: '}
                      <span className="font-normal text-primary">{size ?? 'اختاري المقاس'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        toast.show(
                          'دليل المقاسات: 40 سم يلتف حول قاعدة الرقبة، 45 سم يتدلى فوق الترقوة، 50 سم أسفل فتحة الصدر.',
                          'straighten',
                        )
                      }
                      className="flex items-center gap-1 font-label-sm text-label-sm font-medium text-antique-gold transition-colors hover:text-royal-gold"
                    >
                      <Icon name="straighten" className="text-[15px]" /> <span>دليل المقاسات</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-space-sm pt-1 sm:grid-cols-3">
                    {p.sizes.map((s) => {
                      const on = size === s.label;
                      return (
                        <button
                          key={s.label}
                          type="button"
                          disabled={s.soldOut}
                          aria-pressed={on}
                          onClick={() => setSize(s.label)}
                          className={cn(
                            'rounded-xl px-space-sm py-2.5 text-center font-label-md text-label-md transition-all',
                            s.soldOut
                              ? 'cursor-not-allowed overflow-hidden bg-surface-dim/60 text-muted-rosewood/40 opacity-60'
                              : on
                                ? 'bg-blush-surface text-imperial-burgundy shadow-md ring-2 ring-imperial-burgundy'
                                : 'bg-surface-container-low text-warm-ink shadow-sm hover:bg-blush-surface',
                          )}
                        >
                          <span className={cn('block', s.soldOut ? 'font-medium line-through' : on ? 'font-bold' : 'font-semibold')}>
                            {s.label}
                          </span>
                          {(s.note || s.soldOut) && (
                            <span
                              className={cn(
                                'block font-label-sm text-[0.6875rem]',
                                s.soldOut ? 'font-semibold text-error' : on ? 'text-primary' : 'text-muted-rosewood',
                              )}
                            >
                              {s.soldOut ? 'نفد حالياً' : s.note}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-space-md pt-space-xs">
                <div className="flex items-center rounded-xl bg-parchment p-1 shadow-sm">
                  <button
                    type="button"
                    aria-label="إنقاص الكمية"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-warm-ink transition-colors hover:bg-ivory-canvas hover:text-primary active:scale-95"
                  >
                    <Icon name="remove" className="text-[16px]" />
                  </button>
                  <span className="w-12 text-center font-mono font-headline-sm text-headline-sm font-bold text-warm-ink tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="زيادة الكمية"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-warm-ink transition-colors hover:bg-ivory-canvas hover:text-primary active:scale-95"
                  >
                    <Icon name="add" className="text-[16px]" />
                  </button>
                </div>
                {!soldOut && p.stock <= 5 && (
                  <div className="flex flex-1 items-center gap-space-xs rounded-xl bg-semantic-warning-bg px-space-sm py-2 text-semantic-warning shadow-sm">
                    <span className="h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-semantic-warning" />
                    <span className="font-label-sm text-label-sm font-medium">
                      <strong>{remainingText(p.stock)}</strong>
                    </span>
                  </div>
                )}
              </div>

              <button
                ref={ctaRef}
                type="button"
                disabled={soldOut}
                onClick={addToCart}
                className="group relative flex w-full items-center justify-center gap-space-sm overflow-hidden rounded-xl bg-imperial-burgundy px-space-lg py-4 font-headline-sm text-headline-sm font-semibold text-ivory-canvas shadow-xl transition-all duration-300 hover:bg-burgundy-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                style={{ boxShadow: '0 10px 25px rgba(78, 24, 37, 0.35)' }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_1px_rgba(201,162,75,0.45)]" />
                <Icon name="shopping_bag" className="text-[24px] text-champagne-gold" />
                <span className="tracking-wide">{soldOut ? 'نفد مؤقتاً' : 'أضف إلى السلة'}</span>
                {!soldOut && (
                  <span className="font-mono text-sm font-normal text-champagne-gold/80">| {formatNumber(p.price * qty)} د.ع</span>
                )}
              </button>

              <div className="grid grid-cols-2 gap-space-sm">
                <WhatsAppLink
                  className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-space-sm py-3 font-label-md text-label-md font-medium text-warm-ink shadow-sm transition-all hover:bg-blush-surface active:translate-y-px"
                  text={waRaw}
                >
                  <Icon name="chat" className="text-[20px] text-[#25D366]" /> <span>اطلب عبر واتساب</span>
                </WhatsAppLink>
                <button
                  type="button"
                  onClick={() => {
                    const added = wishlist.toggle(p.id);
                    toast.show(added ? 'أُضيفت القطعة إلى المفضلة' : 'أُزيلت القطعة من المفضلة', 'favorite');
                  }}
                  aria-pressed={liked}
                  className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-space-sm py-3 font-label-md text-label-md font-medium text-warm-ink shadow-sm transition-all hover:bg-blush-surface active:translate-y-px"
                >
                  <Icon name="favorite" fill={liked} className={cn('text-[20px]', liked ? 'text-error' : 'text-burgundy-600')} />
                  <span>{liked ? 'في المفضلة' : 'أضف إلى المفضلة'}</span>
                </button>
              </div>

              <div className="flex flex-col gap-space-sm rounded-2xl bg-parchment p-space-md text-warm-ink shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs font-headline-sm text-headline-sm font-semibold text-warm-ink">
                    <Icon name="local_shipping" className="text-[22px] text-royal-gold" /> <span>التوصيل لجميع المحافظات</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm font-medium text-muted-rosewood" htmlFor="city-select">
                    مدة التوصيل:
                  </label>
                  <div className="relative">
                    <select
                      id="city-select"
                      value={city}
                      onChange={(e) => setCity(Number(e.target.value))}
                      className="w-full cursor-pointer appearance-none rounded-xl border-0 bg-ivory-canvas py-2.5 pl-10 pr-space-md font-body-sm text-body-sm text-warm-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-imperial-burgundy"
                    >
                      {CITIES.map((c, i) => (
                        <option key={c.label} value={i}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <Icon name="expand_more" className="pointer-events-none absolute left-3 top-2.5 text-[20px] text-muted-rosewood" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-blush-surface px-3 py-2 font-label-sm text-label-sm text-warm-ink">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Icon name="payments" className="text-[17px] text-royal-gold" />
                    <span>
                      أجور التوصيل: <strong>{settings.shippingFee > 0 ? `${formatNumber(settings.shippingFee)} د.ع` : 'مجاناً'}</strong>
                    </span>
                  </span>
                  {settings.freeShippingThreshold > 0 && (
                    <span className="font-medium text-antique-gold">مجاناً فوق {formatNumber(settings.freeShippingThreshold)} د.ع</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-space-sm pt-space-xs sm:grid-cols-3">
                {[
                  ['local_shipping', 'توصيل لكل المحافظات', 'خلال 1–4 أيام عمل'],
                  ['verified_user', 'الدفع عند الاستلام', 'معاينة القطعة قبل السداد'],
                  ['published_with_changes', 'استبدال خلال 7 أيام', 'بحالتها الأصلية'],
                ].map(([icon, title, note]) => (
                  <div key={title} className="flex items-start gap-space-xs rounded-xl bg-ivory-canvas p-2.5 shadow-sm">
                    <Icon name={icon} className="mt-0.5 shrink-0 text-[20px] text-royal-gold" />
                    <div>
                      <p className="font-label-sm text-label-sm font-semibold text-warm-ink">{title}</p>
                      <p className="font-body-sm text-[0.75rem] leading-tight text-muted-rosewood">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex w-full items-center justify-center py-space-xl">
          <div className="flex w-full max-w-[1280px] items-center gap-space-md px-gutter">
            <div className="h-px flex-1 bg-royal-gold/30" />
            <div className="flex items-center gap-2 text-royal-gold">
              <span className="text-xs">◆</span>{' '}
              <span className="font-headline-sm text-headline-sm font-semibold text-antique-gold">تفاصيل القطعة</span>{' '}
              <span className="text-xs">◆</span>
            </div>
            <div className="h-px flex-1 bg-royal-gold/30" />
          </div>
        </div>

        <section className="mx-auto w-full max-w-[1280px] px-gutter pb-space-3xl">
          <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
            {(content.story || content.certificate) && (
              <div className="flex flex-col gap-space-md lg:col-span-5">
                {content.story && (
                  <div className="relative overflow-hidden rounded-2xl bg-deep-oxblood p-space-xl text-champagne-gold shadow-xl">
                    <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-royal-gold/10 blur-3xl" />
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-champagne-gold/75">
                      {content.story.eyebrow}
                    </span>
                    <h2 className="mb-space-sm mt-space-xs font-headline-lg text-headline-lg font-bold leading-snug text-champagne-gold">
                      {content.story.title}
                    </h2>
                    <p className="mb-space-md font-body-md text-body-md leading-relaxed text-champagne-gold/80">{content.story.body}</p>
                    <div className="flex items-center gap-space-sm rounded-xl bg-wine-night/60 p-space-sm shadow-inner">
                      <Icon name="award_star" className="text-[28px] text-royal-gold" />
                      <div>
                        <h3 className="font-label-md text-label-md font-semibold text-champagne-gold">{content.story.hallmarkTitle}</h3>
                        <p className="font-label-sm text-label-sm text-champagne-gold/70">{content.story.hallmarkNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
                {content.certificate && (
                  <div className="flex items-center justify-between rounded-2xl bg-parchment p-space-md shadow-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory-canvas text-royal-gold shadow-sm">
                        <Icon name="diamond" className="text-[26px]" />
                      </div>
                      <div>
                        <h4 className="font-label-md text-label-md font-semibold text-warm-ink">{content.certificate.title}</h4>
                        <p className="font-body-sm text-body-sm text-muted-rosewood">{content.certificate.note}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blush-surface px-3 py-1 font-label-sm text-label-sm font-semibold text-imperial-burgundy">
                      {content.certificate.badge}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div
              className={cn(
                'flex flex-col gap-space-sm',
                content.story || content.certificate ? 'lg:col-span-7' : 'lg:col-span-8 lg:col-start-3',
              )}
            >
              <Accordion icon="auto_stories" title="وصف القطعة" defaultOpen>
                {content.description.map((para, i) => (
                  <p key={i} className={i < content.description.length - 1 ? 'mb-space-xs' : undefined}>
                    {para}
                  </p>
                ))}
              </Accordion>
              <Accordion icon="tune" title="المواصفات">
                <div className="grid grid-cols-1 gap-space-sm pt-2 font-body-sm text-body-sm sm:grid-cols-2">
                  {(content.specs ?? generic.specs).map((s) => (
                    <div key={s.label} className="rounded-lg bg-ivory-canvas p-space-xs">
                      <span className="block font-label-sm text-muted-rosewood">{s.label}</span>{' '}
                      <span className="font-semibold text-warm-ink">{s.value}</span>
                    </div>
                  ))}
                </div>
              </Accordion>
              <Accordion icon="spa" title="العناية بالقطعة">
                <ul className="flex list-inside list-disc flex-col gap-space-xs font-body-sm text-body-sm">
                  <li>احفظي القطعة جافة ومنفصلة عن غيرها حتى لا تحتك بالقطع الأخرى.</li>
                  <li>تجنبي تعريض القطعة مباشرة للعطور المركزة، مثبتات الشعر، أو المنظفات الكيميائية المنزلية.</li>
                  <li>للتنظيف امسحيها بقطعة قماش ناعمة جافة، أو بماء فاتر مع صابون لطيف ثم جففيها جيداً.</li>
                </ul>
              </Accordion>
              <Accordion icon="verified" title="التوصيل والاستبدال">
                <p className="mb-2 font-body-sm text-body-sm">
                  نوصل إلى جميع المحافظات خلال 1–4 أيام عمل، ويمكنكِ معاينة القطعة مع المندوب قبل دفع المبلغ نقداً.
                </p>
                <p className="font-body-sm text-body-sm">
                  الاستبدال متاح خلال 7 أيام من الاستلام إذا كانت القطعة بحالتها الأصلية ومع تغليفها.
                </p>
              </Accordion>
            </div>
          </div>
        </section>

        <div className="flex w-full items-center justify-center">
          <div className="flex w-full max-w-[1280px] items-center gap-space-md px-gutter">
            <div className="h-px flex-1 bg-royal-gold/30" />
            <span className="text-sm text-royal-gold">◆</span>
            <div className="h-px flex-1 bg-royal-gold/30" />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mx-auto w-full max-w-[1280px] px-gutter py-space-2xl">
            <div className="mb-space-xl flex flex-col justify-between gap-space-sm md:flex-row md:items-end">
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-antique-gold">مجموعات منتقاة بعناية</span>
                <h2 className="mt-1 font-headline-lg text-headline-lg font-bold text-warm-ink">قطع متناسقة قد تنال إعجابكِ</h2>
              </div>
              <Link
                to={`/collections/${p.category}`}
                className="group flex items-center gap-1 font-label-md text-label-md font-semibold text-imperial-burgundy hover:text-burgundy-600"
              >
                <span>استعراض كافة {category?.name ?? 'القطع'}</span>
                <Icon name="arrow_left_alt" className="text-[18px] transition-transform group-hover:-translate-x-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <div
                  key={r.id}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-deep-oxblood">
                    <Link to={`/products/${r.slug}`} className="absolute inset-0">
                      <img
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={r.image}
                        alt={r.shortName}
                        loading="lazy"
                      />
                    </Link>
                    {r.badge && r.badge !== 'soldout' && (
                      <span className="absolute right-3 top-3 rounded-full bg-parchment/95 px-2.5 py-1 font-label-sm text-[11px] font-bold text-antique-gold shadow-sm">
                        {r.badge === 'new'
                          ? 'جديد'
                          : r.badge === 'sale'
                            ? 'تخفيض'
                            : r.badge === 'bestseller'
                              ? 'الأكثر طلباً'
                              : 'إصدار محدود'}
                      </span>
                    )}
                    {r.stock > 0 && (
                      <button
                        type="button"
                        title="إضافة سريعة للسلة"
                        onClick={() => {
                          cart.add(r.id, 1, { metal: r.metal });
                          cart.openDrawer();
                        }}
                        className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-wine-night/90 text-champagne-gold opacity-0 shadow-lg transition-opacity hover:bg-imperial-burgundy active:scale-95 group-hover:opacity-100"
                      >
                        <Icon name="shopping_bag" className="text-[20px]" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-space-xs p-space-md">
                    <div>
                      <span className="font-label-sm text-[0.7rem] text-muted-rosewood">{r.metal}</span>
                      <h3 className="line-clamp-1 font-headline-sm text-[1.125rem] font-bold text-warm-ink transition-colors group-hover:text-imperial-burgundy">
                        <Link to={`/products/${r.slug}`}>{r.shortName}</Link>
                      </h3>
                    </div>
                    <div className="flex items-baseline justify-between pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline-sm text-headline-sm font-bold text-warm-ink tabular-nums">
                          {formatNumber(r.price)}
                        </span>
                        <span className="font-label-sm text-antique-gold">د.ع</span>
                      </div>
                      {r.oldPrice && <span className="text-xs text-muted-rosewood line-through">{formatNumber(r.oldPrice)} د.ع</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section className="mx-auto w-full max-w-[1280px] px-gutter pb-space-3xl">
            <div className="flex flex-col gap-space-md border-t border-royal-gold/20 pt-space-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <Icon name="history" className="text-[20px] text-royal-gold" />
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-warm-ink">شاهدتَ مؤخراً</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRecentHidden((h) => !h)}
                  className="font-label-sm text-label-sm text-muted-rosewood transition-colors hover:text-warm-ink"
                >
                  {recentHidden ? 'إظهار السجل' : 'إخفاء السجل'}
                </button>
              </div>
              {!recentHidden && (
                <div className="grid grid-cols-1 gap-space-md md:grid-cols-3">
                  {recent.map((r) => (
                    <Link
                      key={r.id}
                      to={`/products/${r.slug}`}
                      className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm shadow-sm transition-colors hover:bg-blush-surface"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-deep-oxblood">
                        <img className="h-full w-full object-cover" src={r.image} alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-label-md text-label-md font-semibold text-warm-ink">{r.shortName}</p>
                        <p className="font-label-sm text-label-sm text-antique-gold tabular-nums">{formatNumber(r.price)} د.ع</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
