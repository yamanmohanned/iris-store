import "server-only";
import { headers } from "next/headers";

/** The per-request CSP nonce set by the proxy (for third-party <Script> tags). */
export async function getNonce(): Promise<string | undefined> {
  return (await headers()).get("x-nonce") ?? undefined;
}
