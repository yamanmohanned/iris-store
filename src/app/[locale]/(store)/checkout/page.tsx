import { randomBytes } from "node:crypto";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/store/checkout/checkout-form";
import { redirect } from "@/i18n/navigation";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { phonePlaceholder } from "@/lib/phone";
import { turnstileSiteKey } from "@/server/auth/providers";
import { getSession } from "@/server/auth/session";
import { getRequestCartId } from "@/server/cart-session";
import { getNonce } from "@/server/nonce";
import { listAddresses } from "@/server/services/addresses";
import { getCartView, purchasableLines } from "@/server/services/cart";
import { getShippingZones, priceCart } from "@/server/services/checkout";
import { getStoreContext } from "@/server/store-context";
import { placeOrderAction } from "./actions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "checkout",
  });
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [session, cartId, ctx, t] = await Promise.all([
    getSession(),
    getRequestCartId(),
    getStoreContext(locale),
    getTranslations("checkout"),
  ]);
  const { checkout, general } = ctx.settings;
  if (!session && !checkout.guestCheckout)
    redirect({ href: { pathname: "/login", query: { next: "/checkout" } }, locale });

  const view = cartId ? await getCartView(cartId) : null;
  // Only a cart that can be bought as it is reaches checkout (problems are fixed in the cart).
  if (!view || purchasableLines(view).length === 0 || view.lines.some((l) => l.issue))
    redirect({ href: "/cart", locale });

  const [pricing, zones, addresses, nonce, messages] = await Promise.all([
    priceCart(view!, { userId: session?.user.id }),
    getShippingZones(),
    session ? listAddresses(session.user.id) : Promise.resolve([]),
    getNonce(),
    pickClientMessages("store", "cart", "checkout"),
  ]);
  if (pricing.minOrderAmount > 0 && pricing.totals.subtotal < pricing.minOrderAmount)
    redirect({ href: "/cart", locale });

  return (
    <div className="container-page pt-4 pb-32 lg:pt-8 lg:pb-12">
      <h1 className="mb-5 font-display text-[1.7rem] leading-tight font-bold">{t("title")}</h1>
      <NextIntlClientProvider messages={messages}>
        <CheckoutForm
          action={placeOrderAction}
          lines={view!.lines.map((l) => ({
            id: l.id,
            name: tl(l.name, locale),
            label: tl(l.variantLabel, locale) || null,
            image: l.image,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
          }))}
          zones={zones.map((z) => ({ ...z, name: tl(z.name, locale) }))}
          coupon={pricing.coupon?.issue ? null : (pricing.coupon?.terms ?? null)}
          freeShippingThreshold={checkout.freeShippingThreshold}
          tax={checkout.tax}
          payment={{
            cod: checkout.cod.enabled,
            codNote: tl(checkout.cod.note, locale),
            bankTransfer: checkout.bankTransfer.enabled,
          }}
          requireEmail={checkout.requireEmail}
          allowOrderNotes={checkout.allowOrderNotes}
          signedIn={Boolean(session)}
          defaults={{
            fullName: session?.user.name ?? "",
            phone: "",
            email: session?.user.email ?? "",
          }}
          savedAddresses={addresses}
          idempotencyKey={randomBytes(18).toString("base64url")}
          currency={ctx.currency}
          locale={locale}
          phoneCode={general.phoneCode}
          phonePlaceholder={phonePlaceholder(general.phoneCode)}
          turnstileKey={session ? null : turnstileSiteKey()}
          nonce={nonce}
        />
      </NextIntlClientProvider>
    </div>
  );
}
