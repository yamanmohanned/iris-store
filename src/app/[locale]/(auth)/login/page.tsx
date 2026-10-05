import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { isStaffRole } from "@/server/auth/permissions";
import { googleSignInEnabled, turnstileSiteKey } from "@/server/auth/providers";
import { getSession, safeNextPath } from "@/server/auth/session";
import { getNonce } from "@/server/nonce";
import { AuthCard } from "../_components/auth-card";
import { LoginForm } from "../_components/login-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "auth",
  });
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "");

  const session = await getSession();
  if (session)
    redirect({
      href: isStaffRole(session.user.role as string) ? "/admin" : next || "/account",
      locale,
    });

  const t = await getTranslations("auth");
  const notice =
    sp.reset === "1"
      ? ({ tone: "success", text: t("resetDone") } as const)
      : sp.reason === "expired"
        ? ({ tone: "info", text: t("errors.sessionExpired") } as const)
        : sp.error
          ? ({ tone: "danger", text: t("errors.generic") } as const)
          : null;

  return (
    <AuthCard
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link
            href={{ pathname: "/register", query: next ? { next } : {} }}
            className="font-semibold text-primary hover:underline"
          >
            {t("createAccount")}
          </Link>
        </>
      }
    >
      <LoginForm
        next={next}
        googleEnabled={googleSignInEnabled()}
        turnstileKey={turnstileSiteKey()}
        nonce={await getNonce()}
        notice={notice}
      />
    </AuthCard>
  );
}
