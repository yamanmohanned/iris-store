import type { MetadataRoute } from "next";
import { allProductSlugs, getActiveCategories } from "@/server/services/catalog";
import { getFooterPages } from "@/server/services/content";

// Built per request: depends on runtime settings/data (never baked in at build time).
export const dynamic = "force-dynamic";

/** Every public URL in both languages, with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const entry = (
    path: string,
    lastModified?: Date,
    priority = 0.6,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path || "/"}`,
    lastModified,
    priority,
    alternates: { languages: { ar: `${base}${path || "/"}`, en: `${base}/en${path}` } },
  });
  const [products, categories, pages] = await Promise.all([
    allProductSlugs(),
    getActiveCategories(),
    getFooterPages(),
  ]);
  return [
    entry("", undefined, 1),
    entry("/categories", undefined, 0.7),
    entry("/search", undefined, 0.5),
    entry("/contact", undefined, 0.4),
    ...categories.map((c) => entry(`/c/${encodeURIComponent(c.slug)}`, undefined, 0.8)),
    ...products.map((p) => entry(`/p/${encodeURIComponent(p.slug)}`, p.updatedAt, 0.9)),
    ...pages.map((p) => entry(`/pages/${encodeURIComponent(p.slug)}`, undefined, 0.3)),
  ];
}
