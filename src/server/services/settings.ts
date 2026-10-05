import "server-only";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_COUNTRY, countryPreset } from "@/lib/countries";
import { hexColor, linkHref, localizedText } from "@/lib/validation";
import { CacheTags, cached, invalidate } from "@/server/cache";
import { db, type DbExecutor } from "@/server/db/client";
import { settings } from "@/server/db/schema";
import { logger } from "@/server/logger";
import { audit } from "./audit";

const iq = countryPreset(DEFAULT_COUNTRY)!;
const lt = (max?: number) => localizedText(max).prefault({});

/**
 * Each settings section is one JSON row. Every field has a default, so new fields can be added
 * later without migrations (`prefault` makes zod apply inner defaults to missing objects).
 */
export const settingsSchemas = {
  general: z.object({
    storeName: lt(80).prefault({ ar: "متجر Iris", en: "Iris Store" }),
    tagline: lt(160),
    logoMediaId: z.uuid().nullable().default(null),
    country: z.string().length(2).default(iq.code),
    currency: z.string().length(3).default(iq.currency),
    currencyDecimals: z.number().int().min(0).max(3).default(iq.currencyDecimals),
    phoneCode: z.string().max(5).default(iq.phoneCode),
    timeZone: z.string().max(64).default(iq.timeZone),
    contact: z
      .object({
        phone: z.string().trim().max(30).default(""),
        whatsapp: z.string().trim().max(30).default(""),
        email: z.union([z.literal(""), z.email()]).default(""),
        address: lt(300),
        workingHours: lt(160),
      })
      .prefault({}),
    social: z
      .object({
        instagram: z.string().trim().max(200).default(""),
        facebook: z.string().trim().max(200).default(""),
        tiktok: z.string().trim().max(200).default(""),
        x: z.string().trim().max(200).default(""),
        snapchat: z.string().trim().max(200).default(""),
        telegram: z.string().trim().max(200).default(""),
        youtube: z.string().trim().max(200).default(""),
      })
      .prefault({}),
    setupCompletedAt: z.string().nullable().default(null),
  }),
  branding: z.object({
    primaryColor: hexColor.default("#6b3fd4"),
    radius: z.enum(["sharp", "soft", "round"]).default("soft"),
    announcement: z
      .object({
        enabled: z.boolean().default(false),
        text: lt(160),
        link: z.union([z.literal(""), linkHref]).default(""),
      })
      .prefault({}),
  }),
  checkout: z.object({
    guestCheckout: z.boolean().default(true),
    requireEmail: z.boolean().default(false),
    allowOrderNotes: z.boolean().default(true),
    minOrderAmount: z.number().int().min(0).default(0),
    freeShippingThreshold: z.number().int().min(0).nullable().default(null),
    cod: z.object({ enabled: z.boolean().default(true), note: lt(300) }).prefault({}),
    bankTransfer: z
      .object({ enabled: z.boolean().default(false), instructions: lt(1000) })
      .prefault({}),
    tax: z
      .object({
        enabled: z.boolean().default(false),
        /** basis points: 1500 = 15% */
        rateBps: z.number().int().min(0).max(10_000).default(0),
        pricesIncludeTax: z.boolean().default(true),
      })
      .prefault({}),
  }),
  notifications: z.object({
    adminEmails: z.array(z.email()).max(5).default([]),
    notifyNewOrder: z.boolean().default(true),
    notifyLowStock: z.boolean().default(true),
    lowStockThreshold: z.number().int().min(0).max(1000).default(3),
    customerStatusEmails: z.boolean().default(true),
  }),
  seo: z.object({
    title: lt(70),
    description: lt(170),
    ogImageMediaId: z.uuid().nullable().default(null),
  }),
};

export type SettingsKey = keyof typeof settingsSchemas;
export type SettingsMap = { [K in SettingsKey]: z.infer<(typeof settingsSchemas)[K]> };
export const SETTINGS_KEYS = Object.keys(settingsSchemas) as SettingsKey[];

function parseSection<K extends SettingsKey>(key: K, raw: unknown): SettingsMap[K] {
  const parsed = settingsSchemas[key].safeParse(raw ?? {});
  if (parsed.success) return parsed.data as SettingsMap[K];
  // A corrupted/legacy value must never take the store down: fall back to defaults.
  logger.error(
    { key, issues: parsed.error.issues.slice(0, 5) },
    "invalid stored settings, using defaults",
  );
  return settingsSchemas[key].parse({}) as SettingsMap[K];
}

async function loadAllSettings(): Promise<SettingsMap> {
  const rows = await db.select().from(settings).where(inArray(settings.key, SETTINGS_KEYS));
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    SETTINGS_KEYS.map((k) => [k, parseSection(k, byKey.get(k))]),
  ) as SettingsMap;
}

/** All settings sections (cached; invalidated on every update). */
export const getSettings = cached(loadAllSettings, ["settings:all"], [CacheTags.settings]);

export async function getSetting<K extends SettingsKey>(key: K): Promise<SettingsMap[K]> {
  return (await getSettings())[key];
}

/**
 * Merge `patch` into a section, validate, persist and audit. Throws ZodError on invalid input.
 */
export async function updateSetting<K extends SettingsKey>(
  key: K,
  patch: Partial<SettingsMap[K]>,
  actor: { id: string; label?: string } | null,
  executor: DbExecutor = db,
): Promise<SettingsMap[K]> {
  const current = (await loadAllSettings())[key];
  const next = settingsSchemas[key].parse({ ...current, ...patch }) as SettingsMap[K];
  await executor
    .insert(settings)
    .values({ key, value: next, updatedBy: actor?.id ?? null })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: next, updatedBy: actor?.id ?? null },
    });
  await audit(
    {
      action: "settings.update",
      actorId: actor?.id,
      actorLabel: actor?.label,
      entityType: "settings",
      entityId: key,
      metadata: { fields: Object.keys(patch) },
    },
    executor,
  );
  invalidate(CacheTags.settings);
  return next;
}

/** Create any missing sections with their defaults (used by setup and seeding). */
export async function ensureDefaultSettings(
  overrides: Partial<{ [K in SettingsKey]: Partial<SettingsMap[K]> }> = {},
) {
  for (const key of SETTINGS_KEYS) {
    const value = settingsSchemas[key].parse(overrides[key] ?? {});
    await db.insert(settings).values({ key, value }).onConflictDoNothing({ target: settings.key });
  }
  invalidate(CacheTags.settings);
}
