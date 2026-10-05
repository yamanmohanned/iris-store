import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { turnstileSiteKey } from "@/server/auth/providers";
import { getSession, safeNextPath } from "@/server/auth/session";
import { getNonce } from "@/server/nonce";
import { PASSWORD_MIN_LENGTH } from "@/server/security/password";
import { AuthCard } from "../_components/auth-card";
import { RegisterForm } from "../_components/register-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/register">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "auth",
  });
  return { title: t("registerTitle"), robots: { index: false } };
}

export default async function RegisterPage({
  params,
  searchParams,
}: PageProps<"/[locale]/register">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const next = safeNextPath((await searchParams).next, "");
  if (await getSession()) redirect({ href: next || "/account", locale });
  const t = await getTranslations("auth");

  return (
    <AuthCard
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link
            href={{ pathname: "/login", query: next ? { next } : {} }}
            className="font-semibold text-primary hover:underline"
          >
            {t("signIn")}
          </Link>
        </>
      }
    >
      <RegisterForm
        next={next}
        turnstileKey={turnstileSiteKey()}
        nonce={await getNonce()}
        minLength={PASSWORD_MIN_LENGTH}
      />
    </AuthCard>
  );
}
