import { createHmac } from "node:crypto";
import { getAuth } from "@/server/auth";
import { db } from "@/server/db/client";
import { accounts, users } from "@/server/db/schema";
import { testMailbox, type EmailMessage } from "@/server/email";
import { hashPassword } from "@/server/security/password";
import type { AuthCtx } from "@/server/services/auth-flows";

/** Minimal cookie jar: carries Set-Cookie values from one auth call to the next. */
export class CookieJar {
  private cookies = new Map<string, string>();

  absorb(headers: Headers | undefined) {
    if (!headers) return;
    for (const raw of headers.getSetCookie()) {
      const [pair, ...attrs] = raw.split(";");
      const idx = pair!.indexOf("=");
      const name = pair!.slice(0, idx).trim();
      const value = pair!.slice(idx + 1).trim();
      const expired = attrs.some((a) => /max-age=0\b/i.test(a.trim())) || value === "";
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  has(fragment: string) {
    return [...this.cookies.keys()].some((k) => k.includes(fragment));
  }

  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

export function ctxFor(jar?: CookieJar, ip = "203.0.113.10"): AuthCtx {
  const headers = new Headers({
    origin: process.env.APP_URL ?? "http://localhost:3000",
    "user-agent": "vitest",
    "x-iris-client-ip": ip,
    "x-iris-locale": "ar",
  });
  const cookie = jar?.header();
  if (cookie) headers.set("cookie", cookie);
  return { headers, ip, userAgent: "vitest" };
}

export async function waitForEmail(
  to: string,
  match: (m: EmailMessage) => boolean = () => true,
  timeoutMs = 3000,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const found = [...testMailbox].reverse().find((m) => m.to === to && match(m));
    if (found) return found;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`No email to ${to} within ${timeoutMs}ms`);
}

export function otpFrom(message: EmailMessage): string {
  const code = message.text.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error("No OTP in email");
  return code;
}

export function clearMailbox() {
  testMailbox.length = 0;
}

export async function sessionFor(jar: CookieJar) {
  return getAuth().api.getSession({ headers: ctxFor(jar).headers });
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) for driving 2FA in tests. */
export function totp(base32Secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of base32Secret.replace(/=+$/, "").toUpperCase()) {
    const v = alphabet.indexOf(ch);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const bytes = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", bytes).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** Create a verified credential user directly in the DB (staff fixtures; no emails are sent). */
export async function createVerifiedUser(opts: {
  email: string;
  password: string;
  role?: string;
  name?: string;
}) {
  const [user] = await db
    .insert(users)
    .values({
      name: opts.name ?? "Staff Member",
      email: opts.email,
      emailVerified: true,
      role: (opts.role ?? "customer") as never,
    })
    .returning();
  await db.insert(accounts).values({
    userId: user!.id,
    accountId: user!.id,
    providerId: "credential",
    password: await hashPassword(opts.password),
  });
  return user!;
}
