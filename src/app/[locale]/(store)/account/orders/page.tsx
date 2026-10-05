import { ChevronLeft, Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/store/empty-state";
import { OrderStatusBadge } from "@/components/store/order/order-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { formatMoney } from "@/lib/money";
import { requireUserPage } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/services/orders";
import { getStoreContext } from "@/server/store-context";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/orders">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "account.orders",
  });
  return { title: t("title"), robots: { index: false } };
}

export default async function OrdersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account/orders">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const session = await requireUserPage(locale, "/account/orders");
  const rawPage = Number((await searchParams).page);
  const page = Number.isInteger(rawPage) && rawPage > 1 && rawPage <= 500 ? rawPage : 1;
  const [t, tOrder, ctx, { items, hasMore }] = await Promise.all([
    getTranslations("account.orders"),
    getTranslations("order"),
    getStoreContext(locale),
    listOrdersForUser(session.user.id, page),
  ]);
  const date = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeZone: ctx.settings.general.timeZone,
  });

  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        {(await getTranslations("account"))("title")}
      </Link>
      <h1 className="mt-1 font-display text-[1.7rem] leading-tight font-bold">{t("title")}</h1>

      {items.length === 0 && page === 1 ? (
        <EmptyState
          icon={Package}
          title={t("empty")}
          body={t("emptyBody")}
          action={
            <Link href="/categories" className={buttonVariants({ size: "lg" })}>
              {t("shopNow")}
            </Link>
          }
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((o) => (
            <li key={o.orderNumber}>
              <Link
                href={`/account/orders/${o.orderNumber}`}
                className="flex items-center gap-3 rounded-2xl border bg-surface p-3 shadow-card transition-colors hover:border-primary/40"
              >
                <span className="block aspect-[4/5] w-14 shrink-0 overflow-hidden petal-sm bg-surface-muted">
                  {o.firstImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- stored thumbnail URL snapshot
                    <img
                      src={o.firstImage}
                      alt=""
                      width={56}
                      height={70}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <bdi dir="ltr" className="font-semibold tabular">
                      #{o.orderNumber}
                    </bdi>
                    <OrderStatusBadge status={o.status} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {date.format(new Date(o.placedAt))} ·{" "}
                    {tOrder("itemsCount", { count: o.itemCount })}
                  </span>
                  <bdi className="block text-sm font-semibold tabular">
                    {formatMoney(o.grandTotal, ctx.currency, locale)}
                  </bdi>
                </span>
                <ChevronLeft
                  className="size-4 shrink-0 text-muted-foreground ltr:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {page > 1 || hasMore ? (
        <nav className="mt-6 flex justify-between gap-3" aria-label={t("title")}>
          {page > 1 ? (
            <Link
              href={{ pathname: "/account/orders", query: page > 2 ? { page: page - 1 } : {} }}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          {hasMore ? (
            <Link
              href={{ pathname: "/account/orders", query: { page: page + 1 } }}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("older")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
