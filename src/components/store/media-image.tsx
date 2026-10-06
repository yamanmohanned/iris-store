import type { ImageDTO } from "@/server/services/media";
import { tl } from "@/lib/localized";
import { cn } from "@/lib/utils";

/**
 * Responsive image from our pre-generated WebP variants (no runtime resizing): the browser picks
 * the right width from `srcSet` + `sizes`. A 16px blurred preview shows while it loads.
 */
export function MediaImage({
  image,
  sizes,
  alt,
  locale,
  priority = false,
  eager = false,
  className,
  fit = "cover",
}: {
  image: ImageDTO | null | undefined;
  sizes: string;
  alt?: string;
  locale: string;
  /** The page's main image: loaded right away, ahead of other images. */
  priority?: boolean;
  /** Visible when the page opens: loaded right away, at normal priority. */
  eager?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  if (!image) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "bg-[linear-gradient(135deg,var(--primary-soft),var(--surface-muted))]",
          className,
        )}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variants are pre-generated; next/image would re-encode them
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt ?? tl(image.alt, locale)}
      loading={priority || eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      style={
        image.blurDataUrl
          ? {
              backgroundImage: `url(${image.blurDataUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    />
  );
}
