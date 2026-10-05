import "server-only";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";

export const turnstileEnabled = () => Boolean(env().TURNSTILE_SECRET_KEY);

/**
 * Verify a Cloudflare Turnstile token (bot protection). No-op when Turnstile isn't configured.
 * Throws BAD_REQUEST with `captcha: true` so the UI can ask the user to retry the challenge.
 */
export async function assertHuman(token: string | null | undefined, ip: string | null) {
  const secret = env().TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (!token) throw new AppError("BAD_REQUEST", "captcha missing", { captcha: true });
  try {
    const body = new URLSearchParams({ secret, response: token.slice(0, 2048) });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      logger.info({ codes: data["error-codes"] }, "turnstile rejected");
      throw new AppError("BAD_REQUEST", "captcha failed", { captcha: true });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Fail closed: if the verifier is unreachable we cannot tell humans from bots.
    logger.error({ err: error }, "turnstile verification error");
    throw new AppError("BAD_REQUEST", "captcha unavailable", { captcha: true });
  }
}
