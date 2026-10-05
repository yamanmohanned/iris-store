import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { turnstileSiteKey } from "@/server/auth/providers";
import { getNonce } from "@/server/nonce";
import { AuthCard } from "../_components/auth-card";
import { EmailStepForm } from "../_components/code-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/forgot-password">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "auth",
  });
  return { title: t("forgotTitle"), robots: { index: false } };
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/forgot-password">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("forgotTitle")}
      subtitle={t("forgotSubtitle")}
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      }
    >
      <EmailStepForm
        kind="forgot"
        next=""
        turnstileKey={turnstileSiteKey()}
        nonce={await getNonce()}
      />
    </AuthCard>
  );
}
