"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Swipeable hero (Embla): RTL-aware, autoplay that pauses on interaction and is disabled for
 * reduced-motion users, accessible dot controls. Slides are rendered on the server and passed in.
 */
export function HeroSlider({ slides, autoplay }: { slides: ReactNode[]; autoplay: boolean }) {
  const locale = useLocale();
  const t = useTranslations("store");
  const [ref, api] = useEmblaCarousel({
    loop: slides.length > 1,
    direction: locale === "ar" ? "rtl" : "ltr",
    duration: 28,
  });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("pointerDown", () => setPaused(true));
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !autoplay || paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => api.scrollNext(), 6000);
    return () => window.clearInterval(id);
  }, [api, autoplay, paused, slides.length]);

  const goTo = useCallback((i: number) => api?.scrollTo(i), [api]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      aria-roledescription="carousel"
    >
      <div ref={ref} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="min-w-0 shrink-0 grow-0 basis-full"
              role="group"
              aria-roledescription="slide"
              aria-label={t("product.imageOf", { index: i + 1, total: slides.length })}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 ? (
        <div className="mt-3 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t("heroGoTo", { index: i + 1 })}
              aria-current={i === index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
