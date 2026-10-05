import { AlertTriangle, ChevronLeft, PackageCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SalesChart } from "@/components/admin/sales-chart";
import { OrderStatusBadge } from "@/components/store/order/order-status-badge";
import { Alert } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/server/auth/permissions";
import { requireStaffPage } from "@/server/auth/session";
import { listOrdersAdmin } from "@/server/services/admin-orders";
import { dashboardStats } from "@/server/services/reports";
import { getStoreContext } from "@/server/store-context";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin",
  });
  return { title: t("title") };
}

export default async function AdminHome({ params, searchParams }: PageProps<"/[locale]/admin">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const { session, actor } = await requireStaffPage(locale);
  const canOrders = hasPermission(actor.role, "orders:read");
  const [t, ctx, stats, recent] = await Promise.all([
    getTranslations("admin.dashboard"),
    getStoreContext(locale),
    dashboardStats(),
    canOrders ? listOrdersAdmin({ pageSize: 6 }) : Promise.resolve(null),
  ]);
  const tAdmin = await getTranslations("admin");
  const money = (n: number) => formatMoney(n, ctx.currency, locale);
  const when = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: ctx.settings.general.timeZone,
  });
  const periodTotal = stats.daily.reduce((s, d) => s + d.revenue, 0);
  const bestDay = Math.max(0, ...stats.daily.map((d) => d.revenue));

  const tiles = [
    {
      label: t("revenueToday"),
      value: money(stats.revenueToday),
      sub: t("ordersToday", { count: stats.ordersToday }),
    },
    {
      label: t("revenue7d"),
      value: money(stats.revenue7d),
      sub: t("ordersToday", { count: stats.orders7d }),
    },
    {
      label: t("pending"),
      value: String(stats.pending),
      sub: stats.pending ? t("needsAction") : null,
      href: canOrders ? "/admin/orders?status=pending" : undefined,
      attention: stats.pending > 0,
    },
    {
      label: t("toShip"),
      value: String(stats.toShip),
      sub: null,
      href: canOrders ? "/admin/orders?status=open" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[1.8rem] leading-tight font-bold">
          {t("hello", { name: session.user.name.split(" ")[0] ?? "" })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      {(await searchParams).denied ? <Alert tone="warning">{tAdmin("denied")}</Alert> : null}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <span className="text-xs font-medium text-muted-foreground">{tile.label}</span>
              <bdi className="mt-1 block text-[1.45rem] leading-tight font-semibold sm:text-2xl">
                {tile.value}
              </bdi>
              {tile.sub ? (
                <span
                  className={cn(
                    "mt-1 block text-xs",
                    tile.attention ? "font-semibold text-warning" : "text-muted-foreground",
                  )}
                >
                  {tile.sub}
                </span>
              ) : null}
            </>
          );
          const cls = cn(
            "block h-full rounded-2xl border bg-surface p-4 shadow-card",
            tile.attention && "border-warning/50",
            tile.href && "transition-colors hover:border-primary/40",
          );
          return (
            <li key={tile.label}>
              {tile.href ? (
                <Link href={tile.href} className={cls}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <SalesChart
        points={stats.daily}
        currency={ctx.currency}
        title={t("salesChart")}
        caption={t("salesChartSummary", { total: money(periodTotal), best: money(bestDay) })}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {recent ? (
          <section className="rounded-2xl border bg-surface shadow-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">{t("recentOrders")}</h2>
              <Link
                href="/admin/orders"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("viewAll")}
              </Link>
            </div>
            {recent.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noOrders")}</p>
            ) : (
              <ul className="divide-y">
                {recent.items.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.orderNumber}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <bdi dir="ltr" className="font-semibold tabular">
                            #{o.orderNumber}
                          </bdi>
                          <OrderStatusBadge status={o.status} />
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {o.customerName} · {o.city} · {when.format(new Date(o.placedAt))}
                        </span>
                      </span>
                      <bdi className="text-sm font-semibold tabular">{money(o.grandTotal)}</bdi>
                      <ChevronLeft
                        className="size-4 shrink-0 text-muted-foreground ltr:rotate-180"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <div className="space-y-6">
          <section className="rounded-2xl border bg-surface shadow-card">
            <h2 className="border-b px-4 py-3 font-semibold">{t("topProducts")}</h2>
            {stats.topProducts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("noSales")}</p>
            ) : (
              <ol className="divide-y">
                {stats.topProducts.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-4 text-muted-foreground tabular">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{tl(p.name, locale)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("units", { count: p.units })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border bg-surface shadow-card">
            <h2 className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
              {t("lowStockList")}
              {stats.lowStockCount ? (
                <span className="rounded-full bg-warning-soft px-2 text-xs font-bold text-warning tabular">
                  {stats.lowStockCount}
                </span>
              ) : null}
            </h2>
            {stats.lowStock.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <PackageCheck className="size-4 text-success" aria-hidden="true" />
                {t("allGood")}
              </p>
            ) : (
              <ul className="divide-y">
                {stats.lowStock.map((v, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <AlertTriangle
                      className={cn(
                        "size-4 shrink-0",
                        v.stock === 0 ? "text-danger" : "text-warning",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {tl(v.name, locale)}
                      {v.options.length ? (
                        <span className="text-muted-foreground"> · {v.options.join(" / ")}</span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        v.stock === 0 ? "text-danger" : "text-warning",
                      )}
                    >
                      {t("left", { count: v.stock })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
