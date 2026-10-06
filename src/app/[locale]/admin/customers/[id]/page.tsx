import { BadgeCheck, ChevronRight, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { CustomerActions } from "@/components/admin/customer-actions";
import { OrderStatusBadge } from "@/components/store/order/order-status-badge";
import { Badge } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { hasPermission } from "@/server/auth/permissions";
import { requireStaffPage } from "@/server/auth/session";
import { getCustomerAdmin } from "@/server/services/people-admin";
import { getStoreContext, whatsappNumber } from "@/server/store-context";
import { revokeCustomerSessionsAction, setCustomerSuspendedAction } from "../actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/customers/[id]">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.customers",
  });
  return { title: t("title") };
}

export default async function AdminCustomerPage({
  params,
}: PageProps<"/[locale]/admin/customers/[id]">) {
  const { locale: raw, id } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  const { actor } = await requireStaffPage(locale, "customers:read");
  if (!z.uuid().safeParse(id).success) notFound();
  const [customer, t, ctx] = await Promise.all([
    getCustomerAdmin(id),
    getTranslations("admin.customers"),
    getStoreContext(locale),
  ]);
  if (!customer) notFound();
  const canWrite = hasPermission(actor.role, "customers:write");
  const canSeeOrders = hasPermission(actor.role, "orders:read");
  const money = (n: number) => formatMoney(n, ctx.currency, locale);
  const tz = ctx.settings.general.timeZone;
  const day = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { dateStyle: "medium", timeZone: tz });
  const when = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: tz,
  });
  const phone = customer.phone ? formatPhone(customer.phone, ctx.settings.general.phoneCode) : null;
  const wa = customer.phone ? whatsappNumber(customer.phone) : null;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4 ltr:rotate-180" aria-hidden="true" />
          {t("title")}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[1.8rem] leading-tight font-bold">{customer.name}</h1>
          {customer.banned ? <Badge tone="danger">{t("suspended")}</Badge> : null}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <bdi dir="ltr">{customer.email}</bdi>
            {customer.emailVerified ? (
              <BadgeCheck className="size-4 text-success" aria-label={t("verified")} />
            ) : null}
          </span>
          {phone ? <bdi dir="ltr">{phone}</bdi> : null}
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              {t("whatsapp")}
            </a>
          ) : null}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2.5">
        {(
          [
            ["orders", String(customer.orderCount)],
            ["spent", money(customer.totalSpent)],
            ["average", customer.orderCount ? money(customer.averageOrder) : "—"],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-2xl border bg-surface p-3 shadow-card sm:p-4">
            <dt className="text-xs text-muted-foreground">{t(`stats.${key}`)}</dt>
            <dd className="mt-1 text-base font-bold tabular sm:text-lg">
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section className="rounded-2xl border bg-surface shadow-card">
          <h2 className="border-b px-4 py-3 font-semibold">{t("recentOrders")}</h2>
          {customer.orders.length ? (
            <ul className="divide-y">
              {customer.orders.map((o) => {
                const content = (
                  <>
                    <bdi dir="ltr" className="font-semibold tabular">
                      #{o.orderNumber}
                    </bdi>
                    <OrderStatusBadge status={o.status} />
                    <span className="text-xs text-muted-foreground">
                      {when.format(new Date(o.placedAt))}
                    </span>
                    <bdi className="ms-auto font-medium tabular">{money(o.grandTotal)}</bdi>
                  </>
                );
                return (
                  <li key={o.orderNumber}>
                    {canSeeOrders ? (
                      <Link
                        href={`/admin/orders/${o.orderNumber}`}
                        className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm hover:bg-surface-muted/50"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noOrders")}</p>
          )}
        </section>

        <div className="space-y-5">
          <CustomerActions
            userId={customer.id}
            banned={customer.banned}
            banReason={customer.banReason}
            activeSessions={customer.activeSessions}
            canWrite={canWrite}
            suspend={setCustomerSuspendedAction}
            signOut={revokeCustomerSessionsAction}
          />
          <section className="space-y-2 rounded-2xl border bg-surface p-4 text-sm shadow-card">
            <h2 className="font-semibold">{t("details")}</h2>
            <p className="text-muted-foreground">
              {t("joined", { date: day.format(new Date(customer.createdAt)) })}
            </p>
            <p className="text-muted-foreground">
              {customer.lastLoginAt
                ? t("lastLogin", { date: when.format(new Date(customer.lastLoginAt)) })
                : t("neverLoggedIn")}
            </p>
            <p className="text-muted-foreground">
              {customer.marketingOptIn ? t("marketingYes") : t("marketingNo")}
            </p>
          </section>
          <section className="rounded-2xl border bg-surface p-4 text-sm shadow-card">
            <h2 className="font-semibold">{t("addresses")}</h2>
            {customer.addresses.length ? (
              <ul className="mt-2 space-y-3">
                {customer.addresses.map((a) => (
                  <li key={a.id}>
                    <p className="font-medium">
                      {a.label || a.fullName}
                      {a.isDefault ? (
                        <Badge tone="primary" className="ms-2">
                          {t("default")}
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground">
                      {[a.city, a.area, a.street, a.landmark].filter(Boolean).join("، ")}
                    </p>
                    <bdi dir="ltr" className="text-muted-foreground">
                      {formatPhone(a.phone, ctx.settings.general.phoneCode)}
                    </bdi>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">{t("noAddresses")}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
