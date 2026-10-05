import "server-only";
import { APIError } from "better-auth/api";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ZodError } from "zod";
import type { FormState } from "@/lib/form-state";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { PASSWORD_MIN_LENGTH } from "@/server/security/password";

/** Loose translator signature for helpers (keys are validated by the message files at build time). */
type T = (key: string, values?: Record<string, string | number>) => string;

const AUTH_CODE_KEYS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "auth.errors.invalidCredentials",
  INVALID_PASSWORD: "auth.errors.wrongPassword",
  INVALID_OTP: "auth.errors.invalidCode",
  INVALID_CODE: "auth.errors.invalidCode",
  INVALID_BACKUP_CODE: "auth.errors.invalidCode",
  OTP_EXPIRED: "auth.errors.codeExpired",
  OTP_HAS_EXPIRED: "auth.errors.codeExpired",
  TOO_MANY_ATTEMPTS: "auth.errors.tooManyAttempts",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "auth.errors.tooManyAttempts",
  ACCOUNT_SUSPENDED: "auth.errors.accountSuspended",
  STAFF_PASSWORD_REQUIRED: "auth.errors.staffPasswordRequired",
  INVALID_TWO_FACTOR_COOKIE: "auth.errors.twoFactorExpired",
  SESSION_EXPIRED: "auth.errors.sessionExpired",
  SESSION_NOT_FRESH: "auth.errors.sessionExpired",
  PASSWORD_TOO_SHORT: "validation.password.too_short",
  PASSWORD_TOO_LONG: "validation.password.too_long",
};

function zodFieldMessage(issue: ZodError["issues"][number], t: T): string {
  const anyIssue = issue as {
    code: string;
    minimum?: number | bigint;
    maximum?: number | bigint;
    format?: string;
    message?: string;
    input?: unknown;
  };
  switch (anyIssue.code) {
    case "too_small":
      if (anyIssue.minimum === 1 || anyIssue.input === "" || anyIssue.input === undefined)
        return t("validation.required");
      return t("validation.tooShort", { min: Number(anyIssue.minimum) });
    case "too_big":
      return t("validation.tooLong", { max: Number(anyIssue.maximum) });
    case "invalid_format":
      if (anyIssue.format === "email") return t("validation.email");
      if (anyIssue.message === "otp") return t("validation.otp");
      return t("validation.invalid");
    case "invalid_type":
      return anyIssue.input === undefined || anyIssue.input === null
        ? t("validation.required")
        : t("validation.invalid");
    default:
      if (anyIssue.message === "required") return t("validation.required");
      return t("validation.invalid");
  }
}

/**
 * Convert any thrown error into a translated FormState. Next.js control-flow errors (redirect,
 * notFound) are re-thrown. Unknown errors are logged and shown as a generic message (no leaks).
 */
export async function toFormState(
  error: unknown,
  values?: Record<string, string>,
): Promise<FormState> {
  unstable_rethrow(error);
  const translate = await getTranslations();
  const t: T = (key, values) => translate(key as never, values as never);

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= zodFieldMessage(issue, t);
    }
    return { ok: false, message: t("errors.validation"), fieldErrors, values };
  }

  if (isAppError(error)) {
    const d = (error.details ?? {}) as {
      field?: string;
      password?: string;
      locked?: boolean;
      retryAfter?: number;
      captcha?: boolean;
    };
    switch (error.code) {
      case "VALIDATION":
        if (d.password) {
          const msg = t(`validation.password.${d.password}`, { min: PASSWORD_MIN_LENGTH });
          return { ok: false, fieldErrors: { [d.field ?? "password"]: msg }, values };
        }
        return {
          ok: false,
          message: t("errors.validation"),
          fieldErrors: d.field ? { [d.field]: t("validation.invalid") } : undefined,
          values,
        };
      case "RATE_LIMITED":
        return {
          ok: false,
          message: d.locked
            ? t("auth.errors.accountLocked", {
                minutes: Math.max(1, Math.ceil((d.retryAfter ?? 900) / 60)),
              })
            : t("errors.rateLimited"),
          retryAfter: d.retryAfter,
          values,
        };
      case "BAD_REQUEST":
        return {
          ok: false,
          message: d.captcha ? t("auth.errors.captcha") : t("errors.validation"),
          values,
        };
      case "UNAUTHORIZED":
        return { ok: false, message: t("errors.unauthorized"), values };
      case "FORBIDDEN":
        return {
          ok: false,
          message: d.field ? undefined : t("errors.forbidden"),
          fieldErrors: d.field ? { [d.field]: t("validation.invalid") } : undefined,
          values,
        };
      case "CONFLICT":
        return {
          ok: false,
          message: t("errors.conflict"),
          fieldErrors: d.field ? { [d.field]: t("errors.conflict") } : undefined,
          values,
        };
      default:
        break;
    }
  }

  if (error instanceof APIError) {
    const code = (error.body as { code?: string } | undefined)?.code ?? "";
    const key = AUTH_CODE_KEYS[code];
    if (key) {
      const message = t(key, { min: PASSWORD_MIN_LENGTH, minutes: 15 });
      return { ok: false, message, values };
    }
    if (error.statusCode === 429) return { ok: false, message: t("errors.rateLimited"), values };
    logger.warn({ code, status: error.statusCode }, "unmapped auth error");
    return { ok: false, message: t("auth.errors.generic"), values };
  }

  logger.error({ err: error }, "unexpected server action error");
  return { ok: false, message: t("errors.genericBody"), values };
}

/** Read a string field from FormData (trimmed, capped) — never trust its presence or type. */
export function field(form: FormData, name: string, max = 500): string {
  const v = form.get(name);
  return typeof v === "string" ? v.slice(0, max) : "";
}
