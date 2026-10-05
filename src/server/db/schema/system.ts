import { sql } from "drizzle-orm";
import { bigint, check, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, tsNullable } from "./_shared";
import { users } from "./auth";

/** Append-only audit trail (a DB trigger rejects UPDATE/DELETE outside retention jobs). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    actorLabel: text(),
    action: text().notNull(),
    entityType: text(),
    entityId: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_actor_idx").on(t.actorId, t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_action_idx").on(t.action, t.createdAt),
  ],
);

/** Fixed-window counters for application rate limits (works across instances, no Redis needed). */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text().primaryKey(),
    count: integer().notNull(),
    resetAt: tsNullable().notNull(),
  },
  (t) => [index("rate_limit_buckets_reset_idx").on(t.resetAt)],
);

export const OUTBOX_CHANNELS = ["email", "sms", "whatsapp"] as const;
export type OutboxChannel = (typeof OUTBOX_CHANNELS)[number];
export const OUTBOX_STATUSES = ["pending", "sending", "sent", "failed"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

/**
 * Transactional outbox: notifications are written in the same transaction as the business change
 * and delivered afterwards with retries. Never store secrets (OTP codes) here.
 */
export const outboxMessages = pgTable(
  "outbox_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    channel: text().$type<OutboxChannel>().notNull(),
    recipient: text().notNull(),
    template: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    status: text().$type<OutboxStatus>().notNull().default("pending"),
    attempts: integer().notNull().default(0),
    lastError: text(),
    nextAttemptAt: tsNullable().notNull().defaultNow(),
    sentAt: tsNullable(),
    createdAt: createdAt(),
  },
  (t) => [
    index("outbox_messages_due_idx").on(t.status, t.nextAttemptAt),
    check("outbox_messages_channel_valid", sql`${t.channel} in ('email','sms','whatsapp')`),
    check(
      "outbox_messages_status_valid",
      sql`${t.status} in ('pending','sending','sent','failed')`,
    ),
  ],
);
