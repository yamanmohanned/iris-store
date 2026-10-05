"use client";

import { Check, Copy, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { FormAlert, OtpInput, PasswordInput, SubmitButton } from "@/components/forms/form-controls";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Alert, Badge } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import {
  confirmTwoFactorAction,
  disableTwoFactorAction,
  regenerateBackupCodesAction,
  startTwoFactorAction,
} from "./actions";

function BackupCodes({ codes }: { codes: string[] }) {
  const t = useTranslations("account.twoFactor");
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border bg-surface-muted p-4">
      <p className="font-medium">{t("backupTitle")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("backupHint")}</p>
      <ul dir="ltr" className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="rounded-md bg-surface px-2 py-1.5 text-center">
            {c}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={async () => {
          await navigator.clipboard.writeText(codes.join("\n"));
          setCopied(true);
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? t("copied") : t("copyCodes")}
      </Button>
    </div>
  );
}

export function TwoFactorPanel({ enabled, isStaff }: { enabled: boolean; isStaff: boolean }) {
  const t = useTranslations("account.twoFactor");
  const tAuth = useTranslations("auth");
  const [startState, start] = useActionState(startTwoFactorAction, null);
  const [confirmState, confirm] = useActionState(confirmTwoFactorAction, null);
  const [regenState, regen] = useActionState(regenerateBackupCodesAction, null);
  const [disableState, disable] = useActionState(disableTwoFactorAction, null);

  const enrollment = startState?.ok
    ? (startState.data as { qrDataUrl: string; secret: string; backupCodes: string[] })
    : null;
  const done = Boolean(confirmState?.ok);

  return (
    <section className="rounded-2xl border bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Badge tone={enabled || done ? "success" : "neutral"}>
          {enabled || done ? t("enabled") : t("disabled")}
        </Badge>
      </div>

      {!enabled && isStaff && !done ? (
        <Alert tone="warning" className="mt-4">
          {t("requiredForStaff")}
        </Alert>
      ) : null}

      {!enabled && !done ? (
        enrollment ? (
          <div className="mt-5 space-y-5">
            <p className="text-sm">{t("step1")}</p>
            <div>
              <p className="text-sm">{t("step2")}</p>
              <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated on our server */}
                <img
                  src={enrollment.qrDataUrl}
                  alt={t("qrAlt")}
                  width={176}
                  height={176}
                  className="rounded-lg border bg-white p-2"
                />
                <code
                  dir="ltr"
                  className="rounded-md bg-surface-muted px-3 py-2 font-mono text-sm break-all select-all"
                >
                  {enrollment.secret}
                </code>
              </div>
            </div>
            <BackupCodes codes={enrollment.backupCodes} />
            <form action={confirm} className="space-y-3" noValidate>
              <p className="text-sm">{t("step3")}</p>
              <FormAlert state={confirmState} />
              <OtpInput autoSubmit={false} aria-label={tAuth("codeLabel")} />
              <SubmitButton block>{t("confirm")}</SubmitButton>
            </form>
          </div>
        ) : (
          <form action={start} className="mt-5 space-y-3" noValidate>
            <FormAlert state={startState} />
            <Field
              label={tAuth("currentPassword")}
              htmlFor="tf-password"
              hint={t("confirmPasswordToStart")}
            >
              <PasswordInput
                id="tf-password"
                name="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <SubmitButton>{t("enable")}</SubmitButton>
          </form>
        )
      ) : null}

      {done ? (
        <div className="mt-4 space-y-3">
          <Alert tone="success">{confirmState?.message}</Alert>
          {isStaff ? (
            <Link href="/admin" className={buttonVariants({ block: true })}>
              {t("goToAdmin")}
            </Link>
          ) : null}
        </div>
      ) : null}

      {enabled ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <form action={regen} className="space-y-3" noValidate>
            <FormAlert state={regenState?.ok ? null : regenState} />
            <PasswordInput
              name="password"
              autoComplete="current-password"
              placeholder={tAuth("currentPassword")}
              aria-label={tAuth("currentPassword")}
              required
            />
            <SubmitButton variant="outline">{t("regenerate")}</SubmitButton>
          </form>
          {!isStaff ? (
            <form action={disable} className="space-y-3" noValidate>
              <FormAlert state={disableState} />
              <PasswordInput
                name="password"
                autoComplete="current-password"
                placeholder={tAuth("currentPassword")}
                aria-label={tAuth("currentPassword")}
                required
              />
              <SubmitButton variant="ghost" className="text-danger">
                {t("disable")}
              </SubmitButton>
            </form>
          ) : null}
          {regenState?.ok ? (
            <div className="sm:col-span-2">
              <BackupCodes codes={(regenState.data as { backupCodes: string[] }).backupCodes} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
