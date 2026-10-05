import createIntlMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { buildCsp, generateNonce } from "@/server/security/csp";

const handleI18n = createIntlMiddleware(routing);
const isDev = process.env.NODE_ENV === "development";

/**
 * Network boundary: locale routing + per-request CSP nonce.
 * NOT an authorization layer — every page/action re-checks auth on the server.
 */
export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, { isDev });

  // Next.js reads the nonce from the request's CSP header while rendering and applies it to
  // framework scripts; next-intl forwards these request headers.
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const forwarded = new NextRequest(request.url, { headers, method: request.method });

  const response = handleI18n(forwarded);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Everything except API routes, Next internals, uploaded media and files with an extension.
  matcher: ["/((?!api|_next|_vercel|media|.*\\..*).*)"],
};
