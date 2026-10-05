import { ChevronLeft, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderStatusBadge } from "@/components/store/order/order-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { formatMoney } from "@/lib/money";
import { OPEN_STATUSES } from "@/lib/order-status";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/server/auth/session";
import { ORDER_STATUSES, type OrderStatus } from "@/server/db/schema";
import { listOrdersAdmin, type AdminOrderFilter } from "@/server/services/admin-orders";
import { getStoreContext } from "@/server/store-context";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/orders">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.orders",
  });
  return { title: t("title") };
}

const TABS = [
  "open",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "all",
] as const;
type Tab = (typeof TABS)[number];

export default async function AdminOrdersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/orders">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "orders:read");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = (one(sp.q) ?? "").slice(0, 100);
  const statusParam = one(sp.status) as Tab | undefined;
  const tab: Tab = statusParam && TABS.includes(statusParam) ? statusParam : "open";
  const page = Math.min(1000, Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1));

  const [t, tOrder, ctx, result] = await Promise.all([
    getTranslations("admin.orders"),
    getTranslations("order"),
    getStoreContext(locale),
    listOrdersAdmin({ status: tab as AdminOrderFilter["status"], q, page, pageSize: 25 }),
  ]);
  const money = (n: number) => formatMoney(n, ctx.currency, locale);
  const when = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ctx.settings.general.timeZone,
  });
  const countOf = (s: Tab) =>
    s === "all"
      ? ORDER_STATUSES.reduce((n, k) => n + result.counts[k], 0)
      : s === "open"
        ? OPEN_STATUSES.reduce((n, k) => n + result.counts[k as OrderStatus], 0)
        : result.counts[s];
  const hrefFor = (next: Partial<{ status: Tab; page: number }>) => ({
    pathname: "/admin/orders",
    query: {
      ...((next.status ?? tab) !== "open" ? { status: next.status ?? tab } : {}),
      ...(q ? { q } : {}),
      ...((next.page ?? 1) > 1 ? { page: next.page } : {}),
    },
  });
  const from = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[1.8rem] leading-tight font-bold">{t("title")}</h1>

      <form role="search" className="flex gap-2" action="">
        {tab !== "open" ? <input type="hidden" name="status" value={tab} /> : null}
        <label className="relative flex-1">
          <span className="sr-only">{t("search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input name="q" defaultValue={q} placeholder={t("search")} className="h-11 ps-9" />
        </label>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary", className: "h-11" })}
        >
          {t("searchButton")}
        </button>
        {q ? (
          <Link
            href={hrefFor({})}
            className={buttonVariants({ variant: "ghost", className: "h-11" })}
          >
            {t("clear")}
          </Link>
        ) : null}
      </form>

      <nav
        className="-mx-4 rail auto-cols-max gap-2 px-4 sm:mx-0 sm:flex sm:flex-wrap sm:px-0"
        aria-label={t("title")}
      >
        {TABS.map((s) => {
          const active = s === tab;
          return (
            <Link
              key={s}
              href={hrefFor({ status: s })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-surface hover:border-primary/40",
              )}
            >
              {s === "open" || s === "all" ? t(`tabs.${s}`) : tOrder(`statuses.${s}`)}
              <span
                className={cn(
                  "text-xs tabular",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {countOf(s)}
              </span>
            </Link>
          );
        })}
      </nav>

      {result.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <>
          {/* Phones: cards */}
          <ul className="space-y-2.5 lg:hidden">
            {result.items.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.orderNumber}`}
                  className="block rounded-2xl border bg-surface p-3.5 shadow-card"
                >
                  <span className="flex items-center gap-2">
                    <bdi dir="ltr" className="font-semibold tabular">
                      #{o.orderNumber}
                    </bdi>
                    <OrderStatusBadge status={o.status} />
                    <bdi className="ms-auto text-sm font-semibold tabular">
                      {money(o.grandTotal)}
                    </bdi>
                  </span>
                  <span className="mt-1 block truncate text-sm">
                    {o.customerName} ·{" "}
                    <bdi dir="ltr">
                      {formatPhone(o.customerPhone, ctx.settings.general.phoneCode)}
                    </bdi>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {o.city} · {when.format(new Date(o.placedAt))} ·{" "}
                    {tOrder("itemsCount", { count: o.itemCount })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-surface shadow-card lg:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-surface-muted/60 text-xs text-muted-foreground">
                <tr>
                  {(
                    [
                      "number",
                      "customer",
                      "city",
                      "date",
                      "items",
                      "status",
                      "payment",
                      "total",
                    ] as const
                  ).map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className={cn(
                        "px-4 py-2.5 text-start font-medium",
                        c === "total" && "text-end",
                      )}
                    >
                      {t(`columns.${c}`)}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((o) => (
                  <tr key={o.id} className="group relative hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${o.orderNumber}`}
                        className="font-semibold tabular after:absolute after:inset-0"
                        dir="ltr"
                      >
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{o.customerName}</span>
                      <bdi dir="ltr" className="text-xs text-muted-foreground">
                        {formatPhone(o.customerPhone, ctx.settings.general.phoneCode)}
                      </bdi>
                    </td>
                    <td className="px-4 py-3">{o.city}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {when.format(new Date(o.placedAt))}
                    </td>
                    <td className="px-4 py-3 tabular">{o.itemCount}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          o.paymentStatus === "paid"
                            ? "font-medium text-success"
                            : "text-muted-foreground"
                        }
                      >
                        {tOrder(`paymentStatuses.${o.paymentStatus}`)}
                      </span>
                      <span className="block text-muted-foreground">
                        {tOrder(`paymentMethods.${o.paymentMethod as "cod"}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end font-semibold tabular">
                      <bdi>{money(o.grandTotal)}</bdi>
                    </td>
                    <td className="pe-3">
                      <ChevronLeft
                        className="size-4 text-muted-foreground ltr:rotate-180"
                        aria-hidden="true"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {result.total > result.pageSize ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground tabular">
            {t("showing", { from, to, total: result.total })}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={hrefFor({ page: result.page - 1 })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("prev")}
              </Link>
            ) : null}
            {to < result.total ? (
              <Link
                href={hrefFor({ page: result.page + 1 })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("next")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
