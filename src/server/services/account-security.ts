import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { renderSVG } from "uqr";
import { z } from "zod";
import { describeUserAgent } from "@/lib/user-agent";
import { getAuth } from "@/server/auth";
import { isStaffRole } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { sessions } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import {
  checkPasswordPolicy,
  isPwnedPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/server/security/password";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { auditSafe } from "./audit";

type UserRef = {
  id: string;
  email: string;
  role?: string | null;
  twoFactorEnabled?: boolean | null;
};

const passwordField = z.string().min(1).max(PASSWORD_MAX_LENGTH);

async function limitPasswordChecks(userId: string) {
  await enforceRateLimit(`acct-pw:${userId}`, 10, 15 * 60);
}

/** Step 1: confirm the password, get the authenticator QR code and one-time backup codes. */
export async function startTwoFactorEnrollment(password: string, headers: Headers, user: UserRef) {
  passwordField.parse(password);
  await limitPasswordChecks(user.id);
  const result = await getAuth().api.enableTwoFactor({ body: { password }, headers });
  if (result.method !== "totp") throw new AppError("INTERNAL", "unexpected 2FA method");
  const svg = renderSVG(result.totpURI, { border: 2, ecc: "M" });
  const secret = new URL(result.totpURI).searchParams.get("secret") ?? "";
  return {
    qrDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    secret, // shown for manual entry when the camera can't scan
    backupCodes: result.backupCodes,
  };
}

/** Step 2: the first valid code from the app activates 2FA. */
export async function confirmTwoFactorEnrollment(code: string, headers: Headers, user: UserRef) {
  const clean = z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .parse(code.replace(/\s+/g, ""));
  await enforceRateLimit(`2fa-enroll:${user.id}`, 10, 15 * 60);
  await getAuth().api.verifyTOTP({ body: { code: clean }, headers });
  auditSafe({ action: "auth.2fa.enabled", actorId: user.id, actorLabel: user.email });
}

export async function disableTwoFactor(password: string, headers: Headers, user: UserRef) {
  if (isStaffRole(user.role))
    throw new AppError("FORBIDDEN", "2FA is mandatory for staff accounts");
  passwordField.parse(password);
  await limitPasswordChecks(user.id);
  await getAuth().api.disableTwoFactor({ body: { password }, headers });
  auditSafe({ action: "auth.2fa.disabled", actorId: user.id, actorLabel: user.email });
}

export async function regenerateBackupCodes(password: string, headers: Headers, user: UserRef) {
  passwordField.parse(password);
  await limitPasswordChecks(user.id);
  const result = await getAuth().api.generateBackupCodes({ body: { password }, headers });
  auditSafe({
    action: "auth.2fa.backup_codes_regenerated",
    actorId: user.id,
    actorLabel: user.email,
  });
  return result.backupCodes;
}

export const changePasswordSchema = z.object({
  currentPassword: passwordField,
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

/** Changing the password signs out every other device. */
export async function changePassword(
  raw: z.input<typeof changePasswordSchema>,
  headers: Headers,
  user: UserRef,
) {
  const input = changePasswordSchema.parse(raw);
  await limitPasswordChecks(user.id);
  const problem = checkPasswordPolicy(input.newPassword, { email: user.email });
  if (problem)
    throw new AppError("VALIDATION", "weak password", { field: "newPassword", password: problem });
  if (await isPwnedPassword(input.newPassword)) {
    throw new AppError("VALIDATION", "pwned password", { field: "newPassword", password: "pwned" });
  }
  await getAuth().api.changePassword({
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: true,
    },
    headers,
  });
  auditSafe({ action: "auth.password_changed", actorId: user.id, actorLabel: user.email });
}

// ── Devices / sessions ───────────────────────────────────────────────────────

export type DeviceSession = {
  id: string;
  current: boolean;
  device: string;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
};

export async function listDeviceSessions(
  userId: string,
  currentSessionId: string,
): Promise<DeviceSession[]> {
  const rows = await db
    .select({
      id: sessions.id,
      ip: sessions.ipAddress,
      ua: sessions.userAgent,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.updatedAt));
  return rows
    .filter((r) => r.expiresAt > new Date())
    .map((r) => ({
      id: r.id,
      current: r.id === currentSessionId,
      device: describeUserAgent(r.ua),
      ipAddress: r.ip,
      lastActiveAt: r.updatedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
}

/** Sign out one device. Scoped by user id, so nobody can revoke another person's session. */
export async function revokeDeviceSession(userId: string, sessionId: string) {
  z.uuid().parse(sessionId);
  const deleted = await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .returning({ id: sessions.id });
  if (deleted.length)
    auditSafe({ action: "auth.session.revoked", actorId: userId, metadata: { sessionId } });
}

export async function revokeOtherDeviceSessions(userId: string, currentSessionId: string) {
  const deleted = await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)))
    .returning({ id: sessions.id });
  auditSafe({
    action: "auth.session.revoked_others",
    actorId: userId,
    metadata: { count: deleted.length },
  });
  return deleted.length;
}
