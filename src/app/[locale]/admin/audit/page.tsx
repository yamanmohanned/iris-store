import { ScrollText, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pager } from "@/components/admin/pager";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/server/auth/session";
import {
  AUDIT_CATEGORY_KEYS,
  listAuditLogs,
  type AuditCategory,
  type AuditRow,
} from "@/server/services/audit-admin";
import { EDITABLE_SECTIONS } from "@/server/services/settings-admin";
import { getSetting } from "@/server/services/settings";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/audit">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.audit",
  });
  return { title: t("title") };
}

/** Where an entry's subject lives in the dashboard (when it has a page). */
function entityHref(row: AuditRow): string | null {
  const id = row.entityId;
  if (!id) return null;
  switch (row.entityType) {
    case "order":
      return /^\d+$/.test(id) ? `/admin/orders/${id}` : null;
    case "product":
      return `/admin/products/${id}`;
    case "page":
      return row.action === "page.delete" ? null : `/admin/pages/${id}`;
    case "home_section":
      return row.action === "home_section.delete" ? null : `/admin/storefront/${id}`;
    case "coupon":
      return "/admin/coupons";
    case "shipping_zone":
      return "/admin/shipping";
    case "category":
      return "/admin/categories";
    case "settings":
      return (EDITABLE_SECTIONS as readonly string[]).includes(id) ? `/admin/settings/${id}` : null;
    default:
      return null;
  }
}

/** Sign-in routes (recorded as "via") → how the person signed in. */
const VIA: Record<string, "password" | "totp" | "backupCode" | "emailCode" | "google"> = {
  "/sign-in/email": "password",
  "/two-factor/verify-totp": "totp",
  "/two-factor/verify-backup-code": "backupCode",
  "/sign-in/email-otp": "emailCode",
  "/email-otp/verify-email": "emailCode",
  "/callback/google": "google",
};

const SHOWN_KEYS = [
  "from",
  "to",
  "reason",
  "email",
  "code",
  "slug",
  "type",
  "fields",
  "name",
  "direction",
  "sessions",
  "via",
];

export default async function AdminAuditPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/audit">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "audit:read");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = (one(sp.q) ?? "").slice(0, 100);
  const raw = one(sp.category);
  const category = AUDIT_CATEGORY_KEYS.includes(raw as AuditCategory)
    ? (raw as AuditCategory)
    : undefined;
  const page = Math.min(1000, Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1));

  const [t, general, result] = await Promise.all([
    getTranslations("admin.audit"),
    getSetting("general"),
    listAuditLogs({ category, q, page, pageSize: 50 }),
  ]);
  const when = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: general.timeZone,
  });
  const hrefFor = (next: { category?: AuditCategory | null; page?: number }) => {
    const c = next.category === null ? undefined : (next.category ?? category);
    return {
      pathname: "/admin/audit",
      query: {
        ...(c ? { category: c } : {}),
        ...(q ? { q } : {}),
        ...((next.page ?? 1) > 1 ? { page: next.page } : {}),
      },
    };
  };
  const label = (action: string) =>
    t.has(`actions.${action}` as "actions.cache.clear")
      ? t(`actions.${action}` as "actions.cache.clear")
      : action;
  const keyLabel = (key: string) =>
    t.has(`keys.${key}` as "keys.from") ? t(`keys.${key}` as "keys.from") : key;
  const show = (key: string, value: unknown) => {
    const via = key === "via" && typeof value === "string" ? VIA[value] : undefined;
    if (via) return t(`via.${via}`);
    return (Array.isArray(value) ? value.join("، ") : String(value ?? "")).slice(0, 120);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[1.8rem] leading-tight font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      <form role="search" className="flex gap-2" action="">
        {category ? <input type="hidden" name="category" value={category} /> : null}
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

      <nav
        className="-mx-4 rail auto-cols-max gap-2 px-4 sm:mx-0 sm:flex sm:flex-wrap sm:px-0"
        aria-label={t("filters")}
      >
        {([null, ...AUDIT_CATEGORY_KEYS] as const).map((c) => {
          const active = (c ?? undefined) === category;
          return (
            <Link
              key={c ?? "all"}
              href={hrefFor({ category: c })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-surface hover:border-primary/40",
              )}
            >
              {t(`categories.${c ?? "all"}`)}
            </Link>
          );
        })}
      </nav>

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          <ScrollText className="mb-3 size-8 text-primary" aria-hidden="true" />
          {t("empty")}
        </div>
      ) : (
        <ol className="divide-y overflow-hidden rounded-2xl border bg-surface shadow-card">
          {result.items.map((row) => {
            const href = entityHref(row);
            const details = Object.entries(row.metadata ?? {}).filter(
              ([k, v]) => SHOWN_KEYS.includes(k) && v !== null && v !== "",
            );
            return (
              <li key={row.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="font-medium">
                    {label(row.action)}
                    {href ? (
                      <>
                        {" · "}
                        <Link href={href} className="text-primary hover:underline">
                          {row.entityType === "order" ? `#${row.entityId}` : t("open")}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <time dateTime={row.createdAt} className="text-xs text-muted-foreground tabular">
                    {when.format(new Date(row.createdAt))}
                  </time>
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  {row.actorName ?? t("system")}
                  {row.actorEmail ? (
                    <>
                      {" · "}
                      <bdi dir="ltr">{row.actorEmail}</bdi>
                    </>
                  ) : null}
                  {row.ipAddress ? (
                    <>
                      {" · "}
                      <bdi dir="ltr">{row.ipAddress}</bdi>
                    </>
                  ) : null}
                </p>
                {details.length ? (
                  <dl className="mt-1.5 flex flex-wrap gap-1.5">
                    {details.map(([k, v]) => (
                      <div
                        key={k}
                        className="inline-flex gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs"
                      >
                        <dt className="text-muted-foreground">{keyLabel(k)}:</dt>
                        <dd>
                          <bdi>{show(k, v)}</bdi>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <Pager
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        hrefFor={(p) => hrefFor({ page: p })}
      />
    </div>
  );
}
