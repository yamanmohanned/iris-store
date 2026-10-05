import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, tsNullable, updatedAt } from "./_shared";

export const USER_ROLES = [
  "customer",
  "order_manager",
  "catalog_manager",
  "admin",
  "owner",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Better Auth core tables (user/session/account/verification) + two-factor plugin + DB rate limiter.
 * Field names follow Better Auth's model; columns are snake_case via Drizzle `casing`.
 */
export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    phone: text(),
    phoneVerified: boolean().notNull().default(false),
    role: text().$type<UserRole>().notNull().default("customer"),
    banned: boolean().notNull().default(false),
    banReason: text(),
    locale: text(),
    marketingOptIn: boolean().notNull().default(false),
    twoFactorEnabled: boolean().default(false),
    lastLoginAt: tsNullable(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_phone_idx").on(t.phone),
    index("users_role_idx").on(t.role),
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check(
      "users_role_valid",
      sql`${t.role} in ('customer','order_manager','catalog_manager','admin','owner')`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    expiresAt: tsNullable().notNull(),
    token: text().notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("sessions_token_unique").on(t.token),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: tsNullable(),
    refreshTokenExpiresAt: tsNullable(),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    uniqueIndex("accounts_provider_account_unique").on(t.providerId, t.accountId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: tsNullable().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

export const twoFactors = pgTable(
  "two_factors",
  {
    id: uuid().primaryKey().defaultRandom(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verified: boolean().default(true),
    failedVerificationCount: integer().default(0),
    lockedUntil: tsNullable(),
  },
  (t) => [index("two_factors_user_idx").on(t.userId), index("two_factors_secret_idx").on(t.secret)],
);

/** Better Auth's rate limiter storage (rateLimit.storage = "database"). */
export const authRateLimits = pgTable("auth_rate_limits", {
  id: uuid().primaryKey().defaultRandom(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});
