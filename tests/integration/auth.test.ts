import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getAuth } from "@/server/auth";
import { db } from "@/server/db/client";
import { auditLogs, sessions, users } from "@/server/db/schema";
import { testMailbox } from "@/server/email";
import {
  LOGIN_LOCK_THRESHOLD,
  registerCustomer,
  resetPasswordWithCode,
  sendEmailCode,
  signInWithEmailCode,
  signInWithPassword,
  verifyEmailCode,
  verifyTwoFactor,
} from "@/server/services/auth-flows";
import {
  clearMailbox,
  CookieJar,
  createVerifiedUser,
  ctxFor,
  otpFrom,
  sessionFor,
  totp,
  waitForEmail,
} from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

const PASSWORD = "Sunny-Morning-2026";

async function registerAndVerify(email: string) {
  await registerCustomer({ name: "سارة", email, password: PASSWORD }, ctxFor());
  const code = otpFrom(await waitForEmail(email));
  const jar = new CookieJar();
  const { headers } = await verifyEmailCode({ email, code }, ctxFor(jar));
  jar.absorb(headers);
  return jar;
}

describe("auth flows", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearMailbox();
  });

  it("registers a customer, emails a 6-digit code and signs in after verification", async () => {
    const jar = await registerAndVerify("sara@example.com");
    const session = await sessionFor(jar);
    expect(session?.user.email).toBe("sara@example.com");
    expect(session?.user.emailVerified).toBe(true);
    expect(session?.user.role).toBe("customer");

    // OTPs are stored hashed, never in plain text.
    const rows = await db.execute<{ value: string }>(
      (await import("drizzle-orm")).sql`select value from verifications`,
    );
    for (const r of rows.rows) expect(r.value).not.toMatch(/^\d{6}$/);
  });

  it("does not reveal whether an email is already registered", async () => {
    await registerAndVerify("taken@example.com");
    clearMailbox();
    await expect(
      registerCustomer(
        { name: "Xavier", email: "taken@example.com", password: PASSWORD },
        ctxFor(),
      ),
    ).resolves.toBeTruthy();
    const notice = await waitForEmail("taken@example.com");
    expect(notice.category).toBe("existing-account");
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("rejects weak passwords with a specific reason", async () => {
    await expect(
      registerCustomer({ name: "Amal", email: "a@example.com", password: "password123" }, ctxFor()),
    ).rejects.toMatchObject({ code: "VALIDATION", details: { password: "too_common" } });
    await expect(
      registerCustomer(
        { name: "Amal", email: "mohammed.ali@example.com", password: "mohammed.ali-2026" },
        ctxFor(),
      ),
    ).rejects.toMatchObject({ details: { password: "contains_email" } });
  });

  it("never lets a sign-up body choose its own role", async () => {
    // Better Auth either rejects or ignores non-input fields; either way the role stays "customer".
    await getAuth()
      .api.signUpEmail({
        body: {
          name: "Evil",
          email: "evil@example.com",
          password: PASSWORD,
          role: "owner",
          banned: false,
        } as never,
        headers: ctxFor().headers,
      })
      .catch(() => undefined);
    const [row] = await db.select().from(users).where(eq(users.email, "evil@example.com"));
    expect(row?.role ?? "customer").toBe("customer");
  });

  it("asks unverified users to verify instead of signing them in", async () => {
    await registerCustomer({ name: "Basma", email: "b@example.com", password: PASSWORD }, ctxFor());
    await waitForEmail("b@example.com");
    clearMailbox();
    const outcome = await signInWithPassword(
      { email: "b@example.com", password: PASSWORD },
      ctxFor(),
    );
    expect(outcome.kind).toBe("verify-email");
    expect(otpFrom(await waitForEmail("b@example.com"))).toMatch(/^\d{6}$/);
  });

  it("locks an email after repeated wrong passwords (even with the right password afterwards)", async () => {
    await registerAndVerify("c@example.com");
    for (let i = 0; i < LOGIN_LOCK_THRESHOLD; i++) {
      await expect(
        signInWithPassword(
          { email: "c@example.com", password: "wrong-password-x" },
          ctxFor(undefined, `198.51.100.${i}`),
        ),
      ).rejects.toBeInstanceOf(APIError);
    }
    await expect(
      signInWithPassword({ email: "c@example.com", password: PASSWORD }, ctxFor()),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      details: { locked: true },
    });
    const failures = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "auth.sign_in.failed"));
    expect(failures).toHaveLength(LOGIN_LOCK_THRESHOLD);
  });

  it("resets a password with an emailed code and revokes existing sessions", async () => {
    const jar = await registerAndVerify("d@example.com");
    expect(await sessionFor(jar)).not.toBeNull();
    clearMailbox();
    await sendEmailCode({ email: "d@example.com" }, "forget-password", ctxFor());
    const code = otpFrom(await waitForEmail("d@example.com"));
    await resetPasswordWithCode(
      { email: "d@example.com", code, password: "Brand-New-Secret-77" },
      ctxFor(),
    );
    expect(await sessionFor(jar)).toBeNull();
    const outcome = await signInWithPassword(
      { email: "d@example.com", password: "Brand-New-Secret-77" },
      ctxFor(),
    );
    expect(outcome.kind).toBe("signed-in");
  });

  it("limits wrong code attempts", async () => {
    await registerCustomer({ name: "Eman", email: "e@example.com", password: PASSWORD }, ctxFor());
    const code = otpFrom(await waitForEmail("e@example.com"));
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      await expect(
        verifyEmailCode({ email: "e@example.com", code: wrong }, ctxFor()),
      ).rejects.toBeInstanceOf(APIError);
    }
    // After too many attempts even the right code is refused; a new code must be requested.
    await expect(
      verifyEmailCode({ email: "e@example.com", code }, ctxFor()),
    ).rejects.toBeInstanceOf(APIError);
  });

  it("signs customers in with an emailed code but never mails codes to staff", async () => {
    await registerAndVerify("f@example.com");
    clearMailbox();
    await sendEmailCode({ email: "f@example.com" }, "sign-in", ctxFor());
    const jar = new CookieJar();
    const { headers } = await signInWithEmailCode(
      { email: "f@example.com", code: otpFrom(await waitForEmail("f@example.com")) },
      ctxFor(jar),
    );
    jar.absorb(headers);
    expect((await sessionFor(jar))?.user.email).toBe("f@example.com");

    await createVerifiedUser({ email: "staff@example.com", password: PASSWORD, role: "admin" });
    await sendEmailCode({ email: "staff@example.com" }, "sign-in", ctxFor());
    await new Promise((r) => setTimeout(r, 200));
    expect(testMailbox.filter((m) => m.to === "staff@example.com")).toHaveLength(0);
  });

  it("refuses passwordless sessions for staff even if a code is obtained", async () => {
    await createVerifiedUser({ email: "boss@example.com", password: PASSWORD, role: "owner" });
    await getAuth().api.sendVerificationOTP({
      body: { email: "boss@example.com", type: "sign-in" },
      headers: ctxFor().headers,
    });
    const code = otpFrom(await waitForEmail("boss@example.com"));
    await expect(
      signInWithEmailCode({ email: "boss@example.com", code }, ctxFor()),
    ).rejects.toMatchObject({
      body: { code: "STAFF_PASSWORD_REQUIRED" },
    });
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it("blocks suspended accounts", async () => {
    await registerAndVerify("g@example.com");
    await db.update(users).set({ banned: true }).where(eq(users.email, "g@example.com"));
    await expect(
      signInWithPassword({ email: "g@example.com", password: PASSWORD }, ctxFor()),
    ).rejects.toMatchObject({
      body: { code: "ACCOUNT_SUSPENDED" },
    });
  });

  it("enrolls TOTP two-factor and requires it at the next sign-in", async () => {
    await createVerifiedUser({ email: "admin@example.com", password: PASSWORD, role: "admin" });
    const first = await signInWithPassword(
      { email: "admin@example.com", password: PASSWORD },
      ctxFor(),
    );
    expect(first.kind).toBe("signed-in");
    const jar = new CookieJar();
    jar.absorb((first as { headers: Headers }).headers);

    const enabled = await getAuth().api.enableTwoFactor({
      body: { password: PASSWORD },
      headers: ctxFor(jar).headers,
    });
    if (enabled.method !== "totp") throw new Error("expected TOTP enrollment");
    const secret = new URL(enabled.totpURI).searchParams.get("secret")!;
    expect(enabled.backupCodes).toHaveLength(10);
    await getAuth().api.verifyTOTP({ body: { code: totp(secret) }, headers: ctxFor(jar).headers });
    const [row] = await db.select().from(users).where(eq(users.email, "admin@example.com"));
    expect(row!.twoFactorEnabled).toBe(true);

    const second = await signInWithPassword(
      { email: "admin@example.com", password: PASSWORD },
      ctxFor(),
    );
    expect(second.kind).toBe("two-factor");
    const challengeJar = new CookieJar();
    challengeJar.absorb((second as { headers: Headers }).headers);
    expect(await sessionFor(challengeJar)).toBeNull(); // no session until the code is entered

    await expect(verifyTwoFactor({ code: "000000" }, ctxFor(challengeJar))).rejects.toBeInstanceOf(
      APIError,
    );
    const ok = await verifyTwoFactor({ code: totp(secret) }, ctxFor(challengeJar));
    expect(ok.role).toBe("admin");
    challengeJar.absorb(ok.headers);
    expect((await sessionFor(challengeJar))?.user.email).toBe("admin@example.com");
  });
});
