import { ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav, MobileAdminNav } from "@/components/admin/admin-nav";
import { Link } from "@/i18n/navigation";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { permissionsOf } from "@/server/auth/permissions";
import { requireStaffPage } from "@/server/auth/session";
import { countPendingOrders } from "@/server/services/admin-orders";
import { getStoreContext } from "@/server/store-context";
import { signOutAction } from "../(auth)/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Sections that exist so far (the navigation never links to a page that is not built yet). */
const AVAILABLE_SECTIONS = ["dashboard", "orders", "products", "categories"];

/** Every admin page is behind staff auth + 2FA + session age checks (re-checked in each action). */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const { session, actor } = await requireStaffPage(locale);
  const [t, ctx, messages, pending] = await Promise.all([
    getTranslations("admin"),
    getStoreContext(locale),
    pickClientMessages("admin", "order"),
    countPendingOrders(),
  ]);
  const nav = {
    permissions: [...permissionsOf(actor.role)],
    available: AVAILABLE_SECTIONS,
    badges: { orders: pending },
  };

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-e bg-surface lg:flex print:hidden">
          <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
            <Link href="/admin" className="truncate font-display text-xl font-bold text-primary">
              {ctx.storeName}
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
            <AdminNav {...nav} />
          </div>
          <div className="space-y-2 border-t p-3">
            <div className="px-2">
              <p className="truncate text-sm font-semibold">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {t(`roles.${actor.role}` as "roles.owner")}
              </p>
            </div>
            <div className="flex gap-1">
              <a
                href={locale === "ar" ? "/" : "/en"}
                target="_blank"
                rel="noopener"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium hover:bg-surface-muted"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                {t("viewStore")}
              </a>
              <form action={signOutAction} className="flex-1">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium hover:bg-surface-muted"
                >
                  <LogOut className="size-3.5" aria-hidden="true" />
                  {t("signOut")}
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-surface/95 px-3 backdrop-blur-md lg:hidden print:hidden">
            <MobileAdminNav {...nav} />
            <Link href="/admin" className="truncate font-display text-lg font-bold text-primary">
              {ctx.storeName}
            </Link>
            <a
              href={locale === "ar" ? "/" : "/en"}
              target="_blank"
              rel="noopener"
              className="ms-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-surface-muted"
              aria-label={t("viewStore")}
            >
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </header>
          <main
            id="main"
            className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0"
          >
            {children}
          </main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
