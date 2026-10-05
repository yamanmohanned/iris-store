import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductListing } from "@/components/store/listing/product-listing";
import { MediaImage } from "@/components/store/media-image";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { cn } from "@/lib/utils";
import { getCategoryBySlug } from "@/server/services/catalog";
import { getStoreContext } from "@/server/store-context";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/c/[slug]">): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = assertLocale(raw);
  const data = await getCategoryBySlug(decodeURIComponent(slug));
  if (!data) return {};
  const c = data.category;
  const title = tl(c.name, locale);
  return {
    title,
    description: tl(c.description, locale) || undefined,
    alternates: {
      canonical: `${locale === "ar" ? "" : `/${locale}`}/c/${c.slug}`,
      languages: { ar: `/c/${c.slug}`, en: `/en/c/${c.slug}` },
    },
    openGraph: {
      title,
      images: c.image
        ? [{ url: c.image.src, width: c.image.width, height: c.image.height }]
        : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/c/[slug]">) {
  const { locale: raw, slug } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  const [data, ctx, t] = await Promise.all([
    getCategoryBySlug(decodeURIComponent(slug)),
    getStoreContext(locale),
    getTranslations("store"),
  ]);
  if (!data) notFound();
  const { category, trail, children } = data;
  const siblings = children.length ? children : [];

  return (
    <div className="container-page pt-4 pb-6">
      <Breadcrumbs
        label={t("breadcrumb")}
        items={[
          { href: "/", label: t("home") },
          ...trail.map((c) => ({ href: `/c/${c.slug}`, label: tl(c.name, locale) })),
        ]}
      />
      <header className="mt-3 flex items-center gap-4">
        {category.image ? (
          <span className="hidden size-16 shrink-0 overflow-hidden petal-sm bg-surface-muted sm:block">
            <MediaImage
              image={category.image}
              sizes="64px"
              alt=""
              locale={locale}
              className="size-full"
            />
          </span>
        ) : null}
        <div>
          <h1 className="font-display text-3xl leading-tight font-bold">
            {tl(category.name, locale)}
          </h1>
          {category.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{tl(category.description, locale)}</p>
          ) : null}
        </div>
      </header>

      {siblings.length ? (
        <nav
          className="-mx-4 mt-4 rail auto-cols-max gap-2 px-4 md:-mx-6 md:px-6"
          aria-label={tl(category.name, locale)}
        >
          <Link
            href={`/c/${category.slug}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium",
              "border-primary bg-primary text-primary-foreground",
            )}
          >
            {t("viewAll")}
          </Link>
          {siblings.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="rounded-full border bg-surface px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
            >
              {tl(c.name, locale)}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="mt-4">
        <ProductListing
          searchParams={await searchParams}
          categoryId={category.id}
          currency={ctx.currency}
          locale={locale}
        />
      </div>
    </div>
  );
}
