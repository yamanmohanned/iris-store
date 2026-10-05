import "server-only";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { clientIpFrom } from "@/server/security/client-ip";
import { CLIENT_IP_HEADER, getAuth, LOCALE_HEADER, type AuthSession } from "./index";
import { hasPermission, isStaffRole, type Permission } from "./permissions";

/** Staff sessions are re-authenticated at least once a day (absolute timeout). */
export const STAFF_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Request headers for Better Auth calls: the client IP resolved by OUR proxy rules replaces any
 * client-supplied value, and the UI locale is forwarded for email language.
 *
 * The Cookie header is rebuilt from the live cookie store, so cookies changed earlier in the same
 * request (e.g. a session rotated by enabling 2FA or changing the password inside a Server Action)
 * are seen by the re-render that follows — instead of the stale token from the original request.
 */
export async function authHeaders(locale?: string): Promise<Headers> {
  const h = new Headers(await headers());
  const jar = (await cookies()).getAll();
  if (jar.length)
    h.set("cookie", jar.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; "));
  else h.delete("cookie");
  const ip = clientIpFrom(h);
  if (ip) h.set(CLIENT_IP_HEADER, ip);
  else h.delete(CLIENT_IP_HEADER);
  if (locale) h.set(LOCALE_HEADER, locale);
  else h.delete(LOCALE_HEADER);
  return h;
}

export async function requestIp(): Promise<string | null> {
  return clientIpFrom(await headers());
}

/** Current session (deduplicated per request). Never throws. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  try {
    return await getAuth().api.getSession({ headers: await authHeaders() });
  } catch (err) {
    logger.error({ err }, "getSession failed");
    return null;
  }
});

export type Actor = { id: string; label: string; role: string };

function toActor(session: AuthSession): Actor {
  return {
    id: session.user.id,
    label: session.user.email,
    role: (session.user.role as string) ?? "customer",
  };
}

function staffSessionTooOld(session: AuthSession) {
  return Date.now() - new Date(session.session.createdAt).getTime() > STAFF_SESSION_MAX_AGE_MS;
}

/** For customer pages: returns the session or redirects to the sign-in page. */
export async function requireUserPage(locale: Locale, next: string): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect({ href: { pathname: "/login", query: { next } }, locale });
  return session!;
}

/**
 * For admin pages. Customers get a 404 (the admin area is not advertised); staff without 2FA are
 * sent to set it up; stale staff sessions must sign in again.
 */
export async function requireStaffPage(
  locale: Locale,
  permission: Permission = "dashboard:view",
): Promise<{ session: AuthSession; actor: Actor }> {
  const session = await getSession();
  if (!session) redirect({ href: { pathname: "/login", query: { next: "/admin" } }, locale });
  const s = session!;
  if (!isStaffRole(s.user.role as string)) notFound();
  if (staffSessionTooOld(s)) {
    await getAuth()
      .api.signOut({ headers: await authHeaders() })
      .catch(() => undefined);
    redirect({
      href: { pathname: "/login", query: { next: "/admin", reason: "expired" } },
      locale,
    });
  }
  if (!s.user.twoFactorEnabled)
    redirect({ href: { pathname: "/account/security", query: { setup2fa: "1" } }, locale });
  if (!hasPermission(s.user.role as string, permission))
    redirect({ href: { pathname: "/admin", query: { denied: "1" } }, locale });
  return { session: s, actor: toActor(s) };
}

/** For server actions: same rules as above, but throws instead of redirecting. */
export async function assertStaff(
  permission: Permission,
): Promise<{ session: AuthSession; actor: Actor }> {
  const session = await getSession();
  if (!session) throw new AppError("UNAUTHORIZED", "not signed in");
  if (!isStaffRole(session.user.role as string)) throw new AppError("FORBIDDEN", "not staff");
  if (staffSessionTooOld(session)) throw new AppError("UNAUTHORIZED", "staff session expired");
  if (!session.user.twoFactorEnabled) throw new AppError("FORBIDDEN", "2fa required");
  if (!hasPermission(session.user.role as string, permission))
    throw new AppError("FORBIDDEN", `missing ${permission}`);
  return { session, actor: toActor(session) };
}

export async function assertUser(): Promise<{ session: AuthSession; actor: Actor }> {
  const session = await getSession();
  if (!session) throw new AppError("UNAUTHORIZED", "not signed in");
  return { session, actor: toActor(session) };
}

export { safeNextPath } from "@/lib/safe-next";
