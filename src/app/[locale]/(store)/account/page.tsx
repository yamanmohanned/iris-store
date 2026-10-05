import { ChevronLeft, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { isStaffRole } from "@/server/auth/permissions";
import { requireUserPage } from "@/server/auth/session";
import { signOutAction } from "../../(auth)/actions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "account",
  });
  return { title: t("title"), robots: { index: false } };
}

// Minimal account hub — orders, addresses and wishlist arrive in phase 5.
export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const session = await requireUserPage(locale, "/account");
  const t = await getTranslations("account");
  const tAuth = await getTranslations("auth");
  const links = [
    { href: "/account/security", label: t("securityTitle"), icon: ShieldCheck },
    ...(isStaffRole(session.user.role as string)
      ? [{ href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard }]
      : []),
  ];
  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-muted-foreground" data-testid="account-greeting">
        {session.user.name} · <span dir="ltr">{session.user.email}</span>
      </p>
      <ul className="mt-6 divide-y rounded-2xl border bg-surface shadow-card">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-4 hover:bg-surface-muted">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <span className="flex-1 font-medium">{label}</span>
              <ChevronLeft
                className="size-4 text-muted-foreground ltr:rotate-180"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="outline">
          <LogOut />
          {tAuth("signOut")}
        </Button>
      </form>
    </div>
  );
}
