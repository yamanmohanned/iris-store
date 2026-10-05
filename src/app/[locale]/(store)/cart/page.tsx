import { ArrowLeft, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartLine } from "@/components/store/cart/cart-line";
import { CouponForm } from "@/components/store/cart/coupon-form";
import { EmptyState } from "@/components/store/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { formatMoney } from "@/lib/money";
import { getSession } from "@/server/auth/session";
import { getRequestCartId } from "@/server/cart-session";
import { getCartView } from "@/server/services/cart";
import { priceCart } from "@/server/services/checkout";
import { getStoreContext } from "@/server/store-context";
import {
  applyCouponAction,
  removeCartItemAction,
  removeCouponAction,
  updateCartItemAction,
} from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "cart",
  });
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [cartId, ctx, session, t] = await Promise.all([
    getRequestCartId(),
    getStoreContext(locale),
    getSession(),
    getTranslations("cart"),
  ]);
  const view = cartId ? await getCartView(cartId) : null;

  if (!view || view.lines.length === 0) {
    return (
      <div className="container-page py-6">
        <h1 className="font-display text-[1.7rem] leading-tight font-bold">{t("title")}</h1>
        <EmptyState
          icon={ShoppingBag}
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            <Link href="/categories" className={buttonVariants({ size: "lg" })}>
              {t("startShopping")}
            </Link>
          }
        />
      </div>
    );
  }

  const { totals, coupon, minOrderAmount } = await priceCart(view, { userId: session?.user.id });
  const money = (n: number) => formatMoney(n, ctx.currency, locale);
  const hasIssues = view.lines.some((l) => l.issue);
  const belowMinimum = minOrderAmount > 0 && totals.subtotal < minOrderAmount;
  const canCheckout = !hasIssues && view.itemCount > 0 && !belowMinimum;

  let couponNote: string | null = null;
  let couponTone: "muted" | "warning" | "success" = "muted";
  if (coupon?.issue === "min_subtotal" && coupon.terms?.minSubtotal != null) {
    couponNote = t("coupon.addMore", { amount: money(coupon.terms.minSubtotal - totals.subtotal) });
    couponTone = "warning";
  } else if (coupon?.issue) {
    couponNote = t(`coupon.issues.${coupon.issue}`, { amount: "" });
    couponTone = "warning";
  } else if (totals.couponApplied) {
    couponNote =
      totals.discount > 0
        ? t("coupon.saving", { amount: money(totals.discount) })
        : t("coupon.freeShipping");
    couponTone = "success";
  }

  const checkoutButton = (className?: string) =>
    canCheckout ? (
      <Link href="/checkout" className={buttonVariants({ size: "xl", block: true, className })}>
        {t("checkout")}
        <ArrowLeft className="ltr:rotate-180" aria-hidden="true" />
      </Link>
    ) : (
      <span
        aria-disabled="true"
        className={buttonVariants({
          size: "xl",
          block: true,
          className: `${className ?? ""} pointer-events-none opacity-50`,
        })}
      >
        {t("checkout")}
      </span>
    );

  return (
    <div className="container-page pt-4 pb-40 lg:pt-8 lg:pb-12">
      <h1 className="font-display text-[1.7rem] leading-tight font-bold">
        {t("title")}{" "}
        <span className="text-base font-normal text-muted-foreground tabular">
          ({view.lines.length})
        </span>
      </h1>

      {hasIssues ? (
        <Alert tone="warning" className="mt-4">
          {t("issuesTitle")}
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-10">
        <ul className="divide-y rounded-2xl border bg-surface shadow-card" aria-label={t("title")}>
          {view.lines.map((line) => (
            <CartLine
              key={line.id}
              line={line}
              currency={ctx.currency}
              locale={locale}
              onUpdate={updateCartItemAction}
              onRemove={removeCartItemAction}
            />
          ))}
        </ul>

        <aside className="space-y-4 lg:sticky lg:top-24" aria-label={t("summary")}>
          {totals.amountToFreeShipping != null && totals.amountToFreeShipping > 0 ? (
            <FreeShippingMeter
              label={t("freeShippingProgress", { amount: money(totals.amountToFreeShipping) })}
              progress={
                1 -
                totals.amountToFreeShipping /
                  (totals.amountToFreeShipping + totals.subtotal - totals.discount)
              }
            />
          ) : totals.freeShipping ? (
            <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-sm font-medium text-success">
              <Truck className="size-4" aria-hidden="true" />
              {t("freeShippingReached")}
            </p>
          ) : null}

          <CouponForm
            applied={view.couponCode}
            note={couponNote}
            noteTone={couponTone}
            applyAction={applyCouponAction}
            removeAction={removeCouponAction}
          />

          <dl className="space-y-2.5 rounded-2xl border bg-surface p-4 text-sm shadow-card">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("subtotal")}</dt>
              <dd className="tabular">
                <bdi>{money(totals.subtotal)}</bdi>
              </dd>
            </div>
            {totals.discount > 0 ? (
              <div className="flex justify-between gap-3 text-success">
                <dt>{t("discount")}</dt>
                <dd className="tabular">
                  <bdi>−{money(totals.discount)}</bdi>
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("shipping")}</dt>
              <dd className="text-end text-muted-foreground">
                {totals.freeShipping ? (
                  <span className="font-medium text-success">{t("free")}</span>
                ) : (
                  t("shippingAtCheckout")
                )}
              </dd>
            </div>
            {totals.tax > 0 && !totals.taxIncluded ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("tax")}</dt>
                <dd className="tabular">
                  <bdi>{money(totals.tax)}</bdi>
                </dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3 border-t pt-3 text-base font-bold">
              <dt>{t("total")}</dt>
              <dd className="tabular">
                <bdi>{money(totals.total)}</bdi>
              </dd>
            </div>
            {totals.taxIncluded && totals.tax > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("taxIncluded", { amount: money(totals.tax) })}
              </p>
            ) : null}
          </dl>

          {belowMinimum ? (
            <Alert tone="warning">{t("minimumOrder", { amount: money(minOrderAmount) })}</Alert>
          ) : null}

          <div className="hidden lg:block">{checkoutButton()}</div>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            {t("secureCheckout")}
          </p>
          <Link
            href="/categories"
            className="block text-center text-sm font-medium text-primary hover:underline"
          >
            {t("continueShopping")}
          </Link>
        </aside>
      </div>

      {/* Phones: total + checkout pinned above the tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-30 border-t bg-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0">
            <span className="block text-xs text-muted-foreground">{t("total")}</span>
            <bdi className="block text-lg leading-tight font-bold tabular">
              {money(totals.total)}
            </bdi>
          </div>
          {checkoutButton("flex-1 h-12")}
        </div>
      </div>
    </div>
  );
}

function FreeShippingMeter({ label, progress }: { label: string; progress: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Truck className="size-4 text-primary" aria-hidden="true" />
        {label}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
