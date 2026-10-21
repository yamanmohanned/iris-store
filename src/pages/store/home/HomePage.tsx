import { useRef } from 'react';
import { StoreComingSoon } from '@/components/store/StoreComingSoon';
import { useCatalog } from '@/data/catalog';
import HomeBottom from './HomeBottom';
import HomeHero from './HomeHero';
import HomeMiddle from './HomeMiddle';
import { useHomeEffects } from './useHomeEffects';

/**
 * الصفحة الرئيسية للديسكتوب — تركيب ثلاث شاشات Stitch متتالية:
 * البطل + التصنيفات + وصل حديثاً ← الأكثر طلباً + العروض + الهدايا + القطع النادرة ← فلسفة الدار + الخطوات + الأسئلة.
 */
export default function HomePage() {
  const ref = useRef<HTMLElement>(null);
  useHomeEffects(ref);
  const { visibleProducts } = useCatalog();

  if (!visibleProducts.length) {
    return (
      <main className="flex min-h-[70vh] w-full items-center justify-center bg-ivory-canvas px-6 py-16">
        <StoreComingSoon className="w-full max-w-xl" />
      </main>
    );
  }

  return (
    <main ref={ref} className="w-full min-h-screen overflow-hidden bg-ivory-canvas">
      <div className="relative flex w-full flex-col">
        <HomeHero />
        <HomeMiddle />
        <HomeBottom />
      </div>
    </main>
  );
}
