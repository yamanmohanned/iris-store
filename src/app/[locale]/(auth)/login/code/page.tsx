import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { getPendingEmail } from "@/server/auth/pending";
import { turnstileSiteKey } from "@/server/auth/providers";
import { safeNextPath } from "@/server/auth/session";
import { maskEmail } from "@/server/email";
import { getNonce } from "@/server/nonce";
import { AuthCard } from "../../_components/auth-card";
import { CodeForm, EmailStepForm } from "../../_components/code-forms";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login/code">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "auth",
  });
  return { title: t("codeLoginTitle"), robots: { index: false } };
}

export default async function CodeLoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/login/code">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "");
  const t = await getTranslations("auth");
  const pending = sp.step === "verify" ? await getPendingEmail() : null;

  return (
    <AuthCard
      title={t("codeLoginTitle")}
      subtitle={
        pending ? t("verifySubtitle", { email: maskEmail(pending) }) : t("codeLoginSubtitle")
      }
      footer={
        <Link
          href={{ pathname: "/login", query: next ? { next } : {} }}
          className="font-medium text-primary hover:underline"
        >
          {t("signInWithPassword")}
        </Link>
      }
    >
      {pending ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">{t("genericCodeSent")}</p>
          <CodeForm kind="sign-in" next={next} />
        </>
      ) : (
        <EmailStepForm
          kind="sign-in"
          next={next}
          turnstileKey={turnstileSiteKey()}
          nonce={await getNonce()}
        />
      )}
    </AuthCard>
  );
}
