import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import type { CategoryNode } from "@/server/services/catalog";

/**
 * Sticky store header. Phones: brand + a search pill (cart/account live in the bottom bar).
 * Desktop: brand, category navigation, search, account, wishlist, cart.
 */
export async function StoreHeader({
  storeName,
  categories,
  locale,
  cartCount = 0,
  signedIn = false,
}: {
  storeName: string;
  categories: CategoryNode[];
  locale: string;
  cartCount?: number;
  signedIn?: boolean;
}) {
  const t = await getTranslations();
  const navCategories = categories.slice(0, 7);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/95 pt-safe backdrop-blur-md">
      <div className="container-page flex h-[var(--header-height)] items-center gap-3 lg:h-16 lg:gap-6">
        <Link
          href="/"
          className="shrink-0 font-display text-[1.35rem] leading-none font-bold text-primary lg:text-2xl"
        >
          {storeName}
        </Link>

        <nav aria-label={t("nav.mainMenu")} className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center gap-5 text-sm font-medium">
            {navCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="whitespace-nowrap text-foreground/80 transition-colors hover:text-primary"
                >
                  {tl(c.name, locale)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/search"
                className="whitespace-nowrap text-foreground/80 hover:text-primary"
              >
                {t("nav.allProducts")}
              </Link>
            </li>
          </ul>
        </nav>

        <Link
          href="/search"
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-muted px-4 text-sm text-muted-foreground transition-colors hover:bg-border/60 lg:max-w-64 lg:flex-none lg:basis-64"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t("store.searchPlaceholder")}</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <LanguageSwitcher />
          <Link
            href={signedIn ? "/account" : "/login"}
            aria-label={t("nav.account")}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-muted"
          >
            <UserRound className="size-5" aria-hidden="true" />
          </Link>
          <Link
            href="/account/wishlist"
            aria-label={t("nav.wishlist")}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-muted"
          >
            <Heart className="size-5" aria-hidden="true" />
          </Link>
          <Link
            href="/cart"
            aria-label={t("nav.cart")}
            className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-muted"
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {cartCount > 0 ? (
              <span className="absolute end-0.5 top-0.5 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-bold text-primary-foreground tabular">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AnnouncementBar({ text, href }: { text: string; href?: string }) {
  const content = (
    <p className="container-page py-2 text-center text-[0.8rem] leading-snug font-medium">{text}</p>
  );
  return (
    <div className="bg-primary text-primary-foreground">
      {href ? (
        <Link href={href} className="block hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
