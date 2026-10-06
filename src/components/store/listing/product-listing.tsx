import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  LISTING_PAGE_SIZE,
  priceFilterMinor,
  toQueryString,
  type ListingParams,
  type ListingSort,
} from "@/lib/listing";
import { parseListingParams } from "@/lib/listing-params";
import type { CurrencyConfig } from "@/lib/money";
import { listProducts } from "@/server/services/catalog";
import { EmptyState } from "../empty-state";
import { ProductCard } from "../product-card";
import { ProductGrid } from "../section";
import { ListingToolbar } from "./listing-toolbar";
import { LoadMore } from "./load-more";

/** Toolbar + product grid + "Show more" for any listing (category, search, all products). */
export async function ProductListing({
  searchParams,
  categoryId,
  currency,
  locale,
  sorts = ["newest", "best_selling", "price_asc", "price_desc", "discount"],
}: {
  searchParams: Record<string, string | string[] | undefined>;
  categoryId?: string;
  currency: CurrencyConfig;
  locale: string;
  sorts?: ListingSort[];
}) {
  const t = await getTranslations("store");
  const params: ListingParams = parseListingParams(searchParams);
  const { items, total } = await listProducts({
    q: params.q,
    sort: params.sort ?? (params.q ? "relevance" : sorts[0]),
    categoryId,
    inStock: params.stock === "1",
    onSale: params.sale === "1",
    featured: params.featured === "1",
    ...priceFilterMinor(params, currency.decimals),
    page: 1,
    pageSize: LISTING_PAGE_SIZE,
  });
  // Same filters for "Show more" requests (page is appended by the client).
  const qs = new URLSearchParams(toQueryString({ ...params, page: undefined }));
  if (categoryId) qs.set("category", categoryId);
  const query = qs.toString();

  return (
    <>
      <ListingToolbar
        params={params}
        total={total}
        sorts={params.q ? ["relevance", ...sorts.filter((s) => s !== "relevance")] : sorts}
      />
      {items.length ? (
        <ProductGrid className="mt-4">
          {items.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              currency={currency}
              locale={locale}
              headingLevel={2}
              // On screen when the page opens: the first two rows on phones, the first row on desktop.
              priority={i < 2}
              eager={i < 4}
            />
          ))}
          <LoadMore
            query={query}
            initialCount={items.length}
            total={total}
            currency={currency}
            locale={locale}
          />
        </ProductGrid>
      ) : (
        <EmptyState
          icon={SearchX}
          title={t("noResultsTitle")}
          body={t("noResultsBody")}
          action={
            <Link href="/search" className={buttonVariants({ variant: "outline" })}>
              {(await getTranslations("nav"))("allProducts")}
            </Link>
          }
        />
      )}
    </>
  );
}
