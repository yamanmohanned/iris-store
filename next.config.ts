import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

/**
 * Static security headers applied to every response.
 * The Content-Security-Policy for HTML pages is generated per request (nonce) in `src/proxy.ts`.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), interest-cohort=()",
  },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  // Docker builds set BUILD_STANDALONE=1 (self-contained server); `next start` uses the default.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  // Native modules must not be bundled.
  serverExternalPackages: ["@node-rs/argon2", "sharp", "pino", "pino-pretty"],
  experimental: {
    serverActions: {
      // Product forms send JSON (images go through the dedicated upload route).
      bodySizeLimit: "2mb",
      allowedOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // JSON / non-HTML endpoints never need to load anything.
        source: "/api/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
