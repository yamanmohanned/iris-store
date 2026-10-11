import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { WhatsAppLink } from '@/components/common/WhatsAppLink';
import { getCatalog, normalizeArabic } from '@/data/catalog';
import { faqGroups } from '@/data/faq';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { remainingText } from '@/pages/store/product/productOptions';
import { useUi } from '@/state/ui';

interface Message {
  id: number;
  from: 'staff' | 'customer';
  text: string;
  time: string;
  product?: Product;
  /** اقتراح متابعة السؤال مع فريق الدار على واتساب */
  handoff?: boolean;
  /** رابط داخلي (مثل نتائج البحث) */
  link?: { to: string; label: string };
}

const QUICK_REPLIES = ['كم يستغرق التوصيل؟', 'ما طرق الدفع؟', 'سياسة الاستبدال', 'تتبع طلبي'];

const nowLabel = () => new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { hour: 'numeric', minute: '2-digit' }).format(new Date());

/** كلمات مفتاحية → سؤال من الأسئلة الشائعة (src/data/faq.ts) */
const INTENTS: Array<[RegExp, string]> = [
  [/تتبع|طلبي|رقم الطلب|وين طلب/, 'كيف أتابع طلبي؟'],
  [/استبدال|ارجاع|استرجاع|ترجيع|تبديل/, 'ما سياسة الاستبدال؟'],
  [/اجور|سعر التوصيل|كلفه|رسوم/, 'كم أجور التوصيل؟'],
  [/توصيل|شحن|يوصل|توصلون|محافظ/, 'كم يستغرق التوصيل؟'],
  [/دفع|زين|كاش|بطاق|فيزا|ماستر/, 'ما طرق الدفع المتاحة؟'],
  [/قسيمه|كوبون|خصم|كود/, 'كيف أستخدم قسيمة الخصم؟'],
  [/مقاس|قياس/, 'كيف أعرف مقاسي؟'],
  [/هديه|تغليف|اهداء/, 'هل القطع مغلّفة للإهداء؟'],
  [/دمغ|اصلي|عيار|شهاد/, 'هل الذهب مدموغ؟'],
  [/عنايه|تنظيف|يتغير لون/, 'كيف أعتني بمجوهراتي؟'],
];

/** ردود آلية صادقة: من الأسئلة الشائعة ومن مخزون الكتالوج الفعلي، وإلا تحويل لواتساب الدار. */
function autoReply(text: string): Pick<Message, 'text' | 'product' | 'handoff' | 'link'> {
  const q = normalizeArabic(text.replace(/[؟?]/g, ''));
  const faq = faqGroups(getCatalog().settings).flatMap((g) => g.items);
  const intent = INTENTS.find(([re]) => re.test(q));
  const item = intent && faq.find((i) => i.q === intent[1]);
  if (item) return { text: item.a };

  // المنتج: كلمات السؤال مقابل اسم القطعة ورمزها فقط (الوصف يطابق كلمات عامة مثل «تصميم»)
  const words = q.split(' ').filter((w) => w.length > 2);
  const scored = getCatalog()
    .visibleProducts.map((p) => {
      const name = normalizeArabic(`${p.name} ${p.shortName} ${p.sku}`);
      return { p, score: words.filter((w) => name.includes(w)).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best && scored.filter((x) => x.score === best.score).length > 1) {
    const terms = words.filter((w) => normalizeArabic(best.p.name).includes(w)).join(' ');
    return { text: 'لدينا أكثر من قطعة تناسب سؤالكِ، اطّلعي عليها في نتائج البحث.', link: { to: `/search?q=${encodeURIComponent(terms)}`, label: 'عرض النتائج' } };
  }
  if (best) {
    const match = best.p;
    const stock =
      match.stock <= 0
        ? 'نفدت مؤقتاً. راسلينا لنُعلمكِ عند توفرها.'
        : `متوفرة حالياً${match.stock <= 5 ? ` (${remainingText(match.stock)})` : ''}، ويمكنكِ طلبها من صفحتها.`;
    return { text: `«${match.shortName}» ${stock}`, product: match, handoff: match.stock <= 0 };
  }
  return { text: 'لم أجد إجابة دقيقة لسؤالكِ. فريق الدار يسعده الرد عليكِ مباشرة على واتساب.', handoff: true };
}

/** زر المحادثة العائم + نافذة «دعم آيريس» (Live Chat Widget في التصميم). */
export function ChatWidget() {
  const { chatOpen, toggleChat, closeChat } = useUi();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      from: 'staff',
      text: 'أهلاً بكِ في دار آيريس. اسأليني عن قطعة أو عن التوصيل والدفع والاستبدال وسأجيبكِ فوراً. وللحديث مع فريق الدار استخدمي واتساب.',
      time: nowLabel(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const seq = useRef(2);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chatOpen]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [...m, { id: seq.current++, from: 'customer', text: t, time: 'الآن' }]);
    setDraft('');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setMessages((m) => [...m, { id: seq.current++, from: 'staff', time: 'الآن', ...autoReply(t) }]);
    }, 500);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <aside className="fixed bottom-6 left-6 z-40 hidden flex-col items-start gap-3 sm:flex">
      <div
        id="irisChatPanel"
        role="dialog"
        aria-label="مساعد آيريس"
        aria-hidden={!chatOpen}
        className={cn(
          'flex h-[560px] max-h-[calc(100vh-120px)] w-[380px] origin-bottom-left flex-col overflow-hidden rounded-[20px] border border-royal-gold/45 bg-ivory-canvas shadow-[0_24px_64px_rgba(42,3,13,0.35),0_8px_24px_rgba(42,3,13,0.18)] transition-all duration-300',
          chatOpen ? 'scale-100 opacity-100' : 'pointer-events-none hidden scale-90 opacity-0',
        )}
      >
        <div className="relative flex shrink-0 items-center justify-between overflow-hidden bg-gradient-to-l from-deep-oxblood via-burgundy-800 to-deep-oxblood px-space-md py-3.5 text-champagne-gold shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24B_1px,transparent_1px)] opacity-[0.07] [background-size:12px_12px]" />
          <div className="z-10 flex items-center gap-1 text-champagne-gold/75">
            <button
              type="button"
              aria-label="إغلاق المحادثة"
              onClick={closeChat}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 hover:bg-wine-night/60 hover:text-champagne-gold"
            >
              <Icon name="close" className="text-[17px]" />
            </button>
            <button
              type="button"
              aria-label="تصغير المحادثة"
              onClick={closeChat}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 hover:bg-wine-night/60 hover:text-champagne-gold"
            >
              <Icon name="remove" className="text-[17px]" />
            </button>
          </div>
          <div className="z-10 flex items-center gap-space-sm">
            <div className="flex flex-col text-right">
              <div className="flex items-center justify-end gap-1.5">
                <h2 className="font-headline-sm text-headline-sm font-semibold leading-tight text-ivory-canvas">مساعد آيريس</h2>
                <span className="text-[10px] text-royal-gold">◆</span>
              </div>
              <span className="font-label-sm text-label-sm leading-none text-champagne-gold/80">ردود فورية تلقائية</span>
            </div>
            <div className="mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-royal-gold/60 bg-wine-night shadow-inner">
              <span className="font-serif-brand text-[1.1rem] font-normal leading-none text-champagne-gold">I</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-royal-gold/40" />
        </div>

        <div ref={bodyRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto scroll-smooth bg-ivory-canvas p-space-md text-warm-ink">
          <WhatsAppLink
            text="مرحباً دار آيريس، لدي استفسار"
            className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-lowest px-3 py-2 font-label-md text-label-md text-deep-oxblood shadow-sm ring-1 ring-hairline-burgundy transition-colors hover:bg-blush-surface"
          >
            <span className="flex items-center gap-2">
              <WhatsAppIcon className="h-[18px] w-[18px] text-[#1F8F4E]" />
              تحتاجين شخصاً من الدار؟ راسلينا على واتساب
            </span>
            <Icon name="chevron_left" className="text-[18px] text-muted-rosewood" />
          </WhatsAppLink>

          {messages.map((m) =>
            m.from === 'staff' ? (
              <div key={m.id} className="flex max-w-[92%] items-start gap-2 self-start text-right">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-royal-gold/30 bg-deep-oxblood text-champagne-gold shadow-sm">
                  <Icon name="diamond" className="text-[13px]" />
                </div>
                <div className="flex w-full flex-col gap-1.5">
                  <div className="rounded-2xl rounded-tr-none border border-hairline-burgundy bg-blush-surface px-3.5 py-2.5 font-body-sm text-body-sm leading-relaxed text-warm-ink shadow-sm">
                    {m.text}
                  </div>
                  {m.product && (
                    <Link
                      to={`/products/${m.product.slug}`}
                      onClick={closeChat}
                      className="flex w-full items-center gap-3 rounded-xl border border-royal-gold/50 bg-surface-container-lowest p-2.5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-hairline-burgundy bg-parchment">
                        <img src={m.product.image} alt={m.product.shortName} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <span className="font-label-sm text-[11px] font-medium leading-none text-antique-gold">{m.product.sku}</span>
                        <h4 className="mt-0.5 truncate font-headline-sm text-[0.875rem] font-bold text-deep-oxblood">{m.product.shortName}</h4>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <span className="font-headline-sm text-headline-sm font-bold text-primary">{formatNumber(m.product.price)}</span>
                          <span className="font-label-sm text-label-sm font-semibold text-deep-oxblood">د.ع</span>
                        </div>
                      </div>
                      <Icon name="arrow_back" className="text-[18px] text-imperial-burgundy" />
                    </Link>
                  )}
                  {m.link && (
                    <Link
                      to={m.link.to}
                      onClick={closeChat}
                      className="inline-flex items-center gap-1 self-start rounded-full bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md font-semibold text-imperial-burgundy ring-1 ring-royal-gold/40 transition-colors hover:bg-parchment"
                    >
                      {m.link.label}
                      <Icon name="chevron_left" className="text-[18px]" />
                    </Link>
                  )}
                  {m.handoff && (
                    <WhatsAppLink
                      text={`مرحباً دار آيريس، ${messages.find((x) => x.id === m.id - 1)?.text ?? 'لدي استفسار'}`}
                      className="inline-flex items-center gap-1.5 self-start rounded-full bg-imperial-burgundy px-3 py-1.5 font-label-md text-label-md text-ivory-canvas transition-colors hover:bg-burgundy-600"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      راسلي فريق الدار
                    </WhatsAppLink>
                  )}
                  <span className="pr-1 font-label-sm text-[11px] text-muted-rosewood/70">{m.time}</span>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex max-w-[85%] items-start justify-end gap-2 self-end text-right">
                <div className="flex flex-col items-end gap-1">
                  <div className="rounded-2xl rounded-tl-none border border-royal-gold/30 bg-imperial-burgundy px-3.5 py-2.5 font-body-sm text-body-sm leading-relaxed text-ivory-canvas shadow-[0_4px_16px_rgba(78,24,37,0.22)]">
                    {m.text}
                  </div>
                  <span className="pl-1 font-label-sm text-[11px] text-muted-rosewood/70">{m.time}</span>
                </div>
              </div>
            ),
          )}

          {messages.length === 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 pr-8">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="whitespace-nowrap rounded-full border border-royal-gold/40 bg-surface-container-lowest px-3 py-1 font-label-sm text-label-sm text-antique-gold shadow-sm transition-all duration-150 hover:bg-parchment active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2 border-t border-royal-gold/30 bg-surface-container-lowest px-space-md py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="اكتبي سؤالكِ هنا…"
            aria-label="سؤالكِ"
            className="h-10 flex-1 rounded-xl border border-outline-variant bg-ivory-canvas px-3 font-body-sm text-body-sm text-warm-ink placeholder:text-muted-rosewood/60 focus:border-imperial-burgundy focus:outline-none focus:ring-2 focus:ring-rose-mist"
          />
          <button
            type="submit"
            aria-label="إرسال"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-imperial-burgundy text-champagne-gold transition-colors hover:bg-burgundy-600"
          >
            <Icon name="send" className="rotate-180 text-[18px]" />
          </button>
        </form>
      </div>

      <button
        type="button"
        id="chatToggleTrigger"
        aria-label={chatOpen ? 'إغلاق المساعد' : 'فتح مساعد آيريس'}
        aria-expanded={chatOpen}
        onClick={toggleChat}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-royal-gold/70 bg-gradient-to-tr from-deep-oxblood via-primary to-burgundy-800 text-champagne-gold shadow-[0_8px_24px_rgba(42,3,13,0.35)] transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <Icon name={chatOpen ? 'close' : 'forum'} className="text-[26px]" />
      </button>
    </aside>
  );
}
