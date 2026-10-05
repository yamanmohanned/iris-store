import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { dirOf } from "@/i18n/routing";
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
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: t("defaultTitle"), template: `%s · ${t("defaultTitle")}` },
    description: t("description"),
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);

  const dir = dirOf(locale);
  const clientMessages = await pickClientMessages();

  return (
    <html lang={locale} dir={dir} className={fontVariables} suppressHydrationWarning>
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
