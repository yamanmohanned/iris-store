import { Search, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pager } from "@/components/admin/pager";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/server/auth/session";
import { listCustomersAdmin } from "@/server/services/people-admin";
import { getStoreContext } from "@/server/store-context";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/customers">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.customers",
  });
  return { title: t("title") };
}

export default async function AdminCustomersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/customers">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "customers:read");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = (one(sp.q) ?? "").slice(0, 100);
  const status = one(sp.status) === "suspended" ? "suspended" : "all";
  const page = Math.min(1000, Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1));

  const [t, ctx, result] = await Promise.all([
    getTranslations("admin.customers"),
    getStoreContext(locale),
    listCustomersAdmin({ q, status, page, pageSize: 25 }),
  ]);
  const money = (n: number) => formatMoney(n, ctx.currency, locale);
  const day = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeZone: ctx.settings.general.timeZone,
  });
  const hrefFor = (next: { status?: string; page?: number }) => ({
    pathname: "/admin/customers",
    query: {
      ...((next.status ?? status) === "suspended" ? { status: "suspended" } : {}),
      ...(q ? { q } : {}),
      ...((next.page ?? 1) > 1 ? { page: next.page } : {}),
    },
  });
  const phone = (p: string | null) => (p ? formatPhone(p, ctx.settings.general.phoneCode) : null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[1.8rem] leading-tight font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      <form role="search" className="flex gap-2" action="">
        {status === "suspended" ? <input type="hidden" name="status" value="suspended" /> : null}
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
      </form>

      <nav className="flex gap-2" aria-label={t("filters")}>
        {(["all", "suspended"] as const).map((s) => (
          <Link
            key={s}
            href={hrefFor({ status: s })}
            aria-current={s === status ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              s === status
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-surface hover:border-primary/40",
            )}
          >
            {t(`tabs.${s}`)}
            {s === "suspended" ? (
              <span className="text-xs tabular opacity-80">{result.suspended}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          <UserRound className="mb-3 size-8 text-primary" aria-hidden="true" />
          {q ? t("noMatch") : t("empty")}
        </div>
      ) : (
        <>
          <ul className="space-y-2.5 lg:hidden">
            {result.items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="block rounded-2xl border bg-surface p-3.5 shadow-card"
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 truncate font-semibold">{c.name}</span>
                    {c.banned ? <Badge tone="danger">{t("suspended")}</Badge> : null}
                    <bdi className="ms-auto text-sm font-semibold tabular">
                      {money(c.totalSpent)}
                    </bdi>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    <bdi dir="ltr">{c.email}</bdi>
                    {c.phone ? (
                      <>
                        {" · "}
                        <bdi dir="ltr">{phone(c.phone)}</bdi>
                      </>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t("ordersCount", { count: c.orderCount })} ·{" "}
                    {t("joined", { date: day.format(new Date(c.createdAt)) })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border bg-surface shadow-card lg:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-surface-muted/60 text-xs text-muted-foreground">
                <tr>
                  {(["customer", "contact", "orders", "spent", "lastOrder", "joined"] as const).map(
                    (col) => (
                      <th
                        key={col}
                        scope="col"
                        className={cn(
                          "px-4 py-2.5 text-start font-medium",
                          (col === "orders" || col === "spent") && "text-end",
                        )}
                      >
                        {t(`columns.${col}`)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {c.name}
                      </Link>
                      {c.banned ? (
                        <Badge tone="danger" className="ms-2">
                          {t("suspended")}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <bdi dir="ltr" className="block">
                        {c.email}
                      </bdi>
                      {c.phone ? (
                        <bdi dir="ltr" className="block text-xs">
                          {phone(c.phone)}
                        </bdi>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-end tabular">{c.orderCount}</td>
                    <td className="px-4 py-3 text-end font-medium tabular">
                      {money(c.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.lastOrderAt ? day.format(new Date(c.lastOrderAt)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {day.format(new Date(c.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Pager
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        hrefFor={(p) => hrefFor({ page: p })}
      />
      <p className="text-xs text-muted-foreground">{t("guestsHint")}</p>
    </div>
  );
}
