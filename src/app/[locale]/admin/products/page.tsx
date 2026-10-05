import { ChevronLeft, Plus, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MediaImage } from "@/components/store/media-image";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/server/auth/permissions";
import { requireStaffPage } from "@/server/auth/session";
import { PRODUCT_STATUSES, type ProductStatus } from "@/server/db/schema";
import { listProductsAdmin, type AdminProductRow } from "@/server/services/admin-catalog";
import { getStoreContext } from "@/server/store-context";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.products",
  });
  return { title: t("title") };
}

const STATUS_TONE: Record<ProductStatus, "success" | "neutral" | "warning"> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
};

export default async function AdminProductsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/products">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const { actor } = await requireStaffPage(locale, "products:read");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = (one(sp.q) ?? "").slice(0, 100);
  const statusParam = one(sp.status);
  const status =
    statusParam && (PRODUCT_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as ProductStatus)
      : "all";
  const stockParam = one(sp.stock);
  const stock = stockParam === "low" || stockParam === "out" ? stockParam : undefined;
  const page = Math.min(1000, Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1));
  const canWrite = hasPermission(actor.role, "products:write");

  const [t, ctx, result] = await Promise.all([
    getTranslations("admin.products"),
    getStoreContext(locale),
    listProductsAdmin({ q, status, stock, page }),
  ]);
  const tOrders = await getTranslations("admin.orders");
  const money = (n: number) => formatMoney(n, ctx.currency, locale);
  const priceOf = (p: AdminProductRow) =>
    p.maxPrice > p.minPrice ? `${money(p.minPrice)} – ${money(p.maxPrice)}` : money(p.minPrice);
  const stockOf = (p: AdminProductRow) =>
    p.stock === null ? t("unlimited") : t("units", { count: p.stock });
  const hrefFor = (next: { status?: string; stock?: string | null; page?: number }) => ({
    pathname: "/admin/products",
    query: {
      ...((next.status ?? status) !== "all" ? { status: next.status ?? status } : {}),
      ...((next.stock === undefined ? stock : next.stock)
        ? { stock: next.stock === undefined ? stock : next.stock }
        : {}),
      ...(q ? { q } : {}),
      ...((next.page ?? 1) > 1 ? { page: next.page } : {}),
    },
  });
  const allCount = PRODUCT_STATUSES.reduce((n, s) => n + result.counts[s], 0);
  const to = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[1.8rem] leading-tight font-bold">{t("title")}</h1>
        {canWrite ? (
          <Link href="/admin/products/new" className={buttonVariants({})}>
            <Plus />
            {t("new")}
          </Link>
        ) : null}
      </div>

      <form role="search" className="flex gap-2">
        {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
        {stock ? <input type="hidden" name="stock" value={stock} /> : null}
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
          {tOrders("searchButton")}
        </button>
      </form>

      <nav
        className="-mx-4 rail auto-cols-max gap-2 px-4 sm:mx-0 sm:flex sm:flex-wrap sm:px-0"
        aria-label={t("title")}
      >
        {(["all", ...PRODUCT_STATUSES] as const).map((s) => (
          <Chip
            key={s}
            href={hrefFor({ status: s, page: 1 })}
            active={s === status}
            count={s === "all" ? allCount : result.counts[s]}
          >
            {t(`tabs.${s}`)}
          </Chip>
        ))}
        {(["low", "out"] as const).map((s) => (
          <Chip
            key={s}
            href={hrefFor({ stock: stock === s ? null : s, page: 1 })}
            active={stock === s}
            tone="warning"
          >
            {t(`stockFilters.${s}`)}
          </Chip>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          {allCount === 0 ? t("emptyStore") : t("empty")}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-surface shadow-card">
          {result.items.map((p) => (
            <li key={p.id}>
              <Link
                href={canWrite ? `/admin/products/${p.id}` : `/p/${p.slug}`}
                className="flex items-center gap-3 px-3 py-3 hover:bg-surface-muted/60 sm:px-4"
              >
                <span className="block size-14 shrink-0 overflow-hidden petal-sm bg-surface-muted">
                  <MediaImage
                    image={p.image}
                    sizes="56px"
                    alt=""
                    locale={locale}
                    className="size-full"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium">{tl(p.name, locale)}</span>
                    <Badge tone={STATUS_TONE[p.status]}>{t(`tabs.${p.status}`)}</Badge>
                    {p.isFeatured ? <Badge tone="primary">{t("featured")}</Badge> : null}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <bdi className="tabular">{priceOf(p)}</bdi>
                    <span className={cn(!p.inStock && "font-semibold text-danger")}>
                      {p.inStock ? stockOf(p) : t("outOfStock")}
                    </span>
                    {p.variantCount > 1 ? (
                      <span>{t("variantsCount", { count: p.variantCount })}</span>
                    ) : null}
                  </span>
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

      {result.total > result.pageSize ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground tabular">
            {tOrders("showing", {
              from: (result.page - 1) * result.pageSize + 1,
              to,
              total: result.total,
            })}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={hrefFor({ page: result.page - 1 })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {tOrders("prev")}
              </Link>
            ) : null}
            {to < result.total ? (
              <Link
                href={hrefFor({ page: result.page + 1 })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {tOrders("next")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  href,
  active,
  count,
  tone,
  children,
}: {
  href: React.ComponentProps<typeof Link>["href"];
  active: boolean;
  count?: number;
  tone?: "warning";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap",
        active
          ? tone === "warning"
            ? "border-warning bg-warning-soft text-foreground"
            : "border-primary bg-primary text-primary-foreground"
          : "bg-surface hover:border-primary/40",
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "text-xs tabular",
            active && tone !== "warning" ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
