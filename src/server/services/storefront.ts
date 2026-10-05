import "server-only";
import { inArray } from "drizzle-orm";
import type { LocalizedText } from "@/lib/localized";
import { db } from "@/server/db/client";
import { media } from "@/server/db/schema";
import {
  getActiveCategories,
  listProducts,
  type CategoryDTO,
  type ProductCardDTO,
} from "./catalog";
import { getActiveHomeSections, type HomeSectionDTO } from "./content";
import { toImageDTO, type ImageDTO } from "./media";

export type HomeBlock =
  | {
      id: string;
      type: "hero";
      autoplay: boolean;
      slides: {
        image: ImageDTO | null;
        title: LocalizedText;
        subtitle: LocalizedText;
        ctaLabel: LocalizedText;
        ctaHref: string;
      }[];
    }
  | {
      id: string;
      type: "categories";
      title: LocalizedText | null;
      style: "circles" | "cards";
      categories: CategoryDTO[];
    }
  | {
      id: string;
      type: "products";
      title: LocalizedText | null;
      layout: "carousel" | "grid";
      viewAllHref: string | null;
      products: ProductCardDTO[];
    }
  | {
      id: string;
      type: "banner";
      image: ImageDTO | null;
      title: LocalizedText;
      subtitle: LocalizedText;
      ctaLabel: LocalizedText;
      ctaHref: string;
      tone: "light" | "dark";
    }
  | {
      id: string;
      type: "features";
      items: { icon: string; title: LocalizedText; text: LocalizedText }[];
    }
  | {
      id: string;
      type: "text";
      title: LocalizedText | null;
      body: LocalizedText;
      align: "start" | "center";
    };

export async function imagesByIds(ids: string[]): Promise<Map<string, ImageDTO>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const rows = await db.select().from(media).where(inArray(media.id, unique));
  return new Map(rows.map((m) => [m.id, toImageDTO(m)]));
}

const SOURCE_LINKS: Record<string, string> = {
  newest: "/search?sort=newest",
  best_sellers: "/search?sort=best_selling",
  on_sale: "/search?sale=1&sort=discount",
  featured: "/search?featured=1",
};

async function productsFor(section: Extract<HomeSectionDTO, { type: "products" }>) {
  const c = section.config;
  const base = { pageSize: c.limit, inStock: true };
  switch (c.source) {
    case "featured":
      return (await listProducts({ ...base, featured: true })).items;
    case "best_sellers":
      return (await listProducts({ ...base, sort: "best_selling" })).items;
    case "on_sale":
      return (await listProducts({ ...base, onSale: true, sort: "discount" })).items;
    case "category":
      return c.categoryId ? (await listProducts({ ...base, categoryId: c.categoryId })).items : [];
    case "manual":
      return (await listProducts({ ids: c.productIds, pageSize: c.productIds.length || 1 })).items;
    default:
      return (await listProducts({ ...base, sort: "newest" })).items;
  }
}

/** Resolve the owner's home page layout into render-ready blocks (empty blocks are dropped). */
export async function getHomeBlocks(): Promise<HomeBlock[]> {
  const sections = await getActiveHomeSections();
  const imageIds = sections.flatMap((s) =>
    s.type === "hero"
      ? s.config.slides.map((sl) => sl.imageId ?? "")
      : s.type === "banner"
        ? [s.config.imageId ?? ""]
        : [],
  );
  const [images, categories] = await Promise.all([imagesByIds(imageIds), getActiveCategories()]);

  const blocks = await Promise.all(
    sections.map(async (s): Promise<HomeBlock | null> => {
      switch (s.type) {
        case "hero":
          return {
            id: s.id,
            type: "hero",
            autoplay: s.config.autoplay,
            slides: s.config.slides.map((sl) => ({
              image: sl.imageId ? (images.get(sl.imageId) ?? null) : null,
              title: sl.title,
              subtitle: sl.subtitle,
              ctaLabel: sl.ctaLabel,
              ctaHref: sl.ctaHref,
            })),
          };
        case "categories": {
          const chosen = s.config.categoryIds.length
            ? s.config.categoryIds
                .map((id) => categories.find((c) => c.id === id))
                .filter((c): c is CategoryDTO => Boolean(c))
            : categories.filter((c) => !c.parentId);
          return chosen.length
            ? {
                id: s.id,
                type: "categories",
                title: s.title,
                style: s.config.style,
                categories: chosen,
              }
            : null;
        }
        case "products": {
          const list = await productsFor(s);
          if (!list.length) return null;
          const viewAllHref =
            s.config.source === "category" && s.config.categoryId
              ? `/c/${categories.find((c) => c.id === s.config.categoryId)?.slug ?? ""}`
              : (SOURCE_LINKS[s.config.source] ?? null);
          return {
            id: s.id,
            type: "products",
            title: s.title,
            layout: s.config.layout,
            viewAllHref,
            products: list,
          };
        }
        case "banner":
          return {
            id: s.id,
            type: "banner",
            image: s.config.imageId ? (images.get(s.config.imageId) ?? null) : null,
            title: s.config.title,
            subtitle: s.config.subtitle,
            ctaLabel: s.config.ctaLabel,
            ctaHref: s.config.ctaHref,
            tone: s.config.tone,
          };
        case "features":
          return { id: s.id, type: "features", items: s.config.items };
        case "text":
          return {
            id: s.id,
            type: "text",
            title: s.title,
            body: s.config.body,
            align: s.config.align,
          };
        default:
          return null;
      }
    }),
  );
  return blocks.filter((b): b is HomeBlock => b !== null);
}
