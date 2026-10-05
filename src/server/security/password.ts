import "server-only";
import { createHash } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { env } from "@/server/env";
import { logger } from "@/server/logger";

/**
 * OWASP-recommended Argon2id parameters (19 MiB, 2 iterations, 1 lane).
 * `algorithm: 2` is Argon2id (the package exposes it as a const enum, unusable with isolatedModules).
 */
const ARGON2_OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword({
  hash: digest,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  try {
    return await verify(digest, password);
  } catch {
    return false; // malformed hash → treat as mismatch
  }
}

/** Frequently breached passwords (lower-cased). Not exhaustive — enable PWNED_PASSWORDS_CHECK for that. */
const COMMON = new Set(
  `123456 123456789 12345678 1234567890 password password1 password123 qwerty qwerty123 qwertyuiop 111111 000000 123123
  1234567 12345 abc123 iloveyou admin admin123 welcome welcome1 letmein monkey dragon football baseball master sunshine
  princess 1q2w3e4r 1q2w3e4r5t zaq12wsx asdfghjkl asdf1234 passw0rd p@ssw0rd p@ssword 987654321 11111111 123qwe 1qaz2wsx
  aa123456 a123456 a12345678 superman batman trustno1 starwars freedom whatever shadow michael jennifer hunter killer
  654321 666666 777777 888888 999999 121212 112233 123321 159753 147258369 123456a 123456789a q1w2e3r4 q1w2e3r4t5
  computer internet samsung iphone apple google facebook instagram secret changeme default test123 testtest
  1234qwer qwer1234 1qazxsw2 zxcvbnm zxcvbnm123 asdasd asdasd123 qweasd qweasdzxc 0123456789 9876543210 iraq123
  baghdad saudi123 allah123 mohammed muhammad ahmed123 ali123 yaman123`.split(/\s+/),
);

export type PasswordProblem =
  "too_short" | "too_long" | "too_common" | "contains_email" | "repetitive";

/** Policy checks beyond length (the error code maps to a translated message). */
export function checkPasswordPolicy(
  password: string,
  ctx: { email?: string; name?: string } = {},
): PasswordProblem | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "too_short";
  if (password.length > PASSWORD_MAX_LENGTH) return "too_long";
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "too_common";
  if (/^(.)\1+$/.test(password) || /^(?:0123456789|1234567890|abcdefghij)/i.test(password))
    return "repetitive";
  const local = ctx.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "contains_email";
  return null;
}

/**
 * Have I Been Pwned range check with k-anonymity: only the first 5 hex chars of the SHA-1 leave
 * the server. Fails open (returns false) on network errors so sign-up never hard-depends on it.
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  if (!env().PWNED_PASSWORDS_CHECK) return false;
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "iris-store" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch (err) {
    logger.warn({ err }, "pwned password check unavailable");
    return false;
  }
}
