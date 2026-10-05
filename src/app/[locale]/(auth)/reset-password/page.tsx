import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { getPendingEmail } from "@/server/auth/pending";
import { maskEmail } from "@/server/email";
import { PASSWORD_MIN_LENGTH } from "@/server/security/password";
import { AuthCard } from "../_components/auth-card";
import { ResetPasswordForm } from "../_components/code-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "auth",
  });
  return { title: t("resetTitle"), robots: { index: false } };
}

export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/reset-password">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const email = await getPendingEmail();
  if (!email) redirect({ href: "/forgot-password", locale });
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("resetTitle")}
      subtitle={t("resetSubtitle", { email: maskEmail(email!) })}
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">{t("genericCodeSent")}</p>
      <ResetPasswordForm minLength={PASSWORD_MIN_LENGTH} />
    </AuthCard>
  );
}
