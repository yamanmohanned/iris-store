import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Every admin page is behind staff auth + 2FA + session age checks (re-checked in each action). */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale);
  return <div className="min-h-dvh bg-background">{children}</div>;
}
