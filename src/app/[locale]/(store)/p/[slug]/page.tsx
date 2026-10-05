import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { BrandIcon } from "@/components/store/brand-icon";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductCard } from "@/components/store/product-card";
import { ProductExperience } from "@/components/store/product/product-experience";
import { toggleWishlistAction } from "../../account/actions";
import { addToCartAction } from "../../cart/actions";
import { ShareButton } from "@/components/store/product/share-button";
import { WishlistButton } from "@/components/store/product/wishlist-button";
import { ProductRail, SectionHeading } from "@/components/store/section";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { toMajor } from "@/lib/money";
import { getSession } from "@/server/auth/session";
import { env } from "@/server/env";
import { sanitizeRichText, stripHtml } from "@/server/security/sanitize";
import {
  getActiveCategories,
  getProductBySlug,
  getRelatedProducts,
} from "@/server/services/catalog";
import { isInWishlist } from "@/server/services/wishlist";
import { getStoreContext, whatsappNumber } from "@/server/store-context";

async function load(rawSlug: string) {
  return getProductBySlug(decodeURIComponent(rawSlug));
}

function localePrefix(locale: string) {
  return locale === "ar" ? "" : `/${locale}`;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/p/[slug]">): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = assertLocale(raw);
  const product = await load(slug);
  if (!product) return {};
  const name = tl(product.seo?.title, locale) || tl(product.name, locale);
  const description =
    tl(product.seo?.description, locale) ||
    tl(product.shortDescription, locale) ||
    stripHtml(tl(product.description, locale)).slice(0, 160) ||
    undefined;
  const image = product.images[0];
  return {
    title: name,
    description,
    alternates: {
      canonical: `${localePrefix(locale)}/p/${product.slug}`,
      languages: { ar: `/p/${product.slug}`, en: `/en/p/${product.slug}` },
    },
    openGraph: {
      title: name,
      description,
      images: image ? [{ url: image.src, width: image.width, height: image.height }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/p/[slug]">) {
  const { locale: raw, slug } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  const product = await load(slug);
  if (!product) notFound();

  const session = await getSession();
  const [ctx, categories, related, t, saved] = await Promise.all([
    getStoreContext(locale),
    getActiveCategories(),
    getRelatedProducts(product),
    getTranslations("store"),
    session ? isInWishlist(session.user.id, product.id) : Promise.resolve(false),
  ]);
  const name = tl(product.name, locale);
  // Sanitized on save already; re-sanitized on render as defense in depth.
  const description = sanitizeRichText(tl(product.description, locale));
  const shortDescription = tl(product.shortDescription, locale);

  // Breadcrumb: Home › parent category › category
  const trail = [];
  for (
    let c = categories.find((x) => x.id === product.primaryCategoryId);
    c && trail.length < 4;
    c = categories.find((x) => x.id === c!.parentId)
  ) {
    trail.unshift(c);
  }
  const url = `${env().APP_URL}${localePrefix(locale)}/p/${product.slug}`;
  const wa = whatsappNumber(ctx.settings.general.contact.whatsapp);
  const waText = t("product.whatsappMessage", { name, url });

  const offers = product.variants.length
    ? {
        "@type": "AggregateOffer",
        priceCurrency: ctx.currency.currency,
        lowPrice: toMajor(product.minPrice, ctx.currency.decimals),
        highPrice: toMajor(product.maxPrice, ctx.currency.decimals),
        offerCount: product.variants.length,
        availability: product.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url,
      }
    : undefined;

  return (
    <div className="container-page pt-3 pb-28 lg:pt-6 lg:pb-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name,
            description: shortDescription || stripHtml(description).slice(0, 500) || undefined,
            image: product.images.map((i) =>
              i.src.startsWith("http") ? i.src : `${env().APP_URL}${i.src}`,
            ),
            sku: product.variants[0]?.sku ?? undefined,
            brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
            offers,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: t("home"),
                item: `${env().APP_URL}${localePrefix(locale) || "/"}`,
              },
              ...trail.map((c, i) => ({
                "@type": "ListItem",
                position: i + 2,
                name: tl(c.name, locale),
                item: `${env().APP_URL}${localePrefix(locale)}/c/${c.slug}`,
              })),
              { "@type": "ListItem", position: trail.length + 2, name },
            ],
          },
        ]}
      />
      <div className="mb-3 hidden lg:block">
        <Breadcrumbs
          label={t("breadcrumb")}
          items={[
            { href: "/", label: t("home") },
            ...trail.map((c) => ({ href: `/c/${c.slug}`, label: tl(c.name, locale) })),
            { label: name },
          ]}
        />
      </div>

      <ProductExperience
        product={product}
        name={name}
        currency={ctx.currency}
        locale={locale}
        onAddToCart={addToCartAction}
        header={
          <div>
            <div className="lg:hidden">
              <Breadcrumbs
                label={t("breadcrumb")}
                items={[
                  { href: "/", label: t("home") },
                  ...trail.map((c) => ({ href: `/c/${c.slug}`, label: tl(c.name, locale) })),
                ]}
              />
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {product.brand ? (
                  <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {product.brand}
                  </p>
                ) : null}
                <h1 className="text-xl leading-snug font-semibold text-balance sm:text-2xl">
                  {name}
                </h1>
              </div>
              <div className="flex shrink-0 gap-2">
                <WishlistButton
                  productId={product.id}
                  initialSaved={saved}
                  action={toggleWishlistAction}
                  returnTo={`/p/${product.slug}`}
                />
                <ShareButton title={name} />
              </div>
            </div>
            {shortDescription ? (
              <p className="mt-2 text-muted-foreground">{shortDescription}</p>
            ) : null}
          </div>
        }
        extra={
          wa ? (
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/8 text-sm font-semibold text-[#128C7E] transition hover:bg-[#25D366]/15"
            >
              <BrandIcon name="whatsapp" className="size-5" />
              {t("product.askWhatsApp")}
            </a>
          ) : null
        }
      />

      {description ? (
        <section className="mt-10 max-w-3xl">
          <h2 className="mb-3 font-display text-xl font-semibold">{t("product.description")}</h2>
          <div className="prose-store" dangerouslySetInnerHTML={{ __html: description }} />
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-12">
          <SectionHeading title={t("product.related")} />
          <ProductRail>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} currency={ctx.currency} locale={locale} />
            ))}
          </ProductRail>
        </section>
      ) : null}
    </div>
  );
}
