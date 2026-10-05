"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert, PasswordInput, SubmitButton } from "@/components/forms/form-controls";
import { Turnstile } from "@/components/turnstile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { googleSignInAction, signInAction } from "../actions";
import { Divider, GoogleIcon } from "./auth-card";

export function LoginForm({
  next,
  googleEnabled,
  turnstileKey,
  nonce,
  notice,
}: {
  next: string;
  googleEnabled: boolean;
  turnstileKey: string | null;
  nonce?: string;
  notice?: { tone: "success" | "info" | "danger"; text: string } | null;
}) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(signInAction, null);
  const err = state?.fieldErrors ?? {};

  return (
    <>
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormAlert state={state} />
        <Field label={t("email")} htmlFor="email" error={err.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            dir="ltr"
            required
            defaultValue={state?.values?.email}
            aria-invalid={Boolean(err.email)}
          />
        </Field>
        <Field label={t("password")} htmlFor="password" error={err.password}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(err.password)}
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="rememberMe"
              defaultChecked
              className="size-4 accent-[var(--primary)]"
            />
            {t("rememberMe")}
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        {turnstileKey ? <Turnstile siteKey={turnstileKey} nonce={nonce} action="login" /> : null}
        <SubmitButton block size="lg">
          {t("signIn")}
        </SubmitButton>
      </form>

      <Divider>{t("orDivider")}</Divider>
      <div className="space-y-3">
        <Link
          href={{ pathname: "/login/code", query: next ? { next } : {} }}
          className={buttonVariants({ variant: "outline", size: "lg", block: true })}
        >
          <Mail aria-hidden="true" />
          {t("signInWithCode")}
        </Link>
        {googleEnabled ? (
          <form action={googleSignInAction}>
            <input type="hidden" name="next" value={next || "/account"} />
            <Button type="submit" variant="outline" size="lg" block>
              <GoogleIcon />
              {t("continueWithGoogle")}
            </Button>
          </form>
        ) : null}
      </div>
    </>
  );
}
