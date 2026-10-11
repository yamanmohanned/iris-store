import { useRef } from 'react';
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
