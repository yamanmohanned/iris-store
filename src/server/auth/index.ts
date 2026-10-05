import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { twoFactor } from "better-auth/plugins/two-factor";
import { eq } from "drizzle-orm";
import { runInBackground } from "@/server/background";
import { getDb } from "@/server/db/client";
import { accounts, sessions, twoFactors, users, verifications } from "@/server/db/schema";
import { sendEmail } from "@/server/email";
import { existingAccountEmail, otpEmail, type EmailLocale } from "@/server/email/templates";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { hitRateLimit } from "@/server/security/rate-limit";
import {
  hashPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  verifyPassword,
} from "@/server/security/password";
import { auditSafe } from "@/server/services/audit";
import { emailBrand } from "./brand";
import { isStaffRole } from "./permissions";

/** Header we set ourselves (never trusted from the client) carrying the resolved client IP. */
export const CLIENT_IP_HEADER = "x-iris-client-ip";
/** Header carrying the UI locale into auth callbacks (email language). */
export const LOCALE_HEADER = "x-iris-locale";

export const OTP_TTL_SECONDS = 600;

/**
 * Sessions for staff may only come from password sign-in (which is followed by 2FA when enabled)
 * or a completed 2FA challenge. Email-code and social sign-in skip 2FA, so they are customer-only.
 */
const STAFF_SESSION_PATHS = new Set([
  "/sign-in/email",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/two-factor/verify-otp",
]);

function localeFrom(headers: Headers | undefined | null): EmailLocale {
  return headers?.get(LOCALE_HEADER) === "en" ? "en" : "ar";
}

function createAuth() {
  const e = env();
  const secure = e.APP_URL.startsWith("https://");
  const google =
    e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: e.GOOGLE_CLIENT_ID,
            clientSecret: e.GOOGLE_CLIENT_SECRET,
            prompt: "select_account" as const,
          },
        }
      : undefined;

  return betterAuth({
    appName: "Iris Store",
    baseURL: e.APP_URL,
    basePath: "/api/auth",
    secret: e.AUTH_SECRET,
    trustedOrigins: [e.APP_URL],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        twoFactor: twoFactors,
      },
    }),
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "customer", input: false },
        phone: { type: "string", required: false, input: false },
        banned: { type: "boolean", required: false, defaultValue: false, input: false },
        locale: { type: "string", required: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      revokeSessionsOnPasswordReset: true,
      password: { hash: hashPassword, verify: verifyPassword },
      // Sign-up with an existing email looks successful (no account enumeration); the real owner
      // gets a heads-up email instead.
      onExistingUserSignUp: async ({ user }, request) => {
        const locale = localeFrom(request?.headers);
        runInBackground("existing-account-email", async () =>
          sendEmail(existingAccountEmail({ to: user.email, locale, brand: await emailBrand() })),
        );
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days, rolling
      updateAge: 60 * 60 * 24, // extend at most once a day
      freshAge: 60 * 15,
      cookieCache: { enabled: false }, // always read from DB → revocation is immediate
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    socialProviders: google,
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customStorage: {
        consume: async (key, rule) => {
          const r = await hitRateLimit(`ba:${key}`, rule.max, rule.window);
          return { allowed: r.allowed, retryAfter: r.allowed ? null : r.retryAfter };
        },
      },
    },
    advanced: {
      cookiePrefix: "iris",
      useSecureCookies: secure,
      defaultCookieAttributes: { sameSite: "lax", httpOnly: true, secure },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
      database: { generateId: "uuid" },
      backgroundTasks: { handler: (promise) => runInBackground("better-auth", () => promise) },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: { ...user, email: user.email.trim().toLowerCase(), role: "customer" },
          }),
        },
      },
      session: {
        create: {
          before: async (session, ctx) => {
            const [row] = await getDb()
              .select({ role: users.role, banned: users.banned })
              .from(users)
              .where(eq(users.id, session.userId));
            if (!row) return false;
            if (row.banned)
              throw new APIError("FORBIDDEN", {
                code: "ACCOUNT_SUSPENDED",
                message: "Account suspended",
              });
            if (isStaffRole(row.role) && ctx?.path && !STAFF_SESSION_PATHS.has(ctx.path)) {
              throw new APIError("FORBIDDEN", {
                code: "STAFF_PASSWORD_REQUIRED",
                message: "Staff must sign in with password and 2FA",
              });
            }
          },
          after: async (session, ctx) => {
            await getDb()
              .update(users)
              .set({ lastLoginAt: new Date() })
              .where(eq(users.id, session.userId));
            auditSafe({
              action: "auth.session.created",
              actorId: session.userId,
              metadata: { via: ctx?.path ?? "internal" },
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
            });
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: OTP_TTL_SECONDS,
        allowedAttempts: 5,
        storeOTP: "hashed",
        sendVerificationOnSignUp: true,
        overrideDefaultEmailVerification: true,
        disableSignUp: true, // codes never create accounts; registration is explicit
        rateLimit: { window: 60, max: 3 },
        sendVerificationOTP: async ({ email, otp, type }, ctx) => {
          const locale = localeFrom(ctx?.headers);
          // Not awaited: equal timing whether or not the account exists.
          runInBackground(`otp:${type}`, async () =>
            sendEmail(
              otpEmail({
                to: email,
                locale,
                brand: await emailBrand(),
                code: otp,
                purpose: type,
                minutes: OTP_TTL_SECONDS / 60,
              }),
            ),
          );
        },
      }),
      twoFactor({
        issuer: new URL(e.APP_URL).hostname,
        totpOptions: { digits: 6, period: 30 },
        backupCodeOptions: { amount: 10, length: 10 },
        twoFactorCookieMaxAge: 600,
        trustDeviceMaxAge: 60 * 60 * 24 * 7,
        accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 900 },
      }),
      nextCookies(), // must stay last: lets server actions set auth cookies
    ],
    logger: {
      disabled: e.NODE_ENV === "test",
      level: "warn",
      log: (level, message, ...args) => {
        const fn = level === "error" ? logger.error.bind(logger) : logger.warn.bind(logger);
        fn({ args: args.length ? args : undefined }, `[better-auth] ${message}`);
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];

const globalForAuth = globalThis as unknown as { __irisAuth?: Auth };

/** Lazily created Better Auth instance (needs runtime env + DB). */
export function getAuth(): Auth {
  globalForAuth.__irisAuth ??= createAuth();
  return globalForAuth.__irisAuth;
}
