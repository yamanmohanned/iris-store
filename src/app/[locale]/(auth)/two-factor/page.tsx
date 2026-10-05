import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { Link, redirect } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { safeNextPath } from "@/server/auth/session";
import { ShieldCheck } from "lucide-react";
import { AuthCard } from "../_components/auth-card";
import { TwoFactorForm } from "../_components/code-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/two-factor">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "auth",
  });
  return { title: t("twoFactorTitle"), robots: { index: false } };
}

export default async function TwoFactorPage({
  params,
  searchParams,
}: PageProps<"/[locale]/two-factor">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  // Without the pending-challenge cookie there is nothing to verify: start over.
  const jar = await cookies();
  if (!jar.getAll().some((c) => c.name.endsWith("two_factor")))
    redirect({ href: "/login", locale });
  const t = await getTranslations("auth");
  const next = safeNextPath((await searchParams).next, "");
  return (
    <AuthCard
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
          {t("twoFactorTitle")}
        </span>
      }
      subtitle={t("twoFactorSubtitle")}
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      }
    >
      <TwoFactorForm next={next} />
    </AuthCard>
  );
}
