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
      { threshold: 0, rootMargin: '0px 0px -24px 0px' },
    );

    // احتياط: المراقب قد لا يُبلّغ (نافذة مخفية ثم ظاهرة، تغيّر الحجم، تمرير سريع جداً)، فتبقى الصورة
    // تحت «الستارة» وكأنها لم تُحمَّل. نكشف كل عنصر وصل إلى الشاشة أو صار فوقها عند التمرير وتغيّر الحجم.
    let pending = 0;
    const sweep = () => {
      pending = 0;
      const h = window.innerHeight;
      if (!h) return;
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.classList.contains('revealed')) return;
        if (el.getBoundingClientRect().top < h) {
          el.classList.add('revealed');
          io.unobserve(el);
        }
      });
    };
    const schedule = () => {
      if (!pending) pending = window.setTimeout(sweep, 120);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', schedule);
    const late = window.setTimeout(sweep, 1200);

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
      window.clearTimeout(pending);
      window.clearTimeout(late);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', schedule);
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname]);
}
