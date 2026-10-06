import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { isValidSlug, slugify } from "@/lib/slug";
import { linkHref, localizedText, requiredLocalizedText } from "@/lib/validation";
import { CacheTags, cached, invalidate } from "@/server/cache";
import { db } from "@/server/db/client";
import { HOME_SECTION_TYPES, homeSections, pages, type HomeSectionType } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { sanitizeRichText } from "@/server/security/sanitize";
import type { Actor } from "./catalog-admin";
import { audit } from "./audit";

const lt = (max?: number) => localizedText(max).prefault({});
const optionalLink = z.union([z.literal(""), linkHref]).default("");

export const FEATURE_ICONS = [
  "truck",
  "banknote",
  "refresh",
  "shield",
  "gift",
  "headset",
  "clock",
  "star",
] as const;

/** Config schema per home section type. Unknown keys are stripped. */
export const homeSectionConfigSchemas = {
  hero: z.object({
    slides: z
      .array(
        z.object({
          imageId: z.uuid().nullable().default(null),
          title: lt(80),
          subtitle: lt(160),
          ctaLabel: lt(30),
          ctaHref: optionalLink,
        }),
      )
      .min(1)
      .max(6),
    autoplay: z.boolean().default(true),
  }),
  categories: z.object({
    /** Empty = all active top-level categories, in their sort order. */
    categoryIds: z.array(z.uuid()).max(24).default([]),
    style: z.enum(["circles", "cards"]).default("circles"),
  }),
  products: z.object({
    source: z
      .enum(["newest", "featured", "best_sellers", "on_sale", "category", "manual"])
      .default("newest"),
    categoryId: z.uuid().nullable().default(null),
    productIds: z.array(z.uuid()).max(24).default([]),
    limit: z.number().int().min(2).max(24).default(8),
    layout: z.enum(["carousel", "grid"]).default("carousel"),
  }),
  banner: z.object({
    imageId: z.uuid().nullable().default(null),
    title: lt(80),
    subtitle: lt(160),
    ctaLabel: lt(30),
    ctaHref: optionalLink,
    tone: z.enum(["light", "dark"]).default("dark"),
  }),
  features: z.object({
    items: z
      .array(z.object({ icon: z.enum(FEATURE_ICONS), title: lt(60), text: lt(140) }))
      .min(1)
      .max(6),
  }),
  text: z.object({
    body: lt(2000),
    align: z.enum(["start", "center"]).default("center"),
  }),
} satisfies Record<HomeSectionType, z.ZodType>;

export type HomeSectionConfig<T extends HomeSectionType> = z.infer<
  (typeof homeSectionConfigSchemas)[T]
>;

export const homeSectionInputSchema = z.object({
  type: z.enum(HOME_SECTION_TYPES),
  title: localizedText(80).optional(),
  config: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
});
export type HomeSectionInput = z.input<typeof homeSectionInputSchema>;

export type HomeSectionDTO = {
  [T in HomeSectionType]: {
    id: string;
    type: T;
    title: { ar?: string; en?: string } | null;
    config: HomeSectionConfig<T>;
    position: number;
    isActive: boolean;
  };
}[HomeSectionType];

function parseConfig(type: HomeSectionType, config: unknown) {
  return homeSectionConfigSchemas[type].parse(config);
}

async function loadHomeSections(activeOnly: boolean): Promise<HomeSectionDTO[]> {
  const rows = await db
    .select()
    .from(homeSections)
    .where(activeOnly ? eq(homeSections.isActive, true) : undefined)
    .orderBy(asc(homeSections.position));
  const result: HomeSectionDTO[] = [];
  for (const row of rows) {
    const parsed = homeSectionConfigSchemas[row.type].safeParse(row.config);
    if (!parsed.success) continue; // a broken section must not break the home page
    result.push({
      id: row.id,
      type: row.type,
      title: row.title ?? null,
      config: parsed.data,
      position: row.position,
      isActive: row.isActive,
    } as HomeSectionDTO);
  }
  return result;
}

export const getActiveHomeSections = cached(
  () => loadHomeSections(true),
  ["home:active"],
  [CacheTags.content],
);
export const getAllHomeSections = () => loadHomeSections(false);

export async function saveHomeSection(
  rawInput: HomeSectionInput,
  actor: Actor | null,
  sectionId?: string,
) {
  const input = homeSectionInputSchema.parse(rawInput);
  const config = parseConfig(input.type, input.config);
  const result = await db.transaction(async (tx) => {
    let row;
    if (sectionId) {
      [row] = await tx
        .update(homeSections)
        .set({ title: input.title ?? null, config, isActive: input.isActive })
        .where(eq(homeSections.id, sectionId))
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "section not found");
    } else {
      const existing = await tx.select({ position: homeSections.position }).from(homeSections);
      const position = existing.reduce((max, r) => Math.max(max, r.position), -1) + 1;
      [row] = await tx
        .insert(homeSections)
        .values({
          type: input.type,
          title: input.title ?? null,
          config,
          isActive: input.isActive,
          position,
        })
        .returning();
    }
    await audit(
      {
        action: sectionId ? "home_section.update" : "home_section.create",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "home_section",
        entityId: row!.id,
        metadata: { type: input.type },
      },
      tx,
    );
    return row!;
  });
  invalidate(CacheTags.content);
  return result;
}

/** Persist a new order of sections (ids in display order; must contain every section exactly once). */
export async function reorderHomeSections(orderedIds: string[], actor: Actor | null) {
  await db.transaction(async (tx) => {
    const all = await tx.select({ id: homeSections.id }).from(homeSections);
    const known = new Set(all.map((r) => r.id));
    if (
      orderedIds.length !== known.size ||
      !orderedIds.every((id) => known.has(id)) ||
      new Set(orderedIds).size !== orderedIds.length
    ) {
      throw new AppError("VALIDATION", "order must list every section once");
    }
    for (const [position, id] of orderedIds.entries()) {
      await tx.update(homeSections).set({ position }).where(eq(homeSections.id, id));
    }
    await audit(
      {
        action: "home_section.reorder",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "home_section",
      },
      tx,
    );
  });
  invalidate(CacheTags.content);
}

export async function deleteHomeSection(sectionId: string, actor: Actor | null) {
  await db.transaction(async (tx) => {
    const [row] = await tx.delete(homeSections).where(eq(homeSections.id, sectionId)).returning();
    if (!row) throw new AppError("NOT_FOUND", "section not found");
    await audit(
      {
        action: "home_section.delete",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "home_section",
        entityId: sectionId,
        metadata: { type: row.type },
      },
      tx,
    );
  });
  invalidate(CacheTags.content);
}

// ── Static pages ─────────────────────────────────────────────────────────────

export const pageInputSchema = z.object({
  title: requiredLocalizedText(120),
  slug: z.string().trim().max(80).optional(),
  content: localizedText(50_000),
  isPublished: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  seo: z
    .object({ title: localizedText(70).optional(), description: localizedText(170).optional() })
    .optional(),
});
export type PageInput = z.input<typeof pageInputSchema>;

export async function savePage(
  rawInput: PageInput,
  actor: Actor | null,
  pageId?: string,
  systemKey?: (typeof pages.$inferInsert)["systemKey"],
) {
  const input = pageInputSchema.parse(rawInput);
  const slug =
    input.slug || slugify(input.title.en || input.title.ar || "") || `page-${Date.now()}`;
  if (!isValidSlug(slug)) throw new AppError("VALIDATION", "invalid slug", { field: "slug" });
  const content = {
    ...(input.content.ar?.trim() ? { ar: sanitizeRichText(input.content.ar) } : {}),
    ...(input.content.en?.trim() ? { en: sanitizeRichText(input.content.en) } : {}),
  };
  const values = {
    slug,
    title: input.title,
    content,
    isPublished: input.isPublished,
    showInFooter: input.showInFooter,
    sortOrder: input.sortOrder,
    seo: input.seo ?? null,
  };
  const row = await db.transaction(async (tx) => {
    const clash = await tx.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug));
    if (clash.some((c) => c.id !== pageId))
      throw new AppError("CONFLICT", "slug taken", { field: "slug" });
    const [saved] = pageId
      ? await tx.update(pages).set(values).where(eq(pages.id, pageId)).returning()
      : await tx
          .insert(pages)
          .values({ ...values, systemKey: systemKey ?? null })
          .returning();
    if (!saved) throw new AppError("NOT_FOUND", "page not found");
    await audit(
      {
        action: pageId ? "page.update" : "page.create",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "page",
        entityId: saved.id,
        metadata: { slug },
      },
      tx,
    );
    return saved;
  });
  invalidate(CacheTags.content);
  return row;
}

/** System pages (privacy, terms…) can be unpublished but never deleted. */
export async function deletePage(pageId: string, actor: Actor | null) {
  await db.transaction(async (tx) => {
    const [page] = await tx.select().from(pages).where(eq(pages.id, pageId));
    if (!page) throw new AppError("NOT_FOUND", "page not found");
    if (page.systemKey) throw new AppError("FORBIDDEN", "system pages cannot be deleted");
    await tx.delete(pages).where(eq(pages.id, pageId));
    await audit(
      {
        action: "page.delete",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "page",
        entityId: pageId,
        metadata: { slug: page.slug },
      },
      tx,
    );
  });
  invalidate(CacheTags.content);
}

export async function pagesBySystemKey(keys: string[]) {
  if (!keys.length) return [];
  return db
    .select()
    .from(pages)
    .where(inArray(pages.systemKey, keys as never[]));
}

async function loadFooterPages() {
  return db
    .select({ slug: pages.slug, title: pages.title, systemKey: pages.systemKey })
    .from(pages)
    .where(and(eq(pages.isPublished, true), eq(pages.showInFooter, true)))
    .orderBy(asc(pages.sortOrder));
}

export const getFooterPages = cached(
  loadFooterPages,
  ["content:footer-pages"],
  [CacheTags.content],
);

async function loadPage(slug: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.isPublished, true)))
    .limit(1);
  return page
    ? { ...page, createdAt: page.createdAt.toISOString(), updatedAt: page.updatedAt.toISOString() }
    : null;
}

export const getPublishedPage = cached(loadPage, ["content:page"], [CacheTags.content]);

// ── Dashboard helpers ────────────────────────────────────────────────────────

export async function getHomeSection(sectionId: string): Promise<HomeSectionDTO | null> {
  return (await loadHomeSections(false)).find((s) => s.id === sectionId) ?? null;
}

export async function setHomeSectionActive(
  sectionId: string,
  isActive: boolean,
  actor: Actor | null,
) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(homeSections)
      .set({ isActive })
      .where(eq(homeSections.id, sectionId))
      .returning({ type: homeSections.type });
    if (!row) throw new AppError("NOT_FOUND", "section not found");
    await audit(
      {
        action: isActive ? "home_section.show" : "home_section.hide",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "home_section",
        entityId: sectionId,
        metadata: { type: row.type },
      },
      tx,
    );
  });
  invalidate(CacheTags.content);
}

/** Swap a section with its neighbour (up = earlier on the page). */
export async function moveHomeSection(
  sectionId: string,
  direction: "up" | "down",
  actor: Actor | null,
) {
  const ids = (
    await db.select({ id: homeSections.id }).from(homeSections).orderBy(asc(homeSections.position))
  ).map((r) => r.id);
  const index = ids.indexOf(sectionId);
  if (index < 0) throw new AppError("NOT_FOUND", "section not found");
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= ids.length) return;
  [ids[index], ids[swap]] = [ids[swap]!, ids[index]!];
  await reorderHomeSections(ids, actor);
}

export type AdminPageRow = {
  id: string;
  slug: string;
  title: { ar?: string; en?: string };
  systemKey: string | null;
  isPublished: boolean;
  showInFooter: boolean;
  updatedAt: string;
};

/** Every page (drafts included) in footer order. */
export async function listPagesAdmin(): Promise<AdminPageRow[]> {
  const rows = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      systemKey: pages.systemKey,
      isPublished: pages.isPublished,
      showInFooter: pages.showInFooter,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}

export async function getPageForEdit(pageId: string) {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  return page
    ? {
        id: page.id,
        slug: page.slug,
        systemKey: page.systemKey,
        title: page.title,
        content: page.content,
        isPublished: page.isPublished,
        showInFooter: page.showInFooter,
        sortOrder: page.sortOrder,
        seo: page.seo ?? null,
      }
    : null;
}
export type PageEditDTO = NonNullable<Awaited<ReturnType<typeof getPageForEdit>>>;

export async function nextPageSortOrder(): Promise<number> {
  const [row] = await db
    .select({ next: sql<number>`coalesce(max(${pages.sortOrder}), -1)::int + 1` })
    .from(pages);
  return row?.next ?? 0;
}

/** Swap a page with its neighbour in the footer order. */
export async function movePage(pageId: string, direction: "up" | "down", actor: Actor | null) {
  await db.transaction(async (tx) => {
    const all = await tx
      .select({ id: pages.id })
      .from(pages)
      .orderBy(asc(pages.sortOrder), asc(pages.createdAt))
      .for("update");
    const index = all.findIndex((p) => p.id === pageId);
    if (index < 0) throw new AppError("NOT_FOUND", "page not found");
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= all.length) return;
    [all[index], all[swap]] = [all[swap]!, all[index]!];
    for (const [position, p] of all.entries())
      await tx.update(pages).set({ sortOrder: position }).where(eq(pages.id, p.id));
    await audit(
      {
        action: "page.reorder",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "page",
        entityId: pageId,
        metadata: { direction },
      },
      tx,
    );
  });
  invalidate(CacheTags.content);
}
