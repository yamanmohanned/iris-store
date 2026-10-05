import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { dirOf } from "@/i18n/routing";
import { readableForeground } from "@/lib/color";
import { tl } from "@/lib/localized";
import { getSettings } from "@/server/services/settings";
import { fontVariables } from "../fonts";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  const settings = await getSettings();
  const name = tl(settings.general.storeName, locale) || t("defaultTitle");
  const description =
    tl(settings.seo.description, locale) ||
    tl(settings.general.tagline, locale) ||
    t("description");
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: tl(settings.seo.title, locale) || name, template: `%s · ${name}` },
    description,
    applicationName: name,
    formatDetection: { telephone: false },
    icons: {
      icon: [{ url: "/icons/mark.svg", type: "image/svg+xml" }],
      apple: "/icons/apple-180.png",
    },
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    openGraph: { siteName: name, locale: locale === "ar" ? "ar_IQ" : "en_US", type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

const RADIUS = { sharp: "0.375rem", soft: "0.875rem", round: "1.25rem" } as const;

/** Owner branding → CSS variables. Values are validated hex colors / enum keys (no injection). */
function brandCss(primary: string, radius: keyof typeof RADIUS) {
  return `:root{--primary:${primary};--primary-foreground:${readableForeground(primary)};--radius:${RADIUS[radius]}}`;
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);

  const dir = dirOf(locale);
  const [clientMessages, settings] = await Promise.all([pickClientMessages(), getSettings()]);

  return (
    <html lang={locale} dir={dir} className={fontVariables} suppressHydrationWarning>
      <head>
        <style>{brandCss(settings.branding.primaryColor, settings.branding.radius)}</style>
      </head>
      <body>
        <NextIntlClientProvider messages={clientMessages}>
          <Providers dir={dir}>
            {children}
            <Toaster dir={dir} />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
