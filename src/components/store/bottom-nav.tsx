"use client";

import { Heart, Home, LayoutGrid, ShoppingBag, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", key: "home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/categories",
    key: "categories",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/categories") || p.startsWith("/c/"),
  },
  { href: "/cart", key: "cart", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") },
  {
    href: "/account/wishlist",
    key: "wishlist",
    icon: Heart,
    match: (p: string) => p.startsWith("/account/wishlist"),
  },
  {
    href: "/account",
    key: "account",
    icon: UserRound,
    match: (p: string) =>
      p === "/account" || (p.startsWith("/account/") && !p.startsWith("/account/wishlist")),
  },
] as const;

/**
 * App-style bottom tab bar for phones (hidden on large screens). Thumb-reachable, 64px tall,
 * respects the iPhone home-indicator safe area. The active tab gets a pollen-yellow mark.
 */
export function BottomNav({ cartCount = 0 }: { cartCount?: number }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // Product pages and checkout show their own action bar in this spot instead.
  if (pathname.startsWith("/p/") || pathname.startsWith("/checkout")) return null;
  return (
    <nav
      aria-label={t("bottomNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 pb-safe backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid h-[var(--bottom-nav-height)] max-w-md grid-cols-5">
        {ITEMS.map(({ href, key, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon
                    className="size-[1.4rem]"
                    strokeWidth={active ? 2.2 : 1.8}
                    aria-hidden="true"
                  />
                  {key === "cart" && cartCount > 0 ? (
                    <span className="absolute -end-2.5 -top-1.5 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-bold text-primary-foreground tabular">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  ) : null}
                </span>
                {t(key)}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-1 w-8 rounded-b-full bg-accent"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
