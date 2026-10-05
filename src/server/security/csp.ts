/**
 * Content-Security-Policy builder (used by `src/proxy.ts`).
 * Reads process.env directly so the proxy never depends on the full env validation.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildCsp(nonce: string, opts: { isDev: boolean }): string {
  const mediaOrigin = originOf(process.env.S3_PUBLIC_URL);
  const turnstile = process.env.TURNSTILE_SITE_KEY ? "https://challenges.cloudflare.com" : null;
  const extra = (list: (string | null)[]) => list.filter(Boolean).join(" ");

  const directives: Record<string, string> = {
    "default-src": "'self'",
    // 'strict-dynamic' lets nonced scripts load their own dependencies; host lists are ignored by
    // CSP3 browsers. 'unsafe-eval' is only needed by React's dev tooling.
    "script-src": `'self' 'nonce-${nonce}' 'strict-dynamic'${opts.isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (next/image, Radix positioning) require 'unsafe-inline' for styles.
    // A nonce is deliberately NOT listed here because it would disable 'unsafe-inline'.
    "style-src": "'self' 'unsafe-inline'",
    "img-src": `'self' blob: data: ${extra([mediaOrigin])}`.trim(),
    "media-src": `'self' ${extra([mediaOrigin])}`.trim(),
    "font-src": "'self' data:",
    "connect-src": `'self' ${extra([turnstile])}`.trim(),
    "frame-src": `'self' ${extra([turnstile])}`.trim(),
    "worker-src": "'self' blob:",
    "manifest-src": "'self'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
    "report-uri": "/api/csp-report",
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v}`);
  if (!opts.isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
