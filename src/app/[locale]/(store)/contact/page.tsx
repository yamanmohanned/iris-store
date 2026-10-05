import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandIcon } from "@/components/store/brand-icon";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { getStoreContext, whatsappNumber } from "@/server/store-context";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "store.contact",
  });
  return { title: t("title") };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [ctx, t] = await Promise.all([getStoreContext(locale), getTranslations("store.contact")]);
  const c = ctx.settings.general.contact;
  const wa = whatsappNumber(c.whatsapp);
  const address = tl(c.address, locale);
  const hours = tl(c.workingHours, locale);

  return (
    <div className="container-page max-w-2xl pt-6 pb-10">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6 grid gap-3">
        {wa ? (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 petal bg-[#25D366] p-5 text-white shadow-card transition hover:brightness-95"
          >
            <BrandIcon name="whatsapp" className="size-8" />
            <span>
              <span className="block text-lg font-semibold">{t("whatsappCta")}</span>
              <bdi dir="ltr" className="text-sm text-white/90">
                {c.whatsapp}
              </bdi>
            </span>
          </a>
        ) : null}
        {c.phone ? (
          <a
            href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-4 rounded-2xl border bg-surface p-5 hover:border-primary"
          >
            <Phone className="size-6 text-primary" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{t("callCta")}</span>
              <bdi dir="ltr" className="text-sm text-muted-foreground">
                {c.phone}
              </bdi>
            </span>
          </a>
        ) : null}
        {c.email ? (
          <a
            href={`mailto:${c.email}`}
            className="flex items-center gap-4 rounded-2xl border bg-surface p-5 hover:border-primary"
          >
            <Mail className="size-6 text-primary" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{t("emailCta")}</span>
              <bdi dir="ltr" className="text-sm text-muted-foreground">
                {c.email}
              </bdi>
            </span>
          </a>
        ) : null}
        {hours || address ? (
          <div className="grid gap-4 rounded-2xl bg-surface-muted p-5 text-sm sm:grid-cols-2">
            {hours ? (
              <p className="flex gap-3">
                <Clock className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{t("hours")}</span>
                  <span className="text-muted-foreground">{hours}</span>
                </span>
              </p>
            ) : null}
            {address ? (
              <p className="flex gap-3">
                <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{t("address")}</span>
                  <span className="text-muted-foreground">{address}</span>
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
