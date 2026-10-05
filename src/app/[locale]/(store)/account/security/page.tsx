import { LogOut, MonitorSmartphone } from "lucide-react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { isStaffRole } from "@/server/auth/permissions";
import { requireUserPage } from "@/server/auth/session";
import { PASSWORD_MIN_LENGTH } from "@/server/security/password";
import { listDeviceSessions } from "@/server/services/account-security";
import { revokeOtherSessionsAction, revokeSessionAction } from "./actions";
import { PasswordPanel } from "./password-panel";
import { TwoFactorPanel } from "./two-factor-panel";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/security">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "account",
  });
  return { title: t("securityTitle"), robots: { index: false } };
}

export default async function SecurityPage({ params }: PageProps<"/[locale]/account/security">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const session = await requireUserPage(locale, "/account/security");
  const t = await getTranslations("account");
  const format = await getFormatter();
  const devices = await listDeviceSessions(session.user.id, session.session.id);
  const others = devices.filter((d) => !d.current);

  return (
    <div className="container-page max-w-3xl py-6 sm:py-10">
      <h1 className="text-2xl font-bold">{t("securityTitle")}</h1>
      <p className="mt-1 text-muted-foreground">{t("securitySubtitle")}</p>

      <NextIntlClientProvider messages={await pickClientMessages("auth", "account", "validation")}>
        <div className="mt-6 space-y-5">
          <TwoFactorPanel
            enabled={Boolean(session.user.twoFactorEnabled)}
            isStaff={isStaffRole(session.user.role as string)}
          />
          <PasswordPanel minLength={PASSWORD_MIN_LENGTH} />
        </div>
      </NextIntlClientProvider>

      <section className="mt-5 rounded-2xl border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-lg font-semibold">{t("sessions.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("sessions.description")}</p>
        <ul className="mt-4 divide-y">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <MonitorSmartphone
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium" dir="ltr">
                    {d.device}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.current
                      ? t("sessions.current")
                      : t("sessions.lastActive", {
                          date: format.relativeTime(new Date(d.lastActiveAt)),
                        })}
                    {d.ipAddress ? <span dir="ltr"> · {d.ipAddress}</span> : null}
                  </p>
                </div>
              </div>
              {!d.current ? (
                <form action={revokeSessionAction}>
                  <input type="hidden" name="sessionId" value={d.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    {t("sessions.revoke")}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {others.length ? (
          <form action={revokeOtherSessionsAction} className="mt-3">
            <Button type="submit" variant="outline" size="sm">
              <LogOut />
              {t("sessions.revokeOthers")}
            </Button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("sessions.empty")}</p>
        )}
      </section>
    </div>
  );
}
