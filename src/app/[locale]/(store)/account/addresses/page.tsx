import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddressBook } from "@/components/store/account/address-book";
import { Link } from "@/i18n/navigation";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { phonePlaceholder } from "@/lib/phone";
import { requireUserPage } from "@/server/auth/session";
import { listAddresses, MAX_ADDRESSES } from "@/server/services/addresses";
import { getShippingZones } from "@/server/services/checkout";
import { getStoreContext } from "@/server/store-context";
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from "../actions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/addresses">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "account.addresses",
  });
  return { title: t("title"), robots: { index: false } };
}

export default async function AddressesPage({ params }: PageProps<"/[locale]/account/addresses">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const session = await requireUserPage(locale, "/account/addresses");
  const [t, tAccount, ctx, addresses, zones, messages] = await Promise.all([
    getTranslations("account.addresses"),
    getTranslations("account"),
    getStoreContext(locale),
    listAddresses(session.user.id),
    getShippingZones(),
    pickClientMessages("store", "cart", "account", "checkout"),
  ]);
  const zoneName = new Map(zones.map((z) => [z.id, tl(z.name, locale)]));

  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        {tAccount("title")}
      </Link>
      <h1 className="mt-1 font-display text-[1.7rem] leading-tight font-bold">{t("title")}</h1>
      <NextIntlClientProvider messages={messages}>
        <AddressBook
          addresses={addresses.map((a) => ({
            ...a,
            zoneName: a.zoneId ? (zoneName.get(a.zoneId) ?? null) : null,
          }))}
          zones={zones.map((z) => ({ id: z.id, name: tl(z.name, locale) }))}
          actions={{
            save: saveAddressAction,
            remove: deleteAddressAction,
            makeDefault: setDefaultAddressAction,
          }}
          phoneCode={ctx.settings.general.phoneCode}
          phonePlaceholder={phonePlaceholder(ctx.settings.general.phoneCode)}
          max={MAX_ADDRESSES}
        />
      </NextIntlClientProvider>
    </div>
  );
}
