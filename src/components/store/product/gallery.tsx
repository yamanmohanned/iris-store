"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ImageDTO } from "@/server/services/media";
import { MediaImage } from "../media-image";

/**
 * Product photos: swipe on phones (native scroll-snap, RTL-aware), thumbnails on desktop.
 * `focusImageId` lets the purchase panel jump to the selected variant's photo.
 */
export function ProductGallery({
  images,
  name,
  locale,
  focusImageId,
}: {
  images: ImageDTO[];
  name: string;
  locale: string;
  focusImageId?: string | null;
}) {
  const t = useTranslations("store.product");
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const el = track.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, []);

  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { root, threshold: 0.6 },
    );
    for (const child of Array.from(root.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [images.length]);

  useEffect(() => {
    if (!focusImageId) return;
    const index = images.findIndex((img) => img.id === focusImageId);
    if (index >= 0) scrollTo(index);
  }, [focusImageId, images, scrollTo]);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/5] petal bg-[linear-gradient(135deg,var(--primary-soft),var(--surface-muted))]" />
    );
  }

  return (
    <div
      className="lg:grid lg:grid-cols-[4.5rem_1fr] lg:gap-3"
      aria-label={t("gallery")}
      role="region"
    >
      <div className="relative min-w-0 lg:order-last">
        <div ref={track} className="rail auto-cols-[100%] overflow-hidden petal bg-surface-muted">
          {images.map((img, i) => (
            <div key={img.id} data-index={i} className="relative aspect-[4/5]">
              <MediaImage
                image={img}
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt={i === 0 ? name : t("imageOf", { index: i + 1, total: images.length })}
                locale={locale}
                priority={i === 0}
                className="absolute inset-0 size-full"
              />
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden"
            aria-hidden="true"
          >
            {images.map((img, i) => (
              <span
                key={img.id}
                className={cn(
                  "h-1.5 rounded-full bg-white/90 shadow transition-all",
                  i === active ? "w-5" : "w-1.5 opacity-60",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      {images.length > 1 ? (
        <ul className="mt-3 scrollbar-none flex gap-2 overflow-x-auto lg:mt-0 lg:flex-col">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={t("imageOf", { index: i + 1, total: images.length })}
                aria-current={i === active}
                className={cn(
                  "block size-16 overflow-hidden petal-sm border-2 transition lg:size-[4.5rem]",
                  i === active
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <MediaImage image={img} sizes="72px" alt="" locale={locale} className="size-full" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
