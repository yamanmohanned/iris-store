import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/store/empty-state";
import { ProductCard } from "@/components/store/product-card";
import { WishlistButton } from "@/components/store/product/wishlist-button";
import { ProductGrid } from "@/components/store/section";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { requireUserPage } from "@/server/auth/session";
import { listWishlist } from "@/server/services/wishlist";
import { getStoreContext } from "@/server/store-context";
import { toggleWishlistAction } from "../actions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/wishlist">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "wishlist",
  });
  return { title: t("title"), robots: { index: false } };
}

export default async function WishlistPage({ params }: PageProps<"/[locale]/account/wishlist">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const session = await requireUserPage(locale, "/account/wishlist");
  const [t, tAccount, ctx, items] = await Promise.all([
    getTranslations("wishlist"),
    getTranslations("account"),
    getStoreContext(locale),
    listWishlist(session.user.id),
  ]);

  return (
    <div className="container-page py-6 sm:py-10">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        {tAccount("title")}
      </Link>
      <h1 className="mt-1 font-display text-[1.7rem] leading-tight font-bold">
        {t("title")}{" "}
        {items.length ? (
          <span className="text-base font-normal text-muted-foreground tabular">
            ({items.length})
          </span>
        ) : null}
      </h1>
      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t("empty")}
          body={t("emptyBody")}
          action={
            <Link href="/categories" className={buttonVariants({ size: "lg" })}>
              {t("browse")}
            </Link>
          }
        />
      ) : (
        <ProductGrid className="mt-5">
          {items.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} currency={ctx.currency} locale={locale} />
              <WishlistButton
                productId={p.id}
                initialSaved
                action={toggleWishlistAction}
                returnTo="/account/wishlist"
                className="absolute end-2 top-2 z-10 size-9 shadow-sm"
              />
            </div>
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
