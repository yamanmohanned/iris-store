import "server-only";
import { env } from "@/server/env";

export function googleSignInEnabled(): boolean {
  const e = env();
  return Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
}

export function turnstileSiteKey(): string | null {
  return env().TURNSTILE_SITE_KEY ?? null;
}
