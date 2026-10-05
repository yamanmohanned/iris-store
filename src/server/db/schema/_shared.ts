import { bigint, jsonb, timestamp } from "drizzle-orm/pg-core";

/** Text stored per locale, e.g. { ar: "فستان", en: "Dress" }. The default locale is required by the app. */
export type LocalizedText = { ar?: string; en?: string };

export type SeoFields = { title?: LocalizedText; description?: LocalizedText };

export const localized = () => jsonb().$type<LocalizedText>();

/** Money in the store currency's minor units (e.g. fils / halalas). JS number is exact up to 2^53. */
export const money = () => bigint({ mode: "number" });

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const tsNullable = () => timestamp({ withTimezone: true });
