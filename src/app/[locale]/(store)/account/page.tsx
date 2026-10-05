import {
  ChevronLeft,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderStatusBadge } from "@/components/store/order/order-status-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { formatMoney } from "@/lib/money";
import { isStaffRole } from "@/server/auth/permissions";
import { requireUserPage } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/services/orders";
import { getStoreContext } from "@/server/store-context";
import { signOutAction } from "../../(auth)/actions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "account",
  });
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const session = await requireUserPage(locale, "/account");
  const [t, tAuth, ctx, latest] = await Promise.all([
    getTranslations("account"),
    getTranslations("auth"),
    getStoreContext(locale),
    listOrdersForUser(session.user.id, 1, 1),
  ]);
  const lastOrder = latest.items[0];
  const tiles: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
    { href: "/account/orders", label: t("hub.orders"), hint: t("hub.ordersHint"), icon: Package },
    {
      href: "/account/addresses",
      label: t("hub.addresses"),
      hint: t("hub.addressesHint"),
      icon: MapPin,
    },
    {
      href: "/account/wishlist",
      label: t("hub.wishlist"),
      hint: t("hub.wishlistHint"),
      icon: Heart,
    },
    {
      href: "/account/security",
      label: t("hub.security"),
      hint: t("hub.securityHint"),
      icon: ShieldCheck,
    },
    ...(isStaffRole(session.user.role as string)
      ? [{ href: "/admin", label: t("hub.admin"), hint: t("hub.adminHint"), icon: LayoutDashboard }]
      : []),
  ];
  const initial = (session.user.name || session.user.email).trim().charAt(0).toUpperCase();

  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <div className="flex items-center gap-4">
        <span
          className="inline-flex size-14 shrink-0 items-center justify-center petal-sm bg-primary-soft font-display text-2xl font-bold text-primary"
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0" data-testid="account-greeting">
          <h1 className="font-display text-[1.6rem] leading-tight font-bold">
            {t("hub.hello", { name: session.user.name.split(" ")[0] ?? "" })}
          </h1>
          <p className="truncate text-sm text-muted-foreground" dir="ltr">
            {session.user.email}
          </p>
        </div>
      </div>

      {lastOrder ? (
        <Link
          href={`/account/orders/${lastOrder.orderNumber}`}
          className="mt-6 flex items-center gap-3 rounded-2xl border bg-surface p-3 shadow-card hover:border-primary/40"
        >
          <span className="block aspect-[4/5] w-12 shrink-0 overflow-hidden petal-sm bg-surface-muted">
            {lastOrder.firstImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- stored thumbnail URL snapshot
              <img
                src={lastOrder.firstImage}
                alt=""
                width={48}
                height={60}
                className="size-full object-cover"
              />
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <bdi dir="ltr" className="font-semibold tabular">
                #{lastOrder.orderNumber}
              </bdi>
              <OrderStatusBadge status={lastOrder.status} />
            </span>
            <bdi className="text-sm text-muted-foreground tabular">
              {formatMoney(lastOrder.grandTotal, ctx.currency, locale)}
            </bdi>
          </span>
          <ChevronLeft className="size-4 text-muted-foreground ltr:rotate-180" aria-hidden="true" />
        </Link>
      ) : null}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {tiles.map(({ href, label, hint, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full items-center gap-3 rounded-2xl border bg-surface p-4 shadow-card transition-colors hover:border-primary/40"
            >
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
              <ChevronLeft
                className="size-4 text-muted-foreground ltr:rotate-180"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>

      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="outline">
          <LogOut />
          {tAuth("signOut")}
        </Button>
      </form>
    </div>
  );
}
