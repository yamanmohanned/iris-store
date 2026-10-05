import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandingSettingsForm } from "@/components/admin/settings/branding-form";
import { CheckoutSettingsForm } from "@/components/admin/settings/checkout-form";
import { GeneralSettingsForm } from "@/components/admin/settings/general-form";
import { NotificationsSettingsForm } from "@/components/admin/settings/notifications-form";
import { SeoSettingsForm } from "@/components/admin/settings/seo-form";
import { assertLocale } from "@/i18n/locale";
import { countryPreset } from "@/lib/countries";
import { tl } from "@/lib/localized";
import { currencySymbol } from "@/lib/money";
import { requireStaffPage } from "@/server/auth/session";
import { env } from "@/server/env";
import { getBrandAssets } from "@/server/services/brand-assets";
import { isEditableSection } from "@/server/services/settings-admin";
import { getStoreContext } from "@/server/store-context";
import { saveSettingsAction } from "../actions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/settings/[section]">) {
  const { locale, section } = await params;
  if (!isEditableSection(section)) return {};
  const t = await getTranslations({ locale: assertLocale(locale), namespace: "admin.settings" });
  return { title: t(`sections.${section}.title`) };
}

export default async function AdminSettingsSectionPage({
  params,
}: PageProps<"/[locale]/admin/settings/[section]">) {
  const { locale: rawLocale, section } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);
  if (!isEditableSection(section)) notFound();
  await requireStaffPage(locale, "settings:write");
  const [ctx, brand] = await Promise.all([getStoreContext(locale), getBrandAssets()]);
  const s = ctx.settings;

  switch (section) {
    case "general": {
      const country = countryPreset(s.general.country);
      return (
        <GeneralSettingsForm
          initial={s.general}
          logo={brand.logo}
          region={{
            country: (country && tl(country.name, locale)) || s.general.country,
            currency: `${s.general.currency} (${currencySymbol(s.general.currency, "ar")})`,
            timeZone: s.general.timeZone,
          }}
          save={saveSettingsAction}
        />
      );
    }
    case "branding":
      return (
        <BrandingSettingsForm
          initial={s.branding}
          storeName={ctx.storeName}
          save={saveSettingsAction}
        />
      );
    case "checkout":
      return (
        <CheckoutSettingsForm
          initial={s.checkout}
          currency={ctx.currency}
          save={saveSettingsAction}
        />
      );
    case "notifications":
      return (
        <NotificationsSettingsForm
          initial={s.notifications}
          emailConfigured={env().EMAIL_DRIVER !== "console"}
          save={saveSettingsAction}
        />
      );
    case "seo":
      return (
        <SeoSettingsForm
          initial={s.seo}
          shareImage={brand.shareImage}
          storeName={ctx.storeName}
          tagline={ctx.tagline}
          siteUrl={env().APP_URL}
          save={saveSettingsAction}
        />
      );
  }
}
