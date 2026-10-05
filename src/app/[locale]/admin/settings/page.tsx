import { Bell, ChevronLeft, CreditCard, Palette, Search, Store, Truck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClearCacheButton } from "@/components/admin/settings/clear-cache";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import { requireStaffPage } from "@/server/auth/session";
import { getStoreContext } from "@/server/store-context";
import { clearCacheAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/settings">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.settings",
  });
  return { title: t("title") };
}

/** Settings home: one card per section with a glance at its current values. */
export default async function AdminSettingsPage({ params }: PageProps<"/[locale]/admin/settings">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "settings:write");
  const [t, ctx] = await Promise.all([getTranslations("admin.settings"), getStoreContext(locale)]);
  const s = ctx.settings;
  const money = (v: number) => formatMoney(v, ctx.currency, locale);
  const payments = [
    s.checkout.cod.enabled ? t("summary.cod") : null,
    s.checkout.bankTransfer.enabled ? t("summary.bank") : null,
  ].filter(Boolean);

  const cards = [
    {
      href: "/admin/settings/general",
      icon: Store,
      title: t("sections.general.title"),
      summary: [ctx.storeName, s.general.contact.phone].filter(Boolean).join(" · "),
    },
    {
      href: "/admin/settings/branding",
      icon: Palette,
      title: t("sections.branding.title"),
      summary: s.branding.announcement.enabled
        ? t("summary.announcementOn")
        : t("summary.announcementOff"),
      swatch: s.branding.primaryColor,
    },
    {
      href: "/admin/settings/checkout",
      icon: CreditCard,
      title: t("sections.checkout.title"),
      summary: [
        payments.join(" + "),
        s.checkout.freeShippingThreshold != null
          ? t("summary.freeFrom", { amount: money(s.checkout.freeShippingThreshold) })
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    {
      href: "/admin/shipping",
      icon: Truck,
      title: t("summary.shippingTitle"),
      summary: t("summary.shipping"),
    },
    {
      href: "/admin/settings/notifications",
      icon: Bell,
      title: t("sections.notifications.title"),
      summary: s.notifications.adminEmails.length
        ? t("summary.recipients", { count: s.notifications.adminEmails.length })
        : t("summary.noRecipients"),
    },
    {
      href: "/admin/settings/seo",
      icon: Search,
      title: t("sections.seo.title"),
      summary: tl(s.seo.title, locale) || t("summary.seoDefault"),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-[1.8rem] leading-tight font-bold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="group flex h-full items-center gap-3.5 rounded-2xl border bg-surface p-4 shadow-card transition-colors hover:border-primary/40"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <card.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{card.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  {card.swatch ? (
                    <span
                      aria-hidden="true"
                      className="size-3.5 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: card.swatch }}
                    />
                  ) : null}
                  <span className="truncate">{card.summary}</span>
                </span>
              </span>
              <ChevronLeft
                className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-6 rounded-2xl border border-dashed p-4 sm:flex sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("cache.title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("cache.hint")}</p>
        </div>
        <div className="mt-3 sm:mt-0">
          <ClearCacheButton action={clearCacheAction} />
        </div>
      </section>
    </div>
  );
}
