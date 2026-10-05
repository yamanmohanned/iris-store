"use server";

import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { field, toFormState } from "@/server/action-errors";
import { getAuth } from "@/server/auth";
import { clearPendingEmail, getPendingEmail, setPendingEmail } from "@/server/auth/pending";
import { isStaffRole } from "@/server/auth/permissions";
import { authHeaders, requestIp, safeNextPath } from "@/server/auth/session";
import { assertHuman } from "@/server/security/turnstile";
import {
  registerCustomer,
  resetPasswordWithCode,
  sendEmailCode,
  signInWithEmailCode,
  signInWithPassword,
  signOut,
  verifyEmailCode,
  verifyTwoFactor,
  type AuthCtx,
} from "@/server/services/auth-flows";

async function authCtx(locale: string): Promise<AuthCtx> {
  const h = await headers();
  return {
    headers: await authHeaders(locale),
    ip: await requestIp(),
    userAgent: h.get("user-agent"),
  };
}

/** Staff land in the admin (or the admin page they came from); customers go back where they were. */
function destination(role: string, next: unknown): string {
  if (isStaffRole(role)) {
    const target = safeNextPath(next, "/admin");
    return target.startsWith("/admin") ? target : "/admin";
  }
  return safeNextPath(next, "/account");
}

const captchaToken = (form: FormData) => field(form, "cf-turnstile-response", 2048);

// ── Registration ─────────────────────────────────────────────────────────────

export async function signUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  const values = { name: field(form, "name", 80), email: field(form, "email", 254) };
  try {
    const ctx = await authCtx(locale);
    await assertHuman(captchaToken(form), ctx.ip);
    const { email } = await registerCustomer(
      { ...values, password: field(form, "password", 200) },
      ctx,
    );
    await setPendingEmail(email);
  } catch (error) {
    return toFormState(error, values);
  }
  redirect({
    href: {
      pathname: "/verify-email",
      query: { next: safeNextPath(form.get("next"), "/account") },
    },
    locale,
  });
  return null;
}

export async function verifyEmailAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  let role = "customer";
  try {
    const email = (await getPendingEmail()) ?? field(form, "email", 254);
    ({ role } = await verifyEmailCode(
      { email, code: field(form, "code", 12) },
      await authCtx(locale),
    ));
    await clearPendingEmail();
  } catch (error) {
    return toFormState(error);
  }
  redirect({ href: destination(role, form.get("next")), locale });
  return null;
}

/** Resend the email-verification or sign-in code shown on the code entry screens. */
export async function resendCodeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  const purpose = field(form, "purpose", 30);
  const type =
    purpose === "sign-in"
      ? "sign-in"
      : purpose === "forget-password"
        ? "forget-password"
        : "email-verification";
  try {
    const email = await getPendingEmail();
    if (email) await sendEmailCode({ email }, type, await authCtx(locale));
    const { getTranslations } = await import("next-intl/server");
    return { ok: true, message: (await getTranslations("auth"))("codeSent") };
  } catch (error) {
    return toFormState(error);
  }
}

// ── Sign-in ──────────────────────────────────────────────────────────────────

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  const values = { email: field(form, "email", 254) };
  const next = form.get("next");
  let target: string;
  try {
    const ctx = await authCtx(locale);
    await assertHuman(captchaToken(form), ctx.ip);
    const outcome = await signInWithPassword(
      {
        email: values.email,
        password: field(form, "password", 200),
        rememberMe: form.get("rememberMe") === "on",
      },
      ctx,
    );
    if (outcome.kind === "verify-email") {
      await setPendingEmail(values.email.trim().toLowerCase());
      target = `/verify-email?resent=1&next=${encodeURIComponent(safeNextPath(next))}`;
    } else if (outcome.kind === "two-factor") {
      target = `/two-factor?next=${encodeURIComponent(safeNextPath(next, ""))}`;
    } else {
      target = destination(outcome.role, next);
    }
  } catch (error) {
    return toFormState(error, values);
  }
  redirect({ href: target, locale });
  return null;
}

export async function requestSignInCodeAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = await getLocale();
  const values = { email: field(form, "email", 254) };
  try {
    const ctx = await authCtx(locale);
    await assertHuman(captchaToken(form), ctx.ip);
    await sendEmailCode({ email: values.email }, "sign-in", ctx);
    await setPendingEmail(values.email.trim().toLowerCase());
  } catch (error) {
    return toFormState(error, values);
  }
  redirect({
    href: {
      pathname: "/login/code",
      query: { step: "verify", next: safeNextPath(form.get("next")) },
    },
    locale,
  });
  return null;
}

export async function signInWithCodeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  let role = "customer";
  try {
    const email = (await getPendingEmail()) ?? "";
    ({ role } = await signInWithEmailCode(
      { email, code: field(form, "code", 12) },
      await authCtx(locale),
    ));
    await clearPendingEmail();
  } catch (error) {
    return toFormState(error);
  }
  redirect({ href: destination(role, form.get("next")), locale });
  return null;
}

export async function googleSignInAction(form: FormData): Promise<void> {
  const locale = (await getLocale()) as Locale;
  const prefix = locale === "ar" ? "" : `/${locale}`;
  const next = safeNextPath(form.get("next"));
  const result = await getAuth().api.signInSocial({
    body: {
      provider: "google",
      callbackURL: `${prefix}${next}`,
      errorCallbackURL: `${prefix}/login?error=oauth`,
    },
    headers: await authHeaders(locale),
  });
  if (!result.url || !result.url.startsWith("https://accounts.google.com/")) {
    redirect({ href: { pathname: "/login", query: { error: "oauth" } }, locale });
  }
  nextRedirect(result.url!);
}

export async function verifyTwoFactorAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  let role = "customer";
  try {
    ({ role } = await verifyTwoFactor(
      {
        code: field(form, "code", 24),
        kind: form.get("kind") === "backup" ? "backup" : "totp",
        trustDevice: form.get("trustDevice") === "on",
      },
      await authCtx(locale),
    ));
  } catch (error) {
    return toFormState(error);
  }
  redirect({ href: destination(role, form.get("next")), locale });
  return null;
}

// ── Password reset ───────────────────────────────────────────────────────────

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  const values = { email: field(form, "email", 254) };
  try {
    const ctx = await authCtx(locale);
    await assertHuman(captchaToken(form), ctx.ip);
    await sendEmailCode({ email: values.email }, "forget-password", ctx);
    await setPendingEmail(values.email.trim().toLowerCase());
  } catch (error) {
    return toFormState(error, values);
  }
  redirect({ href: "/reset-password", locale });
  return null;
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  try {
    const email = (await getPendingEmail()) ?? "";
    await resetPasswordWithCode(
      { email, code: field(form, "code", 12), password: field(form, "password", 200) },
      await authCtx(locale),
    );
    await clearPendingEmail();
  } catch (error) {
    return toFormState(error);
  }
  redirect({ href: { pathname: "/login", query: { reset: "1" } }, locale });
  return null;
}

export async function signOutAction(): Promise<void> {
  const locale = await getLocale();
  try {
    await signOut(await authCtx(locale));
  } catch {
    // Already signed out — nothing to do.
  }
  redirect({ href: "/", locale });
}
