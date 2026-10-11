import { useEffect } from 'react';
import { useLocation } from 'react-router';

const SELECTOR = '.line-reveal, .twin-divider, .fade-up-item, .curtain-reveal';

/**
 * يكشف العناصر المزخرفة عند دخولها نافذة العرض (نفس سلوك سكربتات Stitch الأصلية).
 * يراقب الـ DOM فتُكشف العناصر التي تُرسم متأخرة (lazy routes) أيضاً.
 */
export function useRevealOnScroll(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => el.classList.add('revealed'));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' },
    );

    const watched = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (watched.has(el) || el.classList.contains('revealed')) return;
        watched.add(el);
        io.observe(el);
      });
    };

    scan();
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname]);
}
