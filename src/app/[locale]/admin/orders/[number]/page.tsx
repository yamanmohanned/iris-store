import { ArrowRight, Mail, MapPin, Phone, User } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AddNoteForm,
  CopyButton,
  InternalNoteForm,
  OrderStatusActions,
  PaymentActions,
  PrintButton,
} from "@/components/admin/order-actions";
import { BrandIcon } from "@/components/store/brand-icon";
import { OrderStatusBadge } from "@/components/store/order/order-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/server/auth/permissions";
import { requireStaffPage } from "@/server/auth/session";
import { getOrderAdmin } from "@/server/services/admin-orders";
import { getStoreContext, whatsappNumber } from "@/server/store-context";
import {
  addOrderNoteAction,
  changeOrderStatusAction,
  changePaymentStatusAction,
  saveInternalNoteAction,
} from "../actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/orders/[number]">) {
  const { number } = await params;
  return { title: `#${number.replace(/\D/g, "")}` };
}

export default async function AdminOrderPage({
  params,
}: PageProps<"/[locale]/admin/orders/[number]">) {
  const { locale: raw, number } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  const { actor } = await requireStaffPage(locale, "orders:read");
  const order = /^\d{1,15}$/.test(number) ? await getOrderAdmin(Number(number)) : null;
  if (!order) notFound();

  const [t, tOrder, tCart, ctx] = await Promise.all([
    getTranslations("admin.orders.detail"),
    getTranslations("order"),
    getTranslations("cart"),
    getStoreContext(locale),
  ]);
  const canWrite = hasPermission(actor.role, "orders:write");
  const { general } = ctx.settings;
  const money = (n: number) => formatMoney(n, ctx.currency, locale);
  const when = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: general.timeZone,
  });
  const a = order.shippingAddress;
  const phone = formatPhone(a.phone, general.phoneCode);
  const addressText = [tl(a.zoneName, locale), a.city, a.area, a.street, a.landmark]
    .filter(Boolean)
    .join("، ");
  const wa = whatsappNumber(a.phone);
  const statusLabel = (s: string | null) => (s ? tOrder(`statuses.${s as "pending"}`) : "");

  return (
    <div className="space-y-5">
      {/* Packing slip header (print only) */}
      <div className="hidden print:block">
        <p className="text-xl font-bold">{ctx.storeName}</p>
        <p className="text-sm">{t("packingSlip")}</p>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
          >
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden="true" />
            {t("back")}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2.5 text-2xl font-bold">
            <bdi dir="ltr" className="tabular">
              #{order.orderNumber}
            </bdi>
            <OrderStatusBadge status={order.status} />
            <Badge tone={order.paymentStatus === "paid" ? "success" : "neutral"}>
              {tOrder(`paymentStatuses.${order.paymentStatus}`)}
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("placedAt")}: {when.format(new Date(order.placedAt))}
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <OrderStatusActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            status={order.status}
            hasEmail={Boolean(order.customerEmail)}
            canWrite={canWrite}
            action={changeOrderStatusAction}
          />

          <section className="rounded-2xl border bg-surface shadow-card">
            <h2 className="border-b px-4 py-3 font-semibold">
              {tOrder("items")}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({tOrder("itemsCount", { count: order.items.reduce((n, i) => n + i.quantity, 0) })})
              </span>
            </h2>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="block aspect-[4/5] w-12 shrink-0 overflow-hidden petal-sm bg-surface-muted print:hidden">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- stored thumbnail URL snapshot
                      <img
                        src={item.imageUrl}
                        alt=""
                        width={48}
                        height={60}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {tl(item.productName, locale)}
                    </span>
                    {item.variantLabel ? (
                      <span className="block text-xs text-muted-foreground">
                        {tl(item.variantLabel, locale)}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-end text-sm">
                    <span className="block font-semibold tabular">× {item.quantity}</span>
                    <bdi className="block text-xs text-muted-foreground tabular">
                      {money(item.lineTotal)}
                    </bdi>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t px-4 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("subtotal")}</dt>
                <dd className="tabular">
                  <bdi>{money(order.subtotal)}</bdi>
                </dd>
              </div>
              {order.discountTotal ? (
                <div className="flex justify-between gap-3 text-success">
                  <dt>
                    {t("discount")}{" "}
                    {order.couponCode ? (
                      <bdi dir="ltr" className="font-mono text-xs">
                        ({order.couponCode})
                      </bdi>
                    ) : null}
                  </dt>
                  <dd className="tabular">
                    <bdi>−{money(order.discountTotal)}</bdi>
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("shipping")}</dt>
                <dd className="tabular">
                  <bdi>{order.shippingTotal ? money(order.shippingTotal) : tCart("free")}</bdi>
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t pt-2 text-base font-bold">
                <dt>{t("total")}</dt>
                <dd className="tabular">
                  <bdi>{money(order.grandTotal)}</bdi>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border bg-surface shadow-card print:hidden">
            <h2 className="border-b px-4 py-3 font-semibold">{t("timeline")}</h2>
            <ol className="space-y-3 px-4 py-4">
              {order.timeline.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      e.type === "status_changed"
                        ? "bg-primary"
                        : e.type === "note"
                          ? "bg-accent"
                          : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {e.type === "status_changed"
                        ? t("events.status_changed", {
                            from: statusLabel(e.fromStatus),
                            to: statusLabel(e.toStatus),
                          })
                        : e.type === "payment_status_changed"
                          ? t("events.payment_status_changed", {
                              from: tOrder(`paymentStatuses.${e.fromStatus as "paid"}`),
                              to: tOrder(`paymentStatuses.${e.toStatus as "paid"}`),
                            })
                          : t(`events.${e.type as "placed"}`)}
                      {e.isCustomerVisible && e.type === "note" ? (
                        <Badge tone="info" className="ms-2">
                          {t("visibleToCustomer")}
                        </Badge>
                      ) : null}
                    </p>
                    {e.message ? (
                      <p className="mt-0.5 whitespace-pre-line text-muted-foreground">
                        {e.message}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {when.format(new Date(e.createdAt))} ·{" "}
                      {e.actorLabel ? t("by", { name: e.actorLabel }) : t("customerAction")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {canWrite ? <AddNoteForm orderId={order.id} action={addOrderNoteAction} /> : null}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border bg-surface p-4 shadow-card">
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <User className="size-4 text-primary" aria-hidden="true" />
              {t("customer")}
            </h2>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-sm">
              <bdi dir="ltr">{phone}</bdi>
            </p>
            {order.customerEmail ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" aria-hidden="true" />
                <a
                  href={`mailto:${order.customerEmail}`}
                  className="truncate hover:underline"
                  dir="ltr"
                >
                  {order.customerEmail}
                </a>
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {order.account ? `${t("account")} · ${order.account.email}` : t("guest")}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 print:hidden">
              <a
                href={`tel:${a.phone}`}
                className={buttonVariants({ size: "sm", variant: "secondary" })}
              >
                <Phone />
                {t("call")}
              </a>
              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                >
                  <BrandIcon name="whatsapp" className="size-4" />
                  {t("whatsapp")}
                </a>
              ) : null}
              <CopyButton text={phone} label={t("copyPhone")} />
            </div>
          </section>

          <section className="rounded-2xl border bg-surface p-4 shadow-card">
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              {t("address")}
            </h2>
            <p className="text-sm leading-relaxed">
              {a.fullName}
              <br />
              <bdi dir="ltr">{phone}</bdi>
              <br />
              {addressText}
            </p>
            <div className="mt-2 print:hidden">
              <CopyButton
                text={`${a.fullName}\n${phone}\n${addressText}`}
                label={t("copyAddress")}
              />
            </div>
            {order.customerNote ? (
              <p className="mt-3 rounded-lg bg-warning-soft p-2.5 text-sm">
                <span className="font-semibold">{tOrder("note")}: </span>
                {order.customerNote}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border bg-surface p-4 shadow-card">
            <h2 className="mb-1 font-semibold">{t("payment")}</h2>
            <p className="text-sm">{tOrder(`paymentMethods.${order.paymentMethod}`)}</p>
            <p className="text-xs text-muted-foreground">
              {t("paymentStatus")}: {tOrder(`paymentStatuses.${order.paymentStatus}`)}
            </p>
            <PaymentActions
              orderId={order.id}
              status={order.paymentStatus}
              canWrite={canWrite}
              action={changePaymentStatusAction}
            />
          </section>

          <section className="rounded-2xl border bg-surface p-4 shadow-card print:hidden">
            <h2 className="mb-2 font-semibold">{t("internalNote")}</h2>
            {canWrite ? (
              <InternalNoteForm
                orderId={order.id}
                note={order.internalNote}
                action={saveInternalNoteAction}
              />
            ) : (
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {order.internalNote || "—"}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
