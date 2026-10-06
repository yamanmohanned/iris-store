import { expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

export const MAIL_DIR = path.resolve(".data/mail-e2e");
export const SETUP_TOKEN = "e2e-setup-token-0123456789abcdef";
export const CRON_SECRET = "e2e-cron-secret-0123456789abcdef";
export const PASSWORD = "Calm-River-Stone-2026";

export async function clearMail() {
  await rm(MAIL_DIR, { recursive: true, force: true });
}

/** Wait for an email captured by the console driver (MAIL_CAPTURE_DIR) and return its OTP. */
export async function waitForCode(to: string, timeoutMs = 10_000): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const files = (await readdir(MAIL_DIR))
        .filter((f) => f.includes(to.replace(/[^a-z0-9@._-]/gi, "_")))
        .sort();
      const last = files.at(-1);
      if (last) {
        const message = JSON.parse(await readFile(path.join(MAIL_DIR, last), "utf8")) as {
          text: string;
        };
        const code = message.text.match(/\b(\d{6})\b/)?.[1];
        if (code) return code;
      }
    } catch {
      // directory not created yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`No code emailed to ${to}`);
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** RFC 6238 TOTP for driving two-step verification. */
export function totp(base32Secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of base32Secret.replace(/=+$/, "").toUpperCase()) {
    const v = alphabet.indexOf(ch);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

export type CapturedMail = { to: string; subject: string; html: string; text: string };

/** Wait for an email captured by the console driver whose subject matches. */
export async function waitForMail(
  to: string,
  subject: RegExp,
  timeoutMs = 10_000,
): Promise<CapturedMail> {
  const started = Date.now();
  const safe = to.replace(/[^a-z0-9@._-]/gi, "_");
  while (Date.now() - started < timeoutMs) {
    try {
      for (const file of (await readdir(MAIL_DIR))
        .filter((f) => f.includes(safe))
        .sort()
        .reverse()) {
        const mail = JSON.parse(await readFile(path.join(MAIL_DIR, file), "utf8")) as CapturedMail;
        if (subject.test(mail.subject)) return mail;
      }
    } catch {
      // directory not created yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`No email to ${to} matching ${subject}`);
}

/** Register through the real UI (emailed code) and land on /account signed in. */
let pool: pg.Pool | undefined;

/**
 * Every E2E request comes from 127.0.0.1, so the per-IP limits (10 sign-ups an hour…) would trip
 * as the suite grows. Flows that sign up or sign in start from empty counters instead; the limits
 * themselves are covered by integration tests.
 */
export async function resetRateLimits() {
  const url = process.env.DATABASE_URL_E2E ?? process.env.DATABASE_URL_TEST;
  if (!url || !/(e2e|test)/i.test(new URL(url).pathname)) return;
  pool ??= new pg.Pool({ connectionString: url, max: 1, allowExitOnIdle: true });
  await pool.query("delete from rate_limit_buckets");
}

export async function register(page: Page, email: string, name = "علي حسن") {
  await resetRateLimits();
  await page.goto("/register");
  await page.getByLabel("الاسم الكامل").fill(name);
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await expect(page).toHaveURL(/\/verify-email/);
  await page.getByLabel("رمز التحقق").fill(await waitForCode(email)); // auto-submits at 6 digits
  await expect(page).toHaveURL(/\/account$/);
}

/** Staff account created by global-setup (role: admin). */
export const STAFF_EMAIL = "e2e.staff@example.com";
export const STAFF_TOTP_FILE = path.resolve(".data/e2e-staff-totp.txt");

/**
 * Sign in as staff. The first time, the admin forces two-step setup: we enable it through the UI
 * and keep the secret for later sign-ins (which then answer the TOTP challenge).
 */
export async function signInAsStaff(page: Page) {
  await resetRateLimits();
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(STAFF_EMAIL);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await page.waitForURL(/\/(account|admin|two-factor)/);
  if (page.url().includes("two-factor")) {
    const secret = (await readFile(STAFF_TOTP_FILE, "utf8")).trim();
    await page.getByLabel("رمز التحقق").fill(totp(secret));
    await expect(page).toHaveURL(/\/admin/);
    return;
  }
  await page.goto("/admin");
  if (page.url().includes("setup2fa")) {
    await page.getByLabel("كلمة المرور الحالية").first().fill(PASSWORD);
    await page.getByRole("button", { name: "تفعيل التحقق بخطوتين" }).click();
    const secret = (await page.locator("code").first().textContent())!.trim();
    await writeFile(STAFF_TOTP_FILE, secret);
    await page.getByLabel("رمز التحقق").fill(totp(secret));
    await page.getByRole("button", { name: "تأكيد وتفعيل" }).click();
    await expect(page.getByText("تم تفعيل التحقق بخطوتين بنجاح.")).toBeVisible();
    await page.goto("/admin");
  }
  await expect(page).toHaveURL(/\/admin$/);
}

/** The owner created by the setup-wizard test (auth.spec) saves how to sign in here. */
export const OWNER_FILE = path.resolve(".data/e2e-owner.json");

/**
 * Sign in as the store owner. Returns false when no owner exists yet (the setup test runs earlier
 * in the same run; running a single spec on its own has no owner).
 */
export async function signInAsOwner(page: Page): Promise<boolean> {
  let owner: { email: string; secret: string };
  try {
    owner = JSON.parse(await readFile(OWNER_FILE, "utf8"));
  } catch {
    return false;
  }
  await resetRateLimits();
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(owner.email);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await expect(page).toHaveURL(/\/two-factor/);
  await page.getByLabel("رمز التحقق").fill(totp(owner.secret));
  await expect(page).toHaveURL(/\/admin/);
  return true;
}

/** Place a cash-on-delivery order as a guest (one wristwatch) and return its number. */
export async function placeGuestOrder(page: Page): Promise<string> {
  await resetRateLimits();
  await page.goto("/c/accessories");
  await page
    .getByRole("link", { name: /ساعة يد كلاسيكية/ })
    .first()
    .click();
  await page
    .locator("button")
    .filter({ hasText: "أضف إلى السلة" })
    .filter({ visible: true })
    .click();
  await expect(page.getByText("أُضيف إلى السلة").first()).toBeVisible();
  await page.goto("/checkout");
  await page.getByLabel("الاسم الكامل").fill("زبون الاختبار");
  await page.getByLabel("رقم الهاتف").fill(`0775${String(Date.now()).slice(-7)}`);
  await page.getByLabel("المحافظة").selectOption({ index: 1 });
  await page.getByLabel("المدينة / القضاء").fill("الأعظمية");
  await page
    .getByRole("button", { name: /تأكيد الطلب/ })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/order\//);
  return (await page
    .getByText(/^#\d+$/)
    .first()
    .textContent())!.slice(1);
}
