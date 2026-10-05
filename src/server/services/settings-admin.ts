import "server-only";
import { inArray } from "drizzle-orm";
import { hasText } from "@/lib/localized";
import { CacheTags, invalidate, invalidateAllPages } from "@/server/cache";
import { db } from "@/server/db/client";
import { media } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { audit } from "./audit";
import type { Actor } from "./catalog-admin";
import { updateSetting, type SettingsKey, type SettingsMap } from "./settings";

/** Sections the dashboard edits (everything except what the setup wizard fixes). */
export const EDITABLE_SECTIONS = [
  "general",
  "branding",
  "checkout",
  "notifications",
  "seo",
] as const satisfies readonly SettingsKey[];
export type EditableSection = (typeof EDITABLE_SECTIONS)[number];

/**
 * Chosen once in the setup wizard: prices are stored in the currency's minor units and phone
 * numbers are normalized with the country code, so changing these later would corrupt data.
 */
const LOCKED: Partial<Record<SettingsKey, readonly string[]>> = {
  general: ["country", "currency", "currencyDecimals", "phoneCode", "timeZone", "setupCompletedAt"],
};

export function isEditableSection(value: unknown): value is EditableSection {
  return typeof value === "string" && (EDITABLE_SECTIONS as readonly string[]).includes(value);
}

async function assertMediaExists(ids: (string | null | undefined)[], field: string) {
  const wanted = [...new Set(ids.filter((id): id is string => typeof id === "string" && !!id))];
  if (!wanted.length) return;
  const found = await db.select({ id: media.id }).from(media).where(inArray(media.id, wanted));
  if (found.length !== wanted.length) throw new AppError("VALIDATION", "unknown image", { field });
}

/**
 * Save one settings section from the dashboard. Locked keys are ignored, image references must
 * exist and a few cross-field rules apply; the section schema then validates everything
 * (ZodError on invalid input) and `updateSetting` persists, audits and refreshes caches.
 */
export async function saveSettingsSection<K extends EditableSection>(
  section: K,
  input: Record<string, unknown>,
  actor: Actor,
): Promise<SettingsMap[K]> {
  if (!isEditableSection(section)) throw new AppError("BAD_REQUEST", "unknown section");
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new AppError("BAD_REQUEST", "invalid input");
  const patch: Record<string, unknown> = { ...input };
  for (const key of LOCKED[section] ?? []) delete patch[key];

  if (section === "general") {
    if (!hasText(patch.storeName as never))
      throw new AppError("VALIDATION", "store name required", { field: "storeName" });
    await assertMediaExists([patch.logoMediaId as string], "logoMediaId");
  }
  if (section === "seo")
    await assertMediaExists([patch.ogImageMediaId as string], "ogImageMediaId");
  if (section === "checkout") {
    const cod = patch.cod as { enabled?: boolean } | undefined;
    const bank = patch.bankTransfer as { enabled?: boolean } | undefined;
    if (cod?.enabled === false && bank?.enabled === false)
      throw new AppError("VALIDATION", "no payment method", { field: "payments" });
  }

  const saved = await updateSetting(section, patch as Partial<SettingsMap[K]>, {
    id: actor.id,
    label: actor.label ?? undefined,
  });
  // Branding and names appear in every page's layout (colors, header, metadata).
  invalidateAllPages();
  return saved;
}

/** Drop every cached storefront query (settings, catalog, pages, delivery areas). */
export async function clearStoreCache(actor: Actor) {
  invalidate(CacheTags.settings, CacheTags.catalog, CacheTags.content, CacheTags.shipping);
  invalidateAllPages();
  await audit({
    action: "cache.clear",
    actorId: actor.id,
    actorLabel: actor.label,
    entityType: "settings",
  });
}
