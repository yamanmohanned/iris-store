import "server-only";
import { createHash, createHmac } from "node:crypto";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { LocalizedText } from "@/lib/localized";
import { normalizePhone } from "@/lib/phone";
import { computeTotals, type PricingResult } from "@/lib/pricing";
import { CacheTags, invalidate } from "@/server/cache";
import { db, type Transaction } from "@/server/db/client";
import {
  addresses,
  carts,
  couponRedemptions,
  inventoryMovements,
  orderEvents,
  orderItems,
  orders,
  outboxMessages,
  PAYMENT_METHODS,
  products,
  productVariants,
  shippingZones,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type ShippingAddressSnapshot,
} from "@/server/db/schema";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { clearCart, imageUrlAtLeast, loadCartLines } from "./cart";
import { refreshProductAggregates } from "./catalog-admin";
import {
  claimCouponUse,
  couponStaticIssue,
  couponTerms,
  findCoupon,
  type CouponIssue,
} from "./coupons";
import { getSettings } from "./settings";

export const MAX_SAVED_ADDRESSES = 10;

// ── Input ────────────────────────────────────────────────────────────────────

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  text(max)
    .optional()
    .transform((v) => (v ? v : null));

export const checkoutInputSchema = z.object({
  fullName: text(80).min(2),
  phone: text(30).min(6),
  email: z
    .union([z.literal(""), z.email().max(254)])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  zoneId: z.uuid(),
  city: text(80).min(2),
  area: optionalText(120),
  street: optionalText(200),
  landmark: optionalText(200),
  paymentMethod: z.enum(PAYMENT_METHODS),
  note: optionalText(500),
  saveAddress: z.boolean().default(false),
  /** Random per checkout page view; a repeated submit returns the same order. */
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  /** The total the customer saw; if prices changed meanwhile, nothing is charged silently. */
  expectedTotal: z.number().int().min(0),
});
export type CheckoutInput = z.input<typeof checkoutInputSchema>;

export type PlaceOrderContext = {
  cartId: string;
  userId: string | null;
  locale: string;
  ip: string | null;
  userAgent: string | null;
};

export type PlacedOrder = {
  orderId: string;
  orderNumber: number;
  /** Secret for the "view order" link (only its hash is stored). */
  accessToken: string;
  replayed: boolean;
};

// ── Access tokens ────────────────────────────────────────────────────────────

/**
 * The order link token is an HMAC of the order's idempotency key, so it can be re-derived for a
 * repeated submit or a successful "track order" lookup, while only its SHA-256 is stored.
 */
export function orderAccessToken(idempotencyKey: string): string {
  return createHmac("sha256", env().AUTH_SECRET)
    .update(`order-access:${idempotencyKey}`)
    .digest("base64url");
}

export const hashAccessToken = (token: string) =>
  createHash("sha256").update(token).digest("base64url");

// ── Placing an order ─────────────────────────────────────────────────────────

type LockedVariant = {
  id: string;
  product_id: string;
  stock_quantity: number;
  track_inventory: boolean;
  is_active: boolean;
  low_stock_threshold: number | null;
  product_status: string;
};

async function findByIdempotencyKey(executor: typeof db | Transaction, key: string) {
  const [row] = await executor
    .select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.idempotencyKey, key))
    .limit(1);
  return row ?? null;
}

/**
 * Create an order from the cart in ONE transaction: the cart and every variant row are locked, so
 * stock can never be oversold and a coupon's limits can never be exceeded, even under concurrent
 * checkouts. Prices always come from the database, never from the browser.
 */
export async function placeOrder(raw: CheckoutInput, ctx: PlaceOrderContext): Promise<PlacedOrder> {
  const input = checkoutInputSchema.parse(raw);
  const settings = await getSettings();
  const { checkout, general, notifications } = settings;

  const phone = normalizePhone(input.phone, general.phoneCode);
  if (!phone) throw new AppError("VALIDATION", "invalid phone", { field: "phone" });
  if (!ctx.userId && !checkout.guestCheckout)
    throw new AppError("UNAUTHORIZED", "sign in required");
  if (checkout.requireEmail && !input.email)
    throw new AppError("VALIDATION", "email required", { field: "email" });
  const methodEnabled =
    input.paymentMethod === "cod" ? checkout.cod.enabled : checkout.bankTransfer.enabled;
  if (!methodEnabled)
    throw new AppError("VALIDATION", "payment method disabled", { field: "paymentMethod" });

  const replay = async (row: { id: string; orderNumber: number }): Promise<PlacedOrder> => ({
    orderId: row.id,
    orderNumber: row.orderNumber,
    accessToken: orderAccessToken(input.idempotencyKey),
    replayed: true,
  });
  const existing = await findByIdempotencyKey(db, input.idempotencyKey);
  if (existing) return replay(existing);

  const accessToken = orderAccessToken(input.idempotencyKey);
  const lowStock: { variantId: string; stock: number }[] = [];

  const result = await db.transaction(async (tx) => {
    // 1) Serialize checkouts of this cart (double taps, two tabs).
    const [cart] = await tx
      .select({ id: carts.id, couponCode: carts.couponCode, userId: carts.userId })
      .from(carts)
      .where(eq(carts.id, ctx.cartId))
      .for("update");
    if (!cart) throw new AppError("BAD_REQUEST", "cart not found", { emptyCart: true });
    const again = await findByIdempotencyKey(tx, input.idempotencyKey);
    if (again) return { replayed: again };

    // 2) Live lines, then lock their variants (sorted ids → no deadlocks between checkouts).
    const lines = await loadCartLines(cart.id, tx);
    if (lines.length === 0) throw new AppError("BAD_REQUEST", "empty cart", { emptyCart: true });
    const variantIds = [...new Set(lines.map((l) => l.variantId))].sort();
    const locked = await tx.execute<LockedVariant>(sql`
      select v.id, v.product_id, v.stock_quantity, v.track_inventory, v.is_active,
             v.low_stock_threshold, p.status as product_status
      from product_variants v join products p on p.id = v.product_id
      where v.id in ${variantIds}
      order by v.id
      for update of v
    `);
    const byId = new Map(locked.rows.map((v) => [v.id, v]));
    const problems = lines.filter((l) => {
      const v = byId.get(l.variantId);
      if (!v || !v.is_active || v.product_status !== "active") return true;
      return v.track_inventory && v.stock_quantity < l.quantity;
    });
    if (problems.length)
      throw new AppError("OUT_OF_STOCK", "cart changed", { lines: problems.map((l) => l.id) });

    // 3) Delivery area and payment method.
    const [zone] = await tx
      .select()
      .from(shippingZones)
      .where(and(eq(shippingZones.id, input.zoneId), eq(shippingZones.isActive, true)))
      .limit(1);
    if (!zone) throw new AppError("VALIDATION", "unknown zone", { field: "zoneId" });
    if (input.paymentMethod === "cod" && !zone.codAvailable)
      throw new AppError("VALIDATION", "cod unavailable here", { field: "paymentMethod" });

    // 4) Coupon: still valid for this customer? Take one use atomically. A code that stopped
    //    working is simply not applied — unless the customer confirmed a total that included it.
    const coupon = cart.couponCode ? await findCoupon(cart.couponCode, tx) : null;
    let couponOk = false;
    let couponIssue: CouponIssue | null = cart.couponCode && !coupon ? "not_found" : null;
    if (coupon) {
      const applies = computeTotals({
        lines,
        coupon: couponTerms(coupon),
        freeShippingThreshold: checkout.freeShippingThreshold,
      }).couponApplied;
      if (applies) {
        couponIssue =
          couponStaticIssue(coupon) ??
          (await claimCouponUse(tx, coupon, { userId: ctx.userId, phone }));
        couponOk = couponIssue === null;
      }
    }

    // 5) Totals — must match what the customer confirmed.
    const totals: PricingResult = computeTotals({
      lines,
      coupon: couponOk && coupon ? couponTerms(coupon) : null,
      shipping: { fee: zone.fee, freeShippingThreshold: zone.freeShippingThreshold },
      freeShippingThreshold: checkout.freeShippingThreshold,
      tax: checkout.tax,
    });
    if (checkout.minOrderAmount > 0 && totals.subtotal < checkout.minOrderAmount)
      throw new AppError("VALIDATION", "below minimum order", {
        minOrder: checkout.minOrderAmount,
      });
    if (totals.total !== input.expectedTotal) {
      if (couponIssue)
        throw new AppError("INVALID_COUPON", "coupon no longer valid", {
          issue: couponIssue,
          code: cart.couponCode,
          total: totals.total,
        });
      throw new AppError("CONFLICT", "total changed", { priceChanged: true, total: totals.total });
    }

    // 6) The order and its snapshot (later product edits never change past orders).
    const address: ShippingAddressSnapshot = {
      fullName: input.fullName,
      phone,
      zoneId: zone.id,
      zoneName: zone.name,
      city: input.city,
      area: input.area,
      street: input.street,
      landmark: input.landmark,
    };
    const [order] = await tx
      .insert(orders)
      .values({
        accessTokenHash: hashAccessToken(accessToken),
        userId: ctx.userId,
        paymentMethod: input.paymentMethod,
        currency: general.currency,
        locale: ctx.locale,
        customerName: input.fullName,
        customerPhone: phone,
        customerEmail: input.email,
        shippingAddress: address,
        shippingZoneId: zone.id,
        subtotal: totals.subtotal,
        discountTotal: totals.discount,
        shippingTotal: totals.shipping ?? 0,
        taxTotal: totals.tax,
        grandTotal: totals.total,
        couponId: couponOk ? coupon!.id : null,
        couponCode: couponOk ? coupon!.code : null,
        customerNote: checkout.allowOrderNotes ? input.note : null,
        idempotencyKey: input.idempotencyKey,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent?.slice(0, 300) ?? null,
      })
      .returning({ id: orders.id, orderNumber: orders.orderNumber });

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order!.id,
        productId: l.productId,
        variantId: l.variantId,
        productName: l.name,
        variantLabel: l.variantLabel,
        sku: l.sku,
        imageUrl: imageUrlAtLeast(l.image, 320),
        unitPrice: l.unitPrice,
        compareAtPrice: l.compareAtPrice,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
    );

    // 7) Stock: decrement under the locks taken above, with a movement row per variant.
    const movements: (typeof inventoryMovements.$inferInsert)[] = [];
    for (const l of lines) {
      const v = byId.get(l.variantId)!;
      if (!v.track_inventory) continue;
      const [updated] = await tx
        .update(productVariants)
        .set({ stockQuantity: sql`${productVariants.stockQuantity} - ${l.quantity}` })
        .where(eq(productVariants.id, l.variantId))
        .returning({ stock: productVariants.stockQuantity });
      movements.push({
        variantId: l.variantId,
        delta: -l.quantity,
        stockAfter: updated!.stock,
        reason: "order_placed",
        orderId: order!.id,
        actorId: ctx.userId,
      });
      const threshold = v.low_stock_threshold ?? notifications.lowStockThreshold;
      if (updated!.stock <= threshold)
        lowStock.push({ variantId: l.variantId, stock: updated!.stock });
    }
    if (movements.length) await tx.insert(inventoryMovements).values(movements);

    const unitsByProduct = new Map<string, number>();
    for (const l of lines)
      unitsByProduct.set(l.productId, (unitsByProduct.get(l.productId) ?? 0) + l.quantity);
    for (const [productId, units] of unitsByProduct)
      await tx
        .update(products)
        .set({ salesCount: sql`${products.salesCount} + ${units}` })
        .where(eq(products.id, productId));
    await refreshProductAggregates(tx, [...unitsByProduct.keys()]);

    // 8) Coupon redemption, timeline, saved address, emptied cart.
    if (couponOk)
      await tx.insert(couponRedemptions).values({
        couponId: coupon!.id,
        orderId: order!.id,
        userId: ctx.userId,
        customerPhone: phone,
        discountAmount: totals.discount,
      });
    await tx.insert(orderEvents).values({
      orderId: order!.id,
      type: "placed",
      toStatus: "pending",
      isCustomerVisible: true,
      actorId: ctx.userId,
    });
    if (ctx.userId && input.saveAddress) await saveAddressFromOrder(tx, ctx.userId, address);
    await clearCart(cart.id, tx);

    // 9) Notifications go through the outbox (same transaction: never lost, never sent for a rollback).
    const outbox: (typeof outboxMessages.$inferInsert)[] = [];
    if (input.email)
      outbox.push({
        channel: "email",
        recipient: input.email,
        template: "order_placed",
        payload: { orderId: order!.id },
      });
    if (notifications.notifyNewOrder)
      for (const admin of notifications.adminEmails)
        outbox.push({
          channel: "email",
          recipient: admin,
          template: "admin_new_order",
          payload: { orderId: order!.id },
        });
    if (notifications.notifyLowStock && lowStock.length)
      for (const admin of notifications.adminEmails)
        outbox.push({
          channel: "email",
          recipient: admin,
          template: "admin_low_stock",
          payload: { orderId: order!.id, variants: lowStock },
        });
    if (outbox.length) await tx.insert(outboxMessages).values(outbox);

    return { order: order! };
  });

  if (result.replayed) return replay(result.replayed);
  const placed = result.order!;
  invalidate(CacheTags.catalog); // stock and "sold out" flags changed
  return { orderId: placed.id, orderNumber: placed.orderNumber, accessToken, replayed: false };
}

async function saveAddressFromOrder(tx: Transaction, userId: string, a: ShippingAddressSnapshot) {
  const [{ n }] = (await tx
    .select({ n: count() })
    .from(addresses)
    .where(eq(addresses.userId, userId))) as [{ n: number }];
  if (n >= MAX_SAVED_ADDRESSES) return;
  const [duplicate] = await tx
    .select({ id: addresses.id })
    .from(addresses)
    .where(
      and(
        eq(addresses.userId, userId),
        eq(addresses.phone, a.phone),
        eq(addresses.city, a.city),
        sql`${addresses.shippingZoneId} is not distinct from ${a.zoneId}`,
        sql`coalesce(${addresses.area}, '') = ${a.area ?? ""}`,
        sql`coalesce(${addresses.landmark}, '') = ${a.landmark ?? ""}`,
      ),
    )
    .limit(1);
  if (duplicate) return;
  await tx.insert(addresses).values({
    userId,
    fullName: a.fullName,
    phone: a.phone,
    shippingZoneId: a.zoneId,
    city: a.city,
    area: a.area ?? null,
    street: a.street ?? null,
    landmark: a.landmark ?? null,
    isDefault: n === 0,
  });
}

// ── Reading orders ───────────────────────────────────────────────────────────

export type OrderItemDTO = {
  id: string;
  productName: LocalizedText;
  variantLabel: LocalizedText | null;
  imageUrl: string | null;
  productSlug: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderEventDTO = {
  type: string;
  toStatus: string | null;
  message: string | null;
  createdAt: string;
};

export type OrderDTO = {
  id: string;
  orderNumber: number;
  /** Language the customer ordered in (emails follow it). */
  locale: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  currency: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: ShippingAddressSnapshot;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  couponCode: string | null;
  customerNote: string | null;
  placedAt: string;
  items: OrderItemDTO[];
  /** Customer-visible timeline only. */
  events: OrderEventDTO[];
};

async function loadOrder(where: SQL): Promise<OrderDTO | null> {
  const [o] = await db.select().from(orders).where(where).limit(1);
  if (!o) return null;
  const [items, events] = await Promise.all([
    db
      .select({ item: orderItems, slug: products.slug, status: products.status })
      .from(orderItems)
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, o.id))
      .orderBy(asc(orderItems.id)),
    db
      .select()
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, o.id), eq(orderEvents.isCustomerVisible, true)))
      .orderBy(asc(orderEvents.createdAt)),
  ]);
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    locale: o.locale,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    currency: o.currency,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    shippingAddress: o.shippingAddress,
    subtotal: o.subtotal,
    discountTotal: o.discountTotal,
    shippingTotal: o.shippingTotal,
    taxTotal: o.taxTotal,
    grandTotal: o.grandTotal,
    couponCode: o.couponCode,
    customerNote: o.customerNote,
    placedAt: o.placedAt.toISOString(),
    items: items.map(({ item, slug, status }) => ({
      id: item.id,
      productName: item.productName,
      variantLabel: item.variantLabel ?? null,
      imageUrl: item.imageUrl,
      productSlug: status === "active" ? slug : null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    events: events.map((e) => ({
      type: e.type,
      toStatus: e.toStatus,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

/** Server-side use only (notifications, admin). */
export async function getOrderById(orderId: string): Promise<OrderDTO | null> {
  return loadOrder(eq(orders.id, orderId));
}

/** Absolute "view order" link for emails, in the customer's language. */
export async function orderLink(orderId: string): Promise<string | null> {
  const [row] = await db
    .select({ key: orders.idempotencyKey, locale: orders.locale })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return null;
  const prefix = row.locale === "en" ? "/en" : "";
  return `${env().APP_URL}${prefix}/order/${orderAccessToken(row.key)}`;
}

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** Guest/customer order page via the secret link. */
export async function getOrderByAccessToken(token: string): Promise<OrderDTO | null> {
  if (!TOKEN_SHAPE.test(token)) return null;
  return loadOrder(eq(orders.accessTokenHash, hashAccessToken(token)));
}

export async function getOrderForUser(userId: string, orderNumber: number) {
  if (!Number.isSafeInteger(orderNumber)) return null;
  return loadOrder(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId))!);
}

export type OrderSummaryDTO = {
  orderNumber: number;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  placedAt: string;
  itemCount: number;
  firstImage: string | null;
};

export async function listOrdersForUser(userId: string, page = 1, pageSize = 20) {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      grandTotal: orders.grandTotal,
      currency: orders.currency,
      placedAt: orders.placedAt,
      // Correlated subqueries name the outer column explicitly ("orders"."id"); an unqualified
      // id would silently bind to order_items.id.
      itemCount: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id")`,
      firstImage: sql<
        string | null
      >`(select oi.image_url from order_items oi where oi.order_id = "orders"."id" order by oi.id limit 1)`,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.placedAt))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return {
    items: rows.slice(0, pageSize).map((r): OrderSummaryDTO => ({
      orderNumber: r.orderNumber,
      status: r.status,
      grandTotal: r.grandTotal,
      currency: r.currency,
      placedAt: r.placedAt.toISOString(),
      itemCount: r.itemCount,
      firstImage: r.firstImage,
    })),
    hasMore: rows.length > pageSize,
  };
}

/**
 * "Track my order": order number + the phone used at checkout. Returns the order link token on a
 * match (callers must rate-limit; both values are required so numbers alone reveal nothing).
 */
export async function findOrderTokenForTracking(
  orderNumber: number,
  phoneInput: string,
): Promise<string | null> {
  if (!Number.isSafeInteger(orderNumber) || orderNumber < 1) return null;
  const { general } = await getSettings();
  const phone = normalizePhone(phoneInput, general.phoneCode);
  if (!phone) return null;
  const [row] = await db
    .select({ key: orders.idempotencyKey })
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.customerPhone, phone)))
    .limit(1);
  return row ? orderAccessToken(row.key) : null;
}
