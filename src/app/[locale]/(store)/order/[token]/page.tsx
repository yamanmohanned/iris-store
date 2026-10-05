import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandIcon } from "@/components/store/brand-icon";
import { CopyLinkButton } from "@/components/store/order/copy-link-button";
import { OrderDetails } from "@/components/store/order/order-details";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { formatPhone } from "@/lib/phone";
import { getSession } from "@/server/auth/session";
import { getOrderByAccessToken } from "@/server/services/orders";
import { getStoreContext, whatsappNumber } from "@/server/store-context";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/order/[token]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: assertLocale(locale), namespace: "order" });
  return {
    title: t("title", { number: "" }).replace("#", "").trim(),
    robots: { index: false, follow: false },
    // The URL is a secret link: never leak it to other sites through the Referer header.
    referrer: "no-referrer",
  };
}

/** Order page reached through the private link (after checkout, from the email, or via tracking). */
export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/[locale]/order/[token]">) {
  const { locale: rawLocale, token } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);
  const order = await getOrderByAccessToken(token);
  if (!order) notFound();
  const placed = (await searchParams).placed === "1";
  const [ctx, session, t, messages] = await Promise.all([
    getStoreContext(locale),
    getSession(),
    getTranslations("order"),
    pickClientMessages("store", "cart", "order"),
  ]);
  const { general, checkout } = ctx.settings;
  const wa = whatsappNumber(general.contact.whatsapp);

  return (
    <div className="container-page max-w-3xl pt-4 pb-10 lg:pt-8">
      {placed ? (
        <div className="mb-6 flex flex-col items-center rounded-2xl bg-success-soft px-5 py-7 text-center">
          <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
          <h1 className="mt-3 font-display text-[1.6rem] leading-tight font-bold">
            {t("placedTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t.rich("placedBody", {
              number: formatPhone(order.customerPhone, general.phoneCode),
              phone: (chunks) => (
                <bdi dir="ltr" className="font-semibold text-foreground">
                  {chunks}
                </bdi>
              ),
            })}
          </p>
        </div>
      ) : (
        <h1 className="mb-5 font-display text-[1.7rem] leading-tight font-bold">
          {t("title", { number: order.orderNumber })}
        </h1>
      )}

      <OrderDetails
        order={order}
        locale={locale}
        currency={ctx.currency}
        bankInstructions={tl(checkout.bankTransfer.instructions, locale) || null}
        timeZone={general.timeZone}
      />

      <div className="mt-6 space-y-3">
        {!session ? (
          <p className="text-center text-sm text-muted-foreground">{t("saveLink")}</p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {!session ? (
            <NextIntlClientProvider messages={messages}>
              <CopyLinkButton />
            </NextIntlClientProvider>
          ) : null}
          {wa ? (
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent(t("whatsappMessage", { number: order.orderNumber }))}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <BrandIcon name="whatsapp" className="size-5" />
              {t("askWhatsApp")}
            </a>
          ) : null}
          <Link href="/" className={buttonVariants({})}>
            {t("continueShopping")}
          </Link>
        </div>
        {!session ? (
          <p className="text-center text-sm">
            <Link
              href={{ pathname: "/register", query: { next: "/account/orders" } }}
              className="font-medium text-primary hover:underline"
            >
              {t("createAccount")}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
