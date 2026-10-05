import type { MetadataRoute } from "next";
import { tl } from "@/lib/localized";
import { getSettings } from "@/server/services/settings";

// Built per request: depends on runtime settings/data (never baked in at build time).
export const dynamic = "force-dynamic";

/** Installable web app (PWA): "Add to home screen" opens the store full-screen like an app. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  const name = tl(s.general.storeName, "ar") || "Store";
  return {
    name,
    short_name: name.slice(0, 12),
    description: tl(s.seo.description, "ar") || tl(s.general.tagline, "ar") || undefined,
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfafd",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
