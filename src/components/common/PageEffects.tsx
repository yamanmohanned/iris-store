import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { findProductByName, getCatalog } from '@/data/catalog';
import { useToast } from '@/state/toast';

/** يعيد التمرير للأعلى عند تغيّر المسار (النافذة + إطار الموبايل الداخلي). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>('[data-scroll-root]').forEach((el) => el.scrollTo(0, 0));
  }, [pathname]);
  return null;
}

/** وجهة معقولة لرابط بلا وجهة حسب نصه (روابط تصاميم Stitch الثابتة). */
function destinationFor(a: HTMLAnchorElement): string | null {
  // صف منتج: أقرب عنوان h2/h3 في الحاوية يطابق منتجاً في الكتالوج
  let el: HTMLElement | null = a;
  for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
    const heading = el.querySelector('h2, h3, h4');
    const product = heading ? findProductByName(heading.textContent) : undefined;
    if (product) return `/products/${product.slug}`;
  }

  const text = (a.textContent ?? '') + ' ' + (a.getAttribute('aria-label') ?? '');
  const has = (slug: string) => getCatalog().visibleCategories.some((c) => c.slug === slug);
  if (/واتساب|whatsapp/i.test(text)) {
    const wa = getCatalog().settings.whatsapp;
    return wa ? `https://wa.me/${wa}` : '/contact';
  }
  if (/إنستغرام|انستغرام|instagram|تواصل|اتصل|مساعدة|الدعم|استشارة/i.test(text)) return '/contact';
  if (/هدايا|هدية|الباقة/.test(text)) return has('gifts') ? '/collections/gifts' : '/collections/all';
  if (/سياسة|الشحن|الاستبدال|الإرجاع|الاسترجاع/.test(text)) return '/policies/shipping';
  if (/العناية/.test(text)) return '/policies/care';
  if (/المقاس/.test(text)) return '/policies/size-guide';
  if (/طلباتي|تتبع/.test(text)) return '/track-order';
  if (/المفضلة/.test(text)) return '/wishlist';
  if (/الأسئلة/.test(text)) return '/faq';
  if (/أرشيف|المجموعة|المجموعات|تسوق|تسوّق|تصفح|تصفّح|اكتشف|استعرض|المزيد/.test(text)) return '/collections/all';
  return null;
}

/**
 * تصاميم Stitch تحتوي روابط `href="#"` كثيرة بلا وجهة.
 * تفويض أحداث واحد: يمنع القفز لأعلى الصفحة، ويوجّه الرابط في المتجر إلى أقرب وجهة منطقية
 * (المنتج المذكور في الصف، أو صفحة تناسب نص الرابط)، وإلا يخبر الزائر أن الميزة غير متاحة بعد.
 */
export function PlaceholderLinkGuard() {
  const navigate = useNavigate();
  const toast = useToast();
  const ref = useRef({ navigate, toast });
  ref.current = { navigate, toast };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.getAttribute('href') !== '#') return;
      e.preventDefault();
      if (window.location.pathname.startsWith('/admin')) return;
      const to = destinationFor(a);
      if (!to) {
        ref.current.toast.show('هذه الميزة غير متاحة بعد', 'info');
        return;
      }
      if (to.startsWith('http')) window.open(to, '_blank', 'noopener');
      // المصدر يُحفظ حتى تعرض صفحة الوجهة «رجوع إلى السلة» مثلاً
      else ref.current.navigate(to, { state: { from: window.location.pathname } });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
