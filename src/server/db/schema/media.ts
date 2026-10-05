import { index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, localized } from "./_shared";
import { users } from "./auth";

export type MediaVariant = { width: number; height: number; key: string; bytes: number };

/** Uploaded images. Files are re-encoded (WebP) into several widths; `variants` lists them. */
export const media = pgTable(
  "media",
  {
    id: uuid().primaryKey().defaultRandom(),
    storageDriver: text().$type<"local" | "s3">().notNull(),
    /** Base key (random), variants are stored as `${key}-${width}.webp`. */
    key: text().notNull().unique(),
    mimeType: text().notNull(),
    originalName: text(),
    width: integer().notNull(),
    height: integer().notNull(),
    bytes: integer().notNull(),
    variants: jsonb().$type<MediaVariant[]>().notNull().default([]),
    blurDataUrl: text(),
    alt: localized(),
    createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("media_created_idx").on(t.createdAt)],
);
