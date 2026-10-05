import type { MetadataRoute } from "next";

// Built per request: depends on runtime settings/data (never baked in at build time).
export const dynamic = "force-dynamic";

const PRIVATE = [
  "/admin",
  "/account",
  "/cart",
  "/checkout",
  "/order",
  "/track",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/two-factor",
  "/setup",
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...PRIVATE, ...PRIVATE.map((p) => `/en${p}`)] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
