import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import type { CurrencyConfig } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductCardDTO } from "@/server/services/catalog";
import { MediaImage } from "./media-image";
import { Price } from "./price";

/**
 * Mobile-first product tile: petal-shaped photo (4:5), badges, two-line name, price.
 * The whole card is one link (large tap target); `sizes` assumes 2 columns on phones.
 * Shared component (no server-only APIs) so "Show more" can render it on the client too.
 */
export function ProductCard({
  product,
  currency,
  locale,
  priority = false,
  sizes = "(min-width: 1024px) 22vw, (min-width: 640px) 31vw, 46vw",
  className,
}: {
  product: ProductCardDTO;
  currency: CurrencyConfig;
  locale: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const t = useTranslations("store");
  const name = tl(product.name, locale);
  return (
    <article className={cn("group relative min-w-0", className)}>
      <Link href={`/p/${product.slug}`} className="block rounded-[inherit] outline-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden petal bg-surface-muted">
          <MediaImage
            image={product.image}
            sizes={sizes}
            alt={name}
            locale={locale}
            priority={priority}
            className={cn(
              "absolute inset-0 size-full transition duration-500 group-hover:scale-[1.03]",
              !product.inStock && "opacity-60 grayscale-[35%]",
            )}
          />
          {product.secondImage ? (
            <MediaImage
              image={product.secondImage}
              sizes={sizes}
              alt=""
              locale={locale}
              className="absolute inset-0 hidden size-full opacity-0 transition-opacity duration-500 group-hover:opacity-100 lg:block"
            />
          ) : null}
          <div className="absolute inset-x-2 top-2 flex flex-wrap items-start gap-1.5">
            {product.discountPercent ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground tabular">
                <bdi dir="ltr">{t("off", { percent: product.discountPercent })}</bdi>
              </span>
            ) : null}
            {product.isNew && !product.discountPercent ? (
              <span className="rounded-full bg-surface/90 px-2 py-0.5 text-xs font-semibold text-primary backdrop-blur">
                {t("new")}
              </span>
            ) : null}
          </div>
          {!product.inStock ? (
            <span className="absolute inset-x-2 bottom-2 rounded-full bg-foreground/80 py-1 text-center text-xs font-medium text-background">
              {t("soldOut")}
            </span>
          ) : null}
        </div>
        <div className="px-0.5 pt-2.5">
          <h3 className="line-clamp-2 min-h-[2.6em] text-sm leading-[1.3] font-medium text-foreground">
            {name}
          </h3>
          <Price
            className="mt-1"
            amount={product.price}
            compareAt={product.compareAtPrice}
            currency={currency}
            locale={locale}
            fromLabel={product.maxPrice > product.price ? t("from") : undefined}
            wasLabel={(p) => t("wasPrice", { price: p })}
          />
        </div>
      </Link>
    </article>
  );
}
