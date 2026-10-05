import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandIcon } from "@/components/store/brand-icon";
import { OrderDetails } from "@/components/store/order/order-details";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { requireUserPage } from "@/server/auth/session";
import { getOrderForUser } from "@/server/services/orders";
import { getStoreContext, whatsappNumber } from "@/server/store-context";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/orders/[number]">): Promise<Metadata> {
  const { locale, number } = await params;
  const t = await getTranslations({ locale: assertLocale(locale), namespace: "order" });
  return { title: t("title", { number: number.replace(/\D/g, "") }), robots: { index: false } };
}

/** A signed-in customer's own order (other customers' order numbers return 404). */
export default async function AccountOrderPage({
  params,
}: PageProps<"/[locale]/account/orders/[number]">) {
  const { locale: raw, number } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  const session = await requireUserPage(locale, `/account/orders/${encodeURIComponent(number)}`);
  const orderNumber = /^\d{1,15}$/.test(number) ? Number(number) : NaN;
  const order = Number.isSafeInteger(orderNumber)
    ? await getOrderForUser(session.user.id, orderNumber)
    : null;
  if (!order) notFound();
  const [ctx, t, tOrders] = await Promise.all([
    getStoreContext(locale),
    getTranslations("order"),
    getTranslations("account.orders"),
  ]);
  const { general, checkout } = ctx.settings;
  const wa = whatsappNumber(general.contact.whatsapp);

  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden="true" />
        {tOrders("back")}
      </Link>
      <h1 className="mt-1 mb-5 font-display text-[1.7rem] leading-tight font-bold">
        {t("title", { number: order.orderNumber })}
      </h1>
      <OrderDetails
        order={order}
        locale={locale}
        currency={ctx.currency}
        bankInstructions={tl(checkout.bankTransfer.instructions, locale) || null}
        timeZone={general.timeZone}
      />
      {wa ? (
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent(t("whatsappMessage", { number: order.orderNumber }))}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "outline",
            block: true,
            className: "mt-6 sm:w-auto",
          })}
        >
          <BrandIcon name="whatsapp" className="size-5" />
          {t("askWhatsApp")}
        </a>
      ) : null}
    </div>
  );
}
