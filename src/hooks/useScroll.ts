import { useEffect, useState } from 'react';

export interface ScrollInfo {
  y: number;
  /** نسبة التمرير 0..100 */
  progress: number;
  /** اتجاه آخر تمرير */
  direction: 'up' | 'down';
}

/** حالة التمرير العامة للنافذة (مفلترة بـ rAF). */
export function useWindowScroll(): ScrollInfo {
  const [info, setInfo] = useState<ScrollInfo>({ y: 0, progress: 0, direction: 'up' });

  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(100, (y / max) * 100) : 0;
      setInfo((prev) => {
        const direction = y > last ? 'down' : y < last ? 'up' : prev.direction;
        last = y <= 0 ? 0 : y;
        return prev.y === y && prev.progress === progress && prev.direction === direction ? prev : { y, progress, direction };
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return info;
}

/**
 * موضع التمرير لشاشات الموبايل: النافذة على الهاتف، أو إطار `[data-scroll-root]`
 * عند عرض تصميم الهاتف داخل إطار على شاشة أكبر (انظر layouts/MobileFrame).
 */
export function useMobileScrollY(): number {
  const [y, setY] = useState(0);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-scroll-root]');
    let raf = 0;
    const update = () => {
      raf = 0;
      setY(Math.max(window.scrollY, root?.scrollTop ?? 0));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    root?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      root?.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return y;
}
