import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { escapeLike } from "@/lib/search";
import { db } from "@/server/db/client";
import { auditLogs, users } from "@/server/db/schema";

/** Filter groups for the log viewer, by action prefix. */
export const AUDIT_CATEGORIES = {
  orders: ["order."],
  catalog: ["product.", "category."],
  store: ["settings.", "cache.", "coupon.", "shipping_zone.", "home_section.", "page."],
  people: ["staff.", "customer.", "user.", "setup."],
  security: ["auth."],
} as const;
export type AuditCategory = keyof typeof AUDIT_CATEGORIES;
export const AUDIT_CATEGORY_KEYS = Object.keys(AUDIT_CATEGORIES) as AuditCategory[];

export type AuditRow = {
  id: number;
  action: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

/** Newest first; `q` matches the actor, the entity id or any detail (coupon code, email…). */
export async function listAuditLogs(filter: {
  category?: AuditCategory;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 50));
  const where: SQL[] = [];
  if (filter.category && filter.category in AUDIT_CATEGORIES)
    where.push(
      or(
        ...AUDIT_CATEGORIES[filter.category].map((prefix) =>
          ilike(auditLogs.action, `${escapeLike(prefix)}%`),
        ),
      )!,
    );
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    where.push(
      or(
        ilike(auditLogs.actorLabel, like),
        ilike(users.email, like),
        ilike(users.name, like),
        eq(auditLogs.entityId, q),
        sql`${auditLogs.metadata}::text ilike ${like}`,
      )!,
    );
  }
  const condition = where.length ? and(...where) : undefined;
  const [rows, totals] = await Promise.all([
    db
      .select({ log: auditLogs, name: users.name, email: users.email })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(condition)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ n: count() })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(condition),
  ]);
  return {
    items: rows.map(({ log, name, email }): AuditRow => ({
      id: log.id,
      action: log.action,
      actorId: log.actorId,
      actorName: name,
      actorEmail: email ?? log.actorLabel,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata ?? null,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    })),
    total: totals[0]?.n ?? 0,
    page,
    pageSize,
  };
}
