import "server-only";
import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { toLatinDigits } from "@/lib/phone";
import { escapeLike } from "@/lib/search";
import { assignableRoles, isStaffRole } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { addresses, orders, sessions, users, type UserRole } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { audit } from "./audit";

type Actor = { id: string; label?: string | null; role: string };

/** Orders that count as sales (cancelled and returned ones do not). */
const COUNTED = sql`${orders.status} not in ('cancelled','returned')`;

// ── Customers ────────────────────────────────────────────────────────────────

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  banned: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export type CustomerFilter = {
  q?: string;
  status?: "all" | "suspended";
  page?: number;
  pageSize?: number;
};

/** Registered customers with their purchase totals (guests are found through their orders). */
export async function listCustomersAdmin(filter: CustomerFilter = {}) {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 25));
  const where: SQL[] = [eq(users.role, "customer")];
  if (filter.status === "suspended") where.push(eq(users.banned, true));
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    const conditions: SQL[] = [ilike(users.name, like), ilike(users.email, like)];
    const digits = toLatinDigits(q).replace(/\D/g, "");
    if (digits.length >= 4) conditions.push(ilike(users.phone, `%${digits.replace(/^0+/, "")}%`));
    where.push(or(...conditions)!);
  }
  const condition = and(...where);

  const stats = db
    .select({
      userId: orders.userId,
      orderCount: count().as("order_count"),
      totalSpent: sql<number>`coalesce(sum(${orders.grandTotal}), 0)::bigint`
        .mapWith(Number)
        .as("total_spent"),
      lastOrderAt: sql<Date | null>`max(${orders.placedAt})`.as("last_order_at"),
    })
    .from(orders)
    .where(COUNTED)
    .groupBy(orders.userId)
    .as("stats");

  const [rows, totals, suspended] = await Promise.all([
    db
      .select({
        u: users,
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
        lastOrderAt: stats.lastOrderAt,
      })
      .from(users)
      .leftJoin(stats, eq(stats.userId, users.id))
      .where(condition)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(users).where(condition),
    db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.role, "customer"), eq(users.banned, true))),
  ]);

  return {
    items: rows.map(({ u, orderCount, totalSpent, lastOrderAt }): CustomerRow => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      emailVerified: u.emailVerified,
      banned: u.banned,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      orderCount: Number(orderCount ?? 0),
      totalSpent: Number(totalSpent ?? 0),
      lastOrderAt: lastOrderAt ? new Date(lastOrderAt).toISOString() : null,
    })),
    total: totals[0]?.n ?? 0,
    suspended: suspended[0]?.n ?? 0,
    page,
    pageSize,
  };
}

/** One customer: profile, purchase summary, recent orders, saved addresses. */
export async function getCustomerAdmin(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || isStaffRole(user.role)) return null;
  const [summary, recent, saved, activeSessions] = await Promise.all([
    db
      .select({
        orderCount: count(),
        totalSpent: sql<number>`coalesce(sum(${orders.grandTotal}), 0)::bigint`.mapWith(Number),
      })
      .from(orders)
      .where(and(eq(orders.userId, userId), COUNTED)),
    db
      .select({
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        grandTotal: orders.grandTotal,
        placedAt: orders.placedAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.placedAt))
      .limit(20),
    db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), asc(addresses.createdAt)),
    db
      .select({ n: count() })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), sql`${sessions.expiresAt} > now()`)),
  ]);
  const orderCount = summary[0]?.orderCount ?? 0;
  const totalSpent = summary[0]?.totalSpent ?? 0;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    phone: user.phone,
    banned: user.banned,
    banReason: user.banReason,
    marketingOptIn: user.marketingOptIn,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    orderCount,
    totalSpent,
    averageOrder: orderCount ? Math.round(totalSpent / orderCount) : 0,
    activeSessions: activeSessions[0]?.n ?? 0,
    orders: recent.map((o) => ({ ...o, placedAt: o.placedAt.toISOString() })),
    addresses: saved.map((a) => ({
      id: a.id,
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      city: a.city,
      area: a.area,
      street: a.street,
      landmark: a.landmark,
      isDefault: a.isDefault,
    })),
  };
}
export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomerAdmin>>>;

/**
 * Suspend (or reactivate) a customer account. A suspended customer is signed out everywhere and
 * cannot sign in again; their past orders stay untouched.
 */
export async function setCustomerSuspended(
  userId: string,
  suspended: boolean,
  reason: string | null,
  actor: Actor,
) {
  const clean = reason?.trim().slice(0, 300) || null;
  await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ role: users.role, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user) throw new AppError("NOT_FOUND", "user not found");
    // Staff are managed (and removed) from the staff page, never suspended here.
    if (isStaffRole(user.role)) throw new AppError("FORBIDDEN", "staff account");
    await tx
      .update(users)
      .set({ banned: suspended, banReason: suspended ? clean : null })
      .where(eq(users.id, userId));
    if (suspended) await tx.delete(sessions).where(eq(sessions.userId, userId));
    await audit(
      {
        action: suspended ? "customer.suspended" : "customer.reactivated",
        actorId: actor.id,
        actorLabel: actor.label,
        entityType: "user",
        entityId: userId,
        metadata: { email: user.email, ...(suspended && clean ? { reason: clean } : {}) },
      },
      tx,
    );
  });
}

/** Sign a person out of every device (their next request needs a fresh sign-in). */
export async function revokeAllSessions(userId: string, actor: Actor) {
  await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) throw new AppError("NOT_FOUND", "user not found");
    const removed = await tx
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning({ id: sessions.id });
    await audit(
      {
        action: "user.sessions_revoked",
        actorId: actor.id,
        actorLabel: actor.label,
        entityType: "user",
        entityId: userId,
        metadata: { email: user.email, role: user.role, sessions: removed.length },
      },
      tx,
    );
  });
}

// ── Staff ────────────────────────────────────────────────────────────────────

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  activeSessions: number;
};

const ROLE_ORDER: Record<string, number> = {
  owner: 0,
  admin: 1,
  order_manager: 2,
  catalog_manager: 3,
};

export async function listStaff(): Promise<StaffRow[]> {
  const rows = await db
    .select({
      u: users,
      activeSessions: sql<number>`(select count(*)::int from ${sessions} s where s.user_id = "users"."id" and s.expires_at > now())`,
    })
    .from(users)
    .where(ne(users.role, "customer"));
  return rows
    .map(({ u, activeSessions }) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      twoFactorEnabled: Boolean(u.twoFactorEnabled),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      activeSessions,
    }))
    .sort(
      (a, b) =>
        (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.name.localeCompare(b.name),
    );
}

/**
 * Give someone a staff role, change it, or remove it (role "customer"). The person must already
 * have a verified account. Their sessions are revoked so the new role starts with a fresh
 * password + 2FA sign-in (staff are always asked to set up 2FA first).
 */
export async function assignRole(
  target: { userId?: string; email?: string },
  role: UserRole,
  actor: Actor,
) {
  if (!assignableRoles(actor.role).includes(role))
    throw new AppError("FORBIDDEN", "role not assignable");
  return db.transaction(async (tx) => {
    const email = target.email?.trim().toLowerCase();
    const [user] = await tx
      .select()
      .from(users)
      .where(target.userId ? eq(users.id, target.userId) : eq(users.email, email ?? ""))
      .for("update");
    if (!user) throw new AppError("NOT_FOUND", "no account", { reason: "no_account" });
    if (user.id === actor.id) throw new AppError("FORBIDDEN", "own role", { reason: "self" });
    if (user.role === "owner") throw new AppError("FORBIDDEN", "owner", { reason: "owner" });
    // An admin may only manage the manager roles, never other admins.
    if (!assignableRoles(actor.role).includes(user.role))
      throw new AppError("FORBIDDEN", "not manageable", { reason: "not_manageable" });
    if (isStaffRole(role) && !user.emailVerified)
      throw new AppError("VALIDATION", "email not verified", { reason: "unverified" });
    if (user.banned) throw new AppError("VALIDATION", "suspended", { reason: "suspended" });
    if (user.role === role) return { id: user.id, changed: false };

    await tx.update(users).set({ role }).where(eq(users.id, user.id));
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await audit(
      {
        action: role === "customer" ? "staff.removed" : "staff.role_changed",
        actorId: actor.id,
        actorLabel: actor.label,
        entityType: "user",
        entityId: user.id,
        metadata: { email: user.email, from: user.role, to: role },
      },
      tx,
    );
    return { id: user.id, changed: true };
  });
}

/** Sign a staff member out everywhere (your own devices are managed from account security). */
export async function revokeStaffSessions(userId: string, actor: Actor) {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!user || !isStaffRole(user.role)) throw new AppError("NOT_FOUND", "staff not found");
  if (userId === actor.id) throw new AppError("FORBIDDEN", "own sessions", { reason: "self" });
  await revokeAllSessions(userId, actor);
}
