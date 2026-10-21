import { useSyncExternalStore } from 'react';

/** يتتبّع media query ويعيد التصيير عند تغيّره (آمن مع SSR/الاختبارات). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** الموبايل = أقل من 768px (نقطة md في Tailwind). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
