import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, localized, updatedAt, type SeoFields } from "./_shared";
import { users } from "./auth";

/** Store settings, one JSON document per section (validated by zod in the settings service). */
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const PAGE_SYSTEM_KEYS = [
  "about",
  "privacy",
  "terms",
  "returns",
  "shipping",
  "contact",
] as const;
export type PageSystemKey = (typeof PAGE_SYSTEM_KEYS)[number];

/** Static pages (about, policies). `systemKey` lets code link to policy pages even if slugs change. */
export const pages = pgTable("pages", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  systemKey: text().$type<PageSystemKey>().unique(),
  title: localized().notNull(),
  /** Sanitized HTML per locale. */
  content: localized().notNull(),
  isPublished: boolean().notNull().default(true),
  showInFooter: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  seo: jsonb().$type<SeoFields>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const HOME_SECTION_TYPES = [
  "hero",
  "categories",
  "products",
  "banner",
  "features",
  "text",
] as const;
export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number];

/** Ordered, owner-editable blocks of the home page. `config` is validated per type. */
export const homeSections = pgTable(
  "home_sections",
  {
    id: uuid().primaryKey().defaultRandom(),
    type: text().$type<HomeSectionType>().notNull(),
    title: localized(),
    config: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    position: integer().notNull(),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "home_sections_type_valid",
      sql`${t.type} in ('hero','categories','products','banner','features','text')`,
    ),
  ],
);
