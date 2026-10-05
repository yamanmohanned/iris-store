import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { getPendingEmail } from "@/server/auth/pending";
import { safeNextPath } from "@/server/auth/session";
import { maskEmail } from "@/server/email";
import { Alert } from "@/components/ui/misc";
import { AuthCard } from "../_components/auth-card";
import { CodeForm } from "../_components/code-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/verify-email">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "auth",
  });
  return { title: t("verifyTitle"), robots: { index: false } };
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<"/[locale]/verify-email">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const sp = await searchParams;
  const email = await getPendingEmail();
  if (!email) redirect({ href: "/register", locale });
  const t = await getTranslations("auth");

  return (
    <AuthCard
      title={t("verifyTitle")}
      subtitle={<span dir="auto">{t("verifySubtitle", { email: maskEmail(email!) })}</span>}
      footer={
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("changeEmail")}
        </Link>
      }
    >
      {sp.resent ? (
        <Alert tone="info" className="mb-4">
          {t("errors.emailNotVerified")}
        </Alert>
      ) : null}
      <CodeForm kind="verify-email" next={safeNextPath(sp.next, "/account")} />
    </AuthCard>
  );
}
