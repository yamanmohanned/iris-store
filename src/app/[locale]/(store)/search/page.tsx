import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductListing } from "@/components/store/listing/product-listing";
import { SearchBox } from "@/components/store/search-box";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { parseListingParams } from "@/lib/listing";
import { tl } from "@/lib/localized";
import { getStoreContext } from "@/server/store-context";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/search">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "store" });
  const q = parseListingParams(await searchParams).q;
  return {
    title: q ? t("resultsFor", { q }) : t("searchTitle"),
    // Search result pages are thin/duplicate content for crawlers.
    robots: q ? { index: false, follow: true } : undefined,
  };
}

/** Search + "all products" (no query) with the same filters and sorting as categories. */
export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const sp = await searchParams;
  const listing = parseListingParams(sp);
  const [ctx, t, tNav] = await Promise.all([
    getStoreContext(locale),
    getTranslations("store"),
    getTranslations("nav"),
  ]);

  return (
    <div className="container-page pt-4 pb-6">
      <SearchBox
        initialQuery={listing.q ?? ""}
        currency={ctx.currency}
        autoFocus={!listing.q && !Object.keys(sp).length}
      />
      <h1 className="mt-5 font-display text-[1.7rem] leading-tight font-bold">
        {listing.q ? t("resultsFor", { q: listing.q }) : tNav("allProducts")}
      </h1>
      {!listing.q ? (
        <nav
          className="-mx-4 mt-3 rail auto-cols-max gap-2 px-4 md:-mx-6 md:px-6"
          aria-label={t("popularCategories")}
        >
          {ctx.categoryTree.map((c) => (
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
      <div className="mt-3">
        <ProductListing searchParams={sp} currency={ctx.currency} locale={locale} />
      </div>
    </div>
  );
}
