import "server-only";
import { CacheTags, cached } from "@/server/cache";
import type { ImageDTO } from "./media";
import { getSettings } from "./settings";
import { imagesByIds } from "./storefront";

export type BrandAssets = { logo: ImageDTO | null; shareImage: ImageDTO | null };

async function loadBrandAssets(): Promise<BrandAssets> {
  const { general, seo } = await getSettings();
  const ids = [general.logoMediaId, seo.ogImageMediaId].filter((id): id is string => !!id);
  const images = ids.length ? await imagesByIds(ids) : new Map<string, ImageDTO>();
  return {
    logo: general.logoMediaId ? (images.get(general.logoMediaId) ?? null) : null,
    shareImage: seo.ogImageMediaId ? (images.get(seo.ogImageMediaId) ?? null) : null,
  };
}

/** Store logo and default share image (cached with the settings they come from). */
export const getBrandAssets = cached(loadBrandAssets, ["brand:assets"], [CacheTags.settings]);
