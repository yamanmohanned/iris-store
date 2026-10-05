import { Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import { whatsappNumber } from "@/server/store-context";
import type { SettingsMap } from "@/server/services/settings";
import { BrandIcon, socialHref, type BrandIconName } from "./brand-icon";

type FooterPage = { slug: string; title: { ar?: string; en?: string }; systemKey: string | null };

export async function StoreFooter({
  settings,
  storeName,
  tagline,
  pages,
  locale,
}: {
  settings: SettingsMap;
  storeName: string;
  tagline: string;
  pages: FooterPage[];
  locale: string;
}) {
  const t = await getTranslations();
  const c = settings.general.contact;
  const wa = whatsappNumber(c.whatsapp);
  const page = (key: string) => pages.find((p) => p.systemKey === key);
  const serviceLinks = [
    { href: "/track", label: t("nav.trackOrder") },
    ...["shipping", "returns"].flatMap((k) =>
      page(k) ? [{ href: `/pages/${page(k)!.slug}`, label: tl(page(k)!.title, locale) }] : [],
    ),
    { href: "/contact", label: t("nav.contact") },
  ];
  const aboutLinks = pages
    .filter((p) => !["shipping", "returns"].includes(p.systemKey ?? ""))
    .map((p) => ({ href: `/pages/${p.slug}`, label: tl(p.title, locale) }));
  const socials = (
    Object.entries(settings.general.social) as [Exclude<BrandIconName, "whatsapp">, string][]
  )
    .map(([name, value]) => ({ name, href: socialHref(name, value) }))
    .filter((s): s is { name: Exclude<BrandIconName, "whatsapp">; href: string } =>
      Boolean(s.href),
    );

  return (
    <footer className="mt-16 border-t bg-surface pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] lg:pb-8">
      <div className="container-page grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <p className="font-display text-2xl font-bold text-primary">{storeName}</p>
          {tagline ? <p className="max-w-sm text-sm text-muted-foreground">{tagline}</p> : null}
          <ul className="space-y-2 pt-1 text-sm">
            {wa ? (
              <li>
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-primary"
                >
                  <BrandIcon name="whatsapp" className="size-4 text-[#25D366]" />
                  <bdi dir="ltr">{c.whatsapp}</bdi>
                </a>
              </li>
            ) : null}
            {c.phone ? (
              <li>
                <a
                  href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 hover:text-primary"
                >
                  <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
                  <bdi dir="ltr">{c.phone}</bdi>
                </a>
              </li>
            ) : null}
            {c.email ? (
              <li>
                <a
                  href={`mailto:${c.email}`}
                  className="inline-flex items-center gap-2 hover:text-primary"
                >
                  <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                  <bdi dir="ltr">{c.email}</bdi>
                </a>
              </li>
            ) : null}
          </ul>
          {socials.length ? (
            <ul className="flex flex-wrap gap-2 pt-2" aria-label={t("store.footer.followUs")}>
              {socials.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    className="inline-flex size-10 items-center justify-center rounded-full bg-surface-muted text-foreground/80 transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <BrandIcon name={s.name} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <FooterLinks title={t("store.footer.customerService")} links={serviceLinks} />
        <FooterLinks title={t("store.footer.aboutStore")} links={aboutLinks} />
      </div>
      <div className="container-page flex flex-col items-center justify-between gap-3 border-t py-5 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {storeName}. {t("store.footer.rights")}
        </p>
        <div className="flex items-center gap-3">
          {settings.checkout.cod.enabled ? <span>{t("store.footer.payments")}</span> : null}
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  if (!links.length) return null;
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <ul className="space-y-2.5 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
