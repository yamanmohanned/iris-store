import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { pickClientMessages } from "@/i18n/client-messages";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { COUNTRY_PRESETS } from "@/lib/countries";
import { env } from "@/server/env";
import { PASSWORD_MIN_LENGTH } from "@/server/security/password";
import { ownerExists } from "@/server/services/setup";
import { AuthCard } from "../_components/auth-card";
import { SetupForm } from "./setup-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/setup">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "setup",
  });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function SetupPage({ params, searchParams }: PageProps<"/[locale]/setup">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("setup");

  if (await ownerExists()) {
    return (
      <AuthCard title={t("unavailableTitle")} subtitle={t("unavailableBody")}>
        <Link href="/login" className={buttonVariants({ block: true, size: "lg" })}>
          {(await getTranslations("auth"))("signIn")}
        </Link>
      </AuthCard>
    );
  }
  if (!env().SETUP_TOKEN) {
    return (
      <AuthCard title={t("title")}>
        <Alert tone="warning">{t("notConfigured")}</Alert>
      </AuthCard>
    );
  }
  const token =
    typeof (await searchParams).token === "string"
      ? String((await searchParams).token).slice(0, 200)
      : "";

  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      <NextIntlClientProvider messages={await pickClientMessages("auth", "setup", "validation")}>
        <SetupForm token={token} countries={COUNTRY_PRESETS} minLength={PASSWORD_MIN_LENGTH} />
      </NextIntlClientProvider>
    </AuthCard>
  );
}
