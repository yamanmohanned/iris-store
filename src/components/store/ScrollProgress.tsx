import { useWindowScroll } from '@/hooks/useScroll';

/** شريط تقدّم التمرير الذهبي أعلى الصفحة (RTL: يمتد من اليمين). */
export function ScrollProgress() {
  const { progress } = useWindowScroll();
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-0 top-0 z-[9999] h-[2px] opacity-70 transition-[width] duration-75 ease-out"
      style={{ width: `${progress}%`, background: 'linear-gradient(to left, #8a6620, #c9a24b, #e9d49c)' }}
    />
  );
}
