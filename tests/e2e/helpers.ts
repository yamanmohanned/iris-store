import { createHmac } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

export const MAIL_DIR = path.resolve(".data/mail-e2e");
export const SETUP_TOKEN = "e2e-setup-token-0123456789abcdef";
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
