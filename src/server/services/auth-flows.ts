import "server-only";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/server/auth";
import { isStaffRole } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import {
  checkPasswordPolicy,
  isPwnedPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/server/security/password";
import {
  enforceRateLimit,
  hashKey,
  hitRateLimit,
  peekRateLimit,
  resetRateLimit,
} from "@/server/security/rate-limit";
import { auditSafe } from "./audit";

/** Request context for auth flows (headers already carry our resolved client IP + locale). */
export type AuthCtx = { headers: Headers; ip: string | null; userAgent?: string | null };

const MIN = 60;
/** Failed password attempts per email within the window before the account is temporarily locked. */
export const LOGIN_LOCK_THRESHOLD = 8;
export const LOGIN_LOCK_WINDOW = 15 * MIN;

const emailSchema = z
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());
const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "otp");

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  rememberMe: z.boolean().default(true),
});
export const emailOnlySchema = z.object({ email: emailSchema });
export const emailCodeSchema = z.object({ email: emailSchema, code: otpSchema });
export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: otpSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
export const twoFactorSchema = z.object({
  code: z.string().trim().min(6).max(24),
  kind: z.enum(["totp", "backup"]).default("totp"),
  trustDevice: z.boolean().default(false),
});

const ipKey = (ctx: AuthCtx) => ctx.ip ?? "unknown";

async function assertStrongPassword(password: string, ctx: { email?: string; name?: string }) {
  const problem = checkPasswordPolicy(password, ctx);
  if (problem)
    throw new AppError("VALIDATION", "weak password", { field: "password", password: problem });
  if (await isPwnedPassword(password)) {
    throw new AppError("VALIDATION", "pwned password", { field: "password", password: "pwned" });
  }
}

async function userByEmail(email: string) {
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      banned: users.banned,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email));
  return row;
}

// ── Registration & email verification ───────────────────────────────────────

export async function registerCustomer(raw: z.input<typeof signUpSchema>, ctx: AuthCtx) {
  const input = signUpSchema.parse(raw);
  await enforceRateLimit(`signup:ip:${ipKey(ctx)}`, 10, 60 * MIN);
  await enforceRateLimit(`signup:email:${hashKey(input.email)}`, 5, 60 * MIN);
  await assertStrongPassword(input.password, { email: input.email, name: input.name });

  // Existing emails get the same response (Better Auth returns a synthetic user and emails the
  // real owner), so this endpoint cannot be used to discover registered addresses.
  await getAuth().api.signUpEmail({
    body: { name: input.name, email: input.email, password: input.password },
    headers: ctx.headers,
  });
  auditSafe({
    action: "auth.sign_up",
    metadata: { email: hashKey(input.email) },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });
  return { email: input.email };
}

export async function verifyEmailCode(raw: z.input<typeof emailCodeSchema>, ctx: AuthCtx) {
  const input = emailCodeSchema.parse(raw);
  await enforceRateLimit(`otp-verify:ip:${ipKey(ctx)}`, 30, 15 * MIN);
  await enforceRateLimit(`otp-verify:email:${hashKey(input.email)}`, 10, 15 * MIN);
  const result = await getAuth().api.verifyEmailOTP({
    body: { email: input.email, otp: input.code },
    headers: ctx.headers,
    returnHeaders: true,
  });
  const user = await userByEmail(input.email);
  auditSafe({
    action: "auth.email_verified",
    actorId: user?.id,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });
  return { role: user?.role ?? "customer", headers: result.headers };
}

/** Send a fresh verification / sign-in / reset code. Always "succeeds" for unknown emails. */
export async function sendEmailCode(
  raw: z.input<typeof emailOnlySchema>,
  type: "email-verification" | "sign-in" | "forget-password",
  ctx: AuthCtx,
) {
  const input = emailOnlySchema.parse(raw);
  await enforceRateLimit(`otp-send:ip:${ipKey(ctx)}`, 10, 15 * MIN);
  const perEmail = await hitRateLimit(`otp-send:email:${hashKey(input.email)}`, 5, 15 * MIN);
  if (!perEmail.allowed)
    throw new AppError("RATE_LIMITED", "too many codes", { retryAfter: perEmail.retryAfter });

  const user = await userByEmail(input.email);
  // Staff must use password + 2FA; never mail them passwordless sign-in codes.
  if (type === "sign-in" && user && isStaffRole(user.role)) return;
  if (!user || user.banned) return;
  if (type === "email-verification" && user.emailVerified) return;

  if (type === "forget-password") {
    await getAuth().api.forgetPasswordEmailOTP({
      body: { email: input.email },
      headers: ctx.headers,
    });
  } else {
    await getAuth().api.sendVerificationOTP({
      body: { email: input.email, type },
      headers: ctx.headers,
    });
  }
}

// ── Sign-in ──────────────────────────────────────────────────────────────────

export type SignInOutcome =
  | { kind: "signed-in"; role: string; headers: Headers }
  | { kind: "two-factor"; headers: Headers }
  | { kind: "verify-email" };

export async function signInWithPassword(
  raw: z.input<typeof signInSchema>,
  ctx: AuthCtx,
): Promise<SignInOutcome> {
  const input = signInSchema.parse(raw);
  const failKey = `login-fail:${hashKey(input.email)}`;

  // Lockout is per email (protects the account) and applies to unknown emails too (no enumeration).
  if ((await peekRateLimit(failKey)) >= LOGIN_LOCK_THRESHOLD) {
    throw new AppError("RATE_LIMITED", "account temporarily locked", {
      locked: true,
      retryAfter: LOGIN_LOCK_WINDOW,
    });
  }
  await enforceRateLimit(`login:ip:${ipKey(ctx)}`, 30, 15 * MIN);

  try {
    const result = await getAuth().api.signInEmail({
      body: { email: input.email, password: input.password, rememberMe: input.rememberMe },
      headers: ctx.headers,
      returnHeaders: true,
    });
    await resetRateLimit(failKey);
    const body = result.response as { twoFactorRedirect?: boolean };
    if (body.twoFactorRedirect) return { kind: "two-factor", headers: result.headers };
    const user = await userByEmail(input.email);
    return { kind: "signed-in", role: user?.role ?? "customer", headers: result.headers };
  } catch (error) {
    if (error instanceof APIError) {
      const code = (error.body as { code?: string } | undefined)?.code;
      if (code === "EMAIL_NOT_VERIFIED") return { kind: "verify-email" };
      if (code === "INVALID_EMAIL_OR_PASSWORD") {
        const r = await hitRateLimit(failKey, LOGIN_LOCK_THRESHOLD, LOGIN_LOCK_WINDOW);
        auditSafe({
          action: "auth.sign_in.failed",
          metadata: { email: hashKey(input.email), attempt: r.count },
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });
      }
    }
    throw error;
  }
}

export async function signInWithEmailCode(raw: z.input<typeof emailCodeSchema>, ctx: AuthCtx) {
  const input = emailCodeSchema.parse(raw);
  await enforceRateLimit(`otp-verify:ip:${ipKey(ctx)}`, 30, 15 * MIN);
  await enforceRateLimit(`otp-verify:email:${hashKey(input.email)}`, 10, 15 * MIN);
  const result = await getAuth().api.signInEmailOTP({
    body: { email: input.email, otp: input.code },
    headers: ctx.headers,
    returnHeaders: true,
  });
  const user = await userByEmail(input.email);
  return { role: user?.role ?? "customer", headers: result.headers };
}

export async function verifyTwoFactor(raw: z.input<typeof twoFactorSchema>, ctx: AuthCtx) {
  const input = twoFactorSchema.parse(raw);
  await enforceRateLimit(`2fa:ip:${ipKey(ctx)}`, 20, 15 * MIN);
  const api = getAuth().api;
  const result =
    input.kind === "backup"
      ? await api.verifyBackupCode({
          body: { code: input.code.replace(/\s+/g, ""), trustDevice: input.trustDevice },
          headers: ctx.headers,
          returnHeaders: true,
        })
      : await api.verifyTOTP({
          body: { code: input.code.replace(/\s+/g, ""), trustDevice: input.trustDevice },
          headers: ctx.headers,
          returnHeaders: true,
        });
  const userId = (result.response as { user?: { id?: string } }).user?.id;
  const [row] = userId
    ? await db.select({ role: users.role }).from(users).where(eq(users.id, userId))
    : [];
  return { role: row?.role ?? "customer", headers: result.headers };
}

// ── Password reset ───────────────────────────────────────────────────────────

export async function resetPasswordWithCode(
  raw: z.input<typeof resetPasswordSchema>,
  ctx: AuthCtx,
) {
  const input = resetPasswordSchema.parse(raw);
  await enforceRateLimit(`otp-verify:ip:${ipKey(ctx)}`, 30, 15 * MIN);
  await enforceRateLimit(`otp-verify:email:${hashKey(input.email)}`, 10, 15 * MIN);
  await assertStrongPassword(input.password, { email: input.email });
  await getAuth().api.resetPasswordEmailOTP({
    body: { email: input.email, otp: input.code, password: input.password },
    headers: ctx.headers,
  });
  await resetRateLimit(`login-fail:${hashKey(input.email)}`);
  const user = await userByEmail(input.email);
  auditSafe({
    action: "auth.password_reset",
    actorId: user?.id,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

export async function signOut(ctx: AuthCtx) {
  await getAuth().api.signOut({ headers: ctx.headers });
}
