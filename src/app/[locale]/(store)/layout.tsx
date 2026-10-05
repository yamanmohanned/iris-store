import { setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { getSettings } from "@/server/services/settings";

// Temporary storefront chrome — replaced by the full mobile-first layout in phase 4.
export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const settings = await getSettings();
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-surface">
        <div className="container-page flex h-14 items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            {tl(settings.general.storeName, locale)}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main id="main">{children}</main>
    </div>
  );
}
