import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { getSettings } from "@/server/services/settings";

/** Focused layout for sign-in/up flows: brand, language switch and the form — nothing else. */
export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const settings = await getSettings();
  const storeName = tl(settings.general.storeName, locale);

  return (
    <div className="min-h-dvh bg-[radial-gradient(120%_60%_at_50%_-10%,var(--primary-soft),transparent_70%)]">
      <header className="container-page flex h-16 items-center justify-between pt-safe">
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
          {storeName}
        </Link>
        <LanguageSwitcher />
      </header>
      <main id="main" className="container-page flex justify-center pt-2 pb-16 sm:pt-8">
        <div className="w-full max-w-[26rem]">
          <NextIntlClientProvider messages={await pickClientMessages("auth", "validation")}>
            {children}
          </NextIntlClientProvider>
        </div>
      </main>
    </div>
  );
}
