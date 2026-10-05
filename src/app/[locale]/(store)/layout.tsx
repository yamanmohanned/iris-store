import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BottomNav } from "@/components/store/bottom-nav";
import { AnnouncementBar, StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { getSession } from "@/server/auth/session";
import { getFooterPages } from "@/server/services/content";
import { getStoreContext } from "@/server/store-context";

/** Storefront chrome: announcement, sticky header, content, footer and the phone tab bar. */
export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [ctx, session, footerPages, t, messages] = await Promise.all([
    getStoreContext(locale),
    getSession(),
    getFooterPages(),
    getTranslations("nav"),
    pickClientMessages("store"),
  ]);
  const announcement = ctx.settings.branding.announcement;
  const announcementText = announcement.enabled ? tl(announcement.text, locale) : "";

  return (
    <NextIntlClientProvider messages={messages}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t("skipToContent")}
      </a>
      {announcementText ? (
        <AnnouncementBar text={announcementText} href={announcement.link || undefined} />
      ) : null}
      <StoreHeader
        storeName={ctx.storeName}
        categories={ctx.categoryTree}
        locale={locale}
        signedIn={Boolean(session)}
      />
      <main id="main" className="min-h-[60dvh]">
        {children}
      </main>
      <StoreFooter
        settings={ctx.settings}
        storeName={ctx.storeName}
        tagline={ctx.tagline}
        pages={footerPages}
        locale={locale}
      />
      <BottomNav />
    </NextIntlClientProvider>
  );
}
