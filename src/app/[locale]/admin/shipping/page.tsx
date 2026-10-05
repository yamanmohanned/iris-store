import { getTranslations, setRequestLocale } from "next-intl/server";
import { ZoneManager } from "@/components/admin/zone-manager";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { getStoreContext } from "@/server/store-context";
import { listZonesAdmin } from "@/server/services/shipping-admin";
import { deleteZoneAction, moveZoneAction, saveZoneAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/shipping">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.shipping",
  });
  return { title: t("title") };
}

export default async function AdminShippingPage({ params }: PageProps<"/[locale]/admin/shipping">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "shipping:write");
  const [rows, ctx] = await Promise.all([listZonesAdmin(), getStoreContext(locale)]);
  return (
    <ZoneManager
      rows={rows}
      currency={ctx.currency}
      storeFreeShipping={ctx.settings.checkout.freeShippingThreshold}
      actions={{ save: saveZoneAction, remove: deleteZoneAction, move: moveZoneAction }}
    />
  );
}
