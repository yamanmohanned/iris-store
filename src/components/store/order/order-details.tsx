import { Banknote, Building2, Check, MapPin, PackageX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import { formatMoney, type CurrencyConfig } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/server/db/schema";
import type { OrderDTO } from "@/server/services/orders";

const STEPS: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

/** Order progress, items, totals, delivery address and payment — shared by guest and account views. */
export async function OrderDetails({
  order,
  locale,
  currency,
  bankInstructions,
  timeZone,
}: {
  order: OrderDTO;
  locale: string;
  currency: CurrencyConfig;
  bankInstructions?: string | null;
  timeZone: string;
}) {
  const t = await getTranslations("order");
  const tCart = await getTranslations("cart");
  const money = (n: number) => formatMoney(n, currency, locale);
  const placedAt = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(order.placedAt));
  const stopped = order.status === "cancelled" || order.status === "returned";
  const current = STEPS.indexOf(order.status);
  const a = order.shippingAddress;
  const showBank =
    order.paymentMethod === "bank_transfer" &&
    order.paymentStatus === "unpaid" &&
    !stopped &&
    Boolean(bankInstructions);

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 rounded-2xl border bg-surface p-4 text-sm shadow-card sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{t("number")}</dt>
          <dd className="font-semibold tabular" dir="ltr">
            #{order.orderNumber}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("date")}</dt>
          <dd className="font-medium">{placedAt}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-muted-foreground">{t("status")}</dt>
          <dd className={cn("font-semibold", stopped ? "text-danger" : "text-primary")}>
            {t(`statuses.${order.status}`)}
          </dd>
        </div>
      </dl>

      {stopped ? (
        <Alert tone="danger" className="flex items-center gap-2">
          <PackageX className="size-4 shrink-0" aria-hidden="true" />
          {t("cancelledNote")}
        </Alert>
      ) : (
        <ol
          className="grid grid-cols-5 gap-1 rounded-2xl border bg-surface px-2 py-4 shadow-card"
          aria-label={t("status")}
        >
          {STEPS.map((step, i) => {
            const done = i <= current;
            return (
              <li
                key={step}
                className="relative flex flex-col items-center gap-2 text-center"
                aria-current={i === current ? "step" : undefined}
              >
                {i > 0 ? (
                  // Connector from the previous step's centre to this one (logical inset: RTL-safe).
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -start-1/2 top-3.5 h-0.5 w-full",
                      done ? "bg-primary" : "bg-border",
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 inline-flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground",
                    i === current && "ring-4 ring-primary/15",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[0.68rem] leading-tight sm:text-xs",
                    done ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(`steps.${step}` as "steps.pending")}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {showBank ? (
        <section className="rounded-2xl border border-primary/30 bg-primary-soft/60 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Building2 className="size-5 text-primary" aria-hidden="true" />
            {t("bankInstructionsTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{bankInstructions}</p>
          <p className="mt-2 text-xs font-medium text-primary">
            {t("bankInstructionsHint", { number: order.orderNumber })}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-surface shadow-card">
        <h2 className="border-b px-4 py-3 font-semibold">
          {t("items")}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({t("itemsCount", { count: order.items.reduce((n, i) => n + i.quantity, 0) })})
          </span>
        </h2>
        <ul className="divide-y">
          {order.items.map((item) => {
            const name = tl(item.productName, locale);
            const body = (
              <>
                <span className="block aspect-[4/5] w-14 shrink-0 overflow-hidden petal-sm bg-surface-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- stored thumbnail URL snapshot
                    <img
                      src={item.imageUrl}
                      alt=""
                      width={56}
                      height={70}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium">{name}</span>
                  {item.variantLabel ? (
                    <span className="block text-xs text-muted-foreground">
                      {tl(item.variantLabel, locale)}
                    </span>
                  ) : null}
                  <span className="block text-xs text-muted-foreground tabular">
                    <bdi>{money(item.unitPrice)}</bdi> × {item.quantity}
                  </span>
                </span>
                <bdi className="text-sm font-semibold tabular">{money(item.lineTotal)}</bdi>
              </>
            );
            return (
              <li key={item.id}>
                {item.productSlug ? (
                  <Link
                    href={`/p/${item.productSlug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/60"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        <dl className="space-y-2 border-t px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{tCart("subtotal")}</dt>
            <dd className="tabular">
              <bdi>{money(order.subtotal)}</bdi>
            </dd>
          </div>
          {order.discountTotal > 0 ? (
            <div className="flex justify-between gap-3 text-success">
              <dt>
                {tCart("discount")}
                {order.couponCode ? (
                  <bdi dir="ltr" className="ms-1 font-mono text-xs">
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
            <dt className="text-muted-foreground">{tCart("shipping")}</dt>
            <dd className={cn("tabular", order.shippingTotal === 0 && "text-success")}>
              <bdi>{order.shippingTotal ? money(order.shippingTotal) : tCart("free")}</bdi>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t pt-2.5 text-base font-bold">
            <dt>{tCart("total")}</dt>
            <dd className="tabular">
              <bdi>{money(order.grandTotal)}</bdi>
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border bg-surface p-4 shadow-card">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            {t("deliverTo")}
          </h2>
          <p className="text-sm leading-relaxed">
            {a.fullName}
            <br />
            <bdi dir="ltr">{formatPhone(a.phone)}</bdi>
            <br />
            {[tl(a.zoneName, locale), a.city, a.area, a.street, a.landmark]
              .filter(Boolean)
              .join("، ")}
          </p>
        </section>
        <section className="rounded-2xl border bg-surface p-4 shadow-card">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <Banknote className="size-4 text-primary" aria-hidden="true" />
            {t("payment")}
          </h2>
          <p className="text-sm">{t(`paymentMethods.${order.paymentMethod}`)}</p>
          <p className="text-xs text-muted-foreground">
            {t(`paymentStatuses.${order.paymentStatus}`)}
          </p>
          {order.customerNote ? (
            <p className="mt-3 rounded-lg bg-surface-muted p-2.5 text-xs leading-relaxed">
              <span className="font-semibold">{t("note")}: </span>
              {order.customerNote}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
