import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { OPEN_STATUSES, RESTOCKING_STATUSES, canTransition } from "@/lib/order-status";
import { normalizePhone } from "@/lib/phone";
import { escapeLike } from "@/lib/search";
import { CacheTags, invalidate } from "@/server/cache";
import { db } from "@/server/db/client";
import {
  couponRedemptions,
  coupons,
  inventoryMovements,
  ORDER_STATUSES,
  orderEvents,
  orderItems,
  orders,
  outboxMessages,
  PAYMENT_STATUSES,
  products,
  productVariants,
  users,
  type OrderStatus,
  type PaymentStatus,
} from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { audit } from "./audit";
import { refreshProductAggregates } from "./catalog-admin";
import { getOrderById, type OrderDTO } from "./orders";
import { getSettings } from "./settings";

export type StaffActor = { id: string; label?: string | null };

// ── Listing ──────────────────────────────────────────────────────────────────

export type AdminOrderRow = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  itemCount: number;
  city: string;
  placedAt: string;
};

export type AdminOrderFilter = {
  status?: OrderStatus | "open" | "all";
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listOrdersAdmin(filter: AdminOrderFilter) {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 25));
  const where: SQL[] = [];
  if (filter.status === "open") where.push(inArray(orders.status, [...OPEN_STATUSES]));
  else if (filter.status && filter.status !== "all") where.push(eq(orders.status, filter.status));

  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    const { general } = await getSettings();
    const digits = q.replace(/^#/, "");
    const phone = normalizePhone(q, general.phoneCode);
    const like = `%${escapeLike(q)}%`;
    const conditions: SQL[] = [
      ilike(orders.customerName, like),
      ilike(sql`coalesce(${orders.customerEmail}, '')`, like),
    ];
    if (/^\d{1,15}$/.test(digits)) conditions.push(eq(orders.orderNumber, Number(digits)));
    if (phone) conditions.push(eq(orders.customerPhone, phone));
    where.push(or(...conditions)!);
  }

  const condition = where.length ? and(...where) : undefined;
  const [rows, totals, statusCounts] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        grandTotal: orders.grandTotal,
        city: sql<string>`${orders.shippingAddress}->>'city'`,
        placedAt: orders.placedAt,
        itemCount: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id")`,
      })
      .from(orders)
      .where(condition)
      .orderBy(desc(orders.placedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(orders).where(condition),
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
  ]);
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;
  for (const r of statusCounts) counts[r.status] = r.n;
  return {
    items: rows.map((r): AdminOrderRow => ({ ...r, placedAt: r.placedAt.toISOString() })),
    total: totals[0]?.total ?? 0,
    page,
    pageSize,
    counts,
  };
}

// ── Detail ───────────────────────────────────────────────────────────────────

export type AdminOrderEvent = {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  message: string | null;
  isCustomerVisible: boolean;
  actorLabel: string | null;
  createdAt: string;
};

export type AdminOrderDTO = OrderDTO & {
  internalNote: string | null;
  cancelReason: string | null;
  account: { id: string; name: string; email: string } | null;
  ipAddress: string | null;
  timeline: AdminOrderEvent[];
};

export async function getOrderAdmin(orderNumber: number): Promise<AdminOrderDTO | null> {
  if (!Number.isSafeInteger(orderNumber)) return null;
  const [row] = await db
    .select({
      id: orders.id,
      internalNote: orders.internalNote,
      cancelReason: orders.cancelReason,
      ipAddress: orders.ipAddress,
      userId: orders.userId,
      accountName: users.name,
      accountEmail: users.email,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (!row) return null;
  const [order, events] = await Promise.all([
    getOrderById(row.id),
    db
      .select({ e: orderEvents, actorName: users.name, actorEmail: users.email })
      .from(orderEvents)
      .leftJoin(users, eq(users.id, orderEvents.actorId))
      .where(eq(orderEvents.orderId, row.id))
      .orderBy(asc(orderEvents.createdAt)),
  ]);
  if (!order) return null;
  return {
    ...order,
    internalNote: row.internalNote,
    cancelReason: row.cancelReason,
    ipAddress: row.ipAddress,
    account:
      row.userId && row.accountEmail
        ? { id: row.userId, name: row.accountName ?? "", email: row.accountEmail }
        : null,
    timeline: events.map(({ e, actorName, actorEmail }) => ({
      id: e.id,
      type: e.type,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      message: e.message,
      isCustomerVisible: e.isCustomerVisible,
      actorLabel: actorName || actorEmail || null,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

// ── Status changes ───────────────────────────────────────────────────────────

export const statusChangeSchema = z.object({
  orderId: z.uuid(),
  /** The status the staff member saw; a different current status means someone else acted. */
  from: z.enum(ORDER_STATUSES),
  to: z.enum(ORDER_STATUSES),
  reason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || null),
  notifyCustomer: z.boolean().default(true),
});

/**
 * Move an order along its lifecycle in one transaction. Cancelling or returning puts tracked stock
 * back (with inventory movements) and undoes sales counters; cancelling also releases the coupon
 * use. Cash-on-delivery orders become "paid" on delivery. The customer is emailed when enabled.
 */
export async function updateOrderStatus(
  raw: z.input<typeof statusChangeSchema>,
  actor: StaffActor,
): Promise<{ restocked: boolean }> {
  const input = statusChangeSchema.parse(raw);
  const { notifications } = await getSettings();
  let restocked = false;

  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!order) throw new AppError("NOT_FOUND", "order");
    if (order.status !== input.from)
      throw new AppError("CONFLICT", "order changed", { current: order.status });
    if (!canTransition(order.status, input.to))
      throw new AppError("VALIDATION", `cannot move ${order.status} → ${input.to}`, {
        field: "to",
      });
    if (input.to === "cancelled" && !input.reason)
      throw new AppError("VALIDATION", "reason required", { field: "reason" });

    const now = new Date();
    const patch: Partial<typeof orders.$inferInsert> = { status: input.to };
    if (input.to === "confirmed") patch.confirmedAt = now;
    if (input.to === "shipped") patch.shippedAt = now;
    if (input.to === "delivered") {
      patch.deliveredAt = now;
      if (order.paymentMethod === "cod" && order.paymentStatus === "unpaid")
        patch.paymentStatus = "paid";
    }
    if (input.to === "cancelled") {
      patch.cancelledAt = now;
      patch.cancelReason = input.reason;
    }
    await tx.update(orders).set(patch).where(eq(orders.id, order.id));

    if (RESTOCKING_STATUSES.includes(input.to)) {
      const items = await tx
        .select({
          variantId: orderItems.variantId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      const variantIds = items.map((i) => i.variantId).filter((v): v is string => Boolean(v));
      const tracked = variantIds.length
        ? await tx
            .select({ id: productVariants.id, track: productVariants.trackInventory })
            .from(productVariants)
            .where(inArray(productVariants.id, variantIds))
            .orderBy(productVariants.id)
            .for("update")
        : [];
      const trackedIds = new Set(tracked.filter((v) => v.track).map((v) => v.id));
      for (const item of items) {
        if (!item.variantId || !trackedIds.has(item.variantId)) continue;
        const [updated] = await tx
          .update(productVariants)
          .set({ stockQuantity: sql`${productVariants.stockQuantity} + ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId))
          .returning({ stock: productVariants.stockQuantity });
        await tx.insert(inventoryMovements).values({
          variantId: item.variantId,
          delta: item.quantity,
          stockAfter: updated!.stock,
          reason: input.to === "cancelled" ? "order_cancelled" : "return",
          orderId: order.id,
          actorId: actor.id,
        });
        restocked = true;
      }
      const productIds = [
        ...new Set(items.map((i) => i.productId).filter((p): p is string => Boolean(p))),
      ];
      for (const item of items) {
        if (!item.productId) continue;
        await tx
          .update(products)
          .set({ salesCount: sql`greatest(0, ${products.salesCount} - ${item.quantity})` })
          .where(eq(products.id, item.productId));
      }
      if (productIds.length) await refreshProductAggregates(tx, productIds);
    }

    if (input.to === "cancelled" && order.couponId) {
      const released = await tx
        .delete(couponRedemptions)
        .where(eq(couponRedemptions.orderId, order.id))
        .returning({ id: couponRedemptions.id });
      if (released.length)
        await tx
          .update(coupons)
          .set({ usedCount: sql`greatest(0, ${coupons.usedCount} - 1)` })
          .where(eq(coupons.id, order.couponId));
    }

    await tx.insert(orderEvents).values({
      orderId: order.id,
      type: "status_changed",
      fromStatus: order.status,
      toStatus: input.to,
      message: input.reason,
      isCustomerVisible: true,
      actorId: actor.id,
    });
    if (input.notifyCustomer && notifications.customerStatusEmails && order.customerEmail)
      await tx.insert(outboxMessages).values({
        channel: "email",
        recipient: order.customerEmail,
        template: "order_status",
        payload: { orderId: order.id, status: input.to },
      });
    await audit(
      {
        action: "order.status_change",
        actorId: actor.id,
        actorLabel: actor.label,
        entityType: "order",
        entityId: String(order.orderNumber),
        metadata: { from: order.status, to: input.to, reason: input.reason },
      },
      tx,
    );
  });

  if (restocked) invalidate(CacheTags.catalog);
  return { restocked };
}

export const paymentChangeSchema = z.object({
  orderId: z.uuid(),
  from: z.enum(PAYMENT_STATUSES),
  to: z.enum(PAYMENT_STATUSES),
});

export async function updatePaymentStatus(
  raw: z.input<typeof paymentChangeSchema>,
  actor: StaffActor,
) {
  const input = paymentChangeSchema.parse(raw);
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!order) throw new AppError("NOT_FOUND", "order");
    if (order.paymentStatus !== input.from)
      throw new AppError("CONFLICT", "payment changed", { current: order.paymentStatus });
    if (input.from === input.to) return;
    await tx.update(orders).set({ paymentStatus: input.to }).where(eq(orders.id, order.id));
    await tx.insert(orderEvents).values({
      orderId: order.id,
      type: "payment_status_changed",
      fromStatus: input.from,
      toStatus: input.to,
      isCustomerVisible: false,
      actorId: actor.id,
    });
    await audit(
      {
        action: "order.payment_change",
        actorId: actor.id,
        actorLabel: actor.label,
        entityType: "order",
        entityId: String(order.orderNumber),
        metadata: { from: input.from, to: input.to },
      },
      tx,
    );
  });
}

export const noteSchema = z.object({
  orderId: z.uuid(),
  message: z.string().trim().min(1).max(1000),
  customerVisible: z.boolean().default(false),
});

/** Timeline note (optionally shown to the customer on their order page). */
export async function addOrderNote(raw: z.input<typeof noteSchema>, actor: StaffActor) {
  const input = noteSchema.parse(raw);
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);
  if (!order) throw new AppError("NOT_FOUND", "order");
  await db.insert(orderEvents).values({
    orderId: order.id,
    type: "note",
    message: input.message,
    isCustomerVisible: input.customerVisible,
    actorId: actor.id,
  });
}

export async function setInternalNote(orderId: string, note: string, actor: StaffActor) {
  const value = note.trim().slice(0, 2000) || null;
  const [order] = await db
    .update(orders)
    .set({ internalNote: value })
    .where(eq(orders.id, orderId))
    .returning({ orderNumber: orders.orderNumber });
  if (!order) throw new AppError("NOT_FOUND", "order");
  await audit({
    action: "order.internal_note",
    actorId: actor.id,
    actorLabel: actor.label,
    entityType: "order",
    entityId: String(order.orderNumber),
  });
}

/** Orders waiting for confirmation (badge in the admin navigation). */
export async function countPendingOrders(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(orders).where(eq(orders.status, "pending"));
  return row?.n ?? 0;
}
