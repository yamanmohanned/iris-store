import "server-only";
import { db, type DbExecutor } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";
import { logger } from "@/server/logger";

export type AuditEntry = {
  action: string;
  actorId?: string | null;
  actorLabel?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Append an audit record. Pass the transaction when the audited change happens in one, so the log
 * and the change commit (or roll back) together. Metadata must not contain secrets.
 */
export async function audit(entry: AuditEntry, executor: DbExecutor = db) {
  await executor.insert(auditLogs).values({
    action: entry.action,
    actorId: entry.actorId ?? null,
    actorLabel: entry.actorLabel ?? null,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent?.slice(0, 400) ?? null,
  });
}

/** Fire-and-forget variant for security events that must never break the user flow. */
export function auditSafe(entry: AuditEntry) {
  audit(entry).catch((err) => logger.error({ err, action: entry.action }, "audit write failed"));
}
