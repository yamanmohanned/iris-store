import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, localized, money, tsNullable, updatedAt, type LocalizedText } from "./_shared";
import { users } from "./auth";
import { products, productVariants } from "./catalog";

// ── Shipping ─────────────────────────────────────────────────────────────────

/** A delivery area (governorate / city) with its fee — what the customer picks at checkout. */
export const shippingZones = pgTable("shipping_zones", {
  id: uuid().primaryKey().defaultRandom(),
  name: localized().notNull(),
  fee: money().notNull().default(0),
  freeShippingThreshold: money(),
  minDays: integer(),
  maxDays: integer(),
  codAvailable: boolean().notNull().default(true),
  isActive: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── Customers ────────────────────────────────────────────────────────────────

export const addresses = pgTable(
  "addresses",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text(),
    fullName: text().notNull(),
    phone: text().notNull(),
    shippingZoneId: uuid().references(() => shippingZones.id, { onDelete: "set null" }),
    city: text().notNull(),
    area: text(),
    street: text(),
    landmark: text(),
    notes: text(),
    isDefault: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("addresses_user_idx").on(t.userId),
    uniqueIndex("addresses_one_default_per_user")
      .on(t.userId)
      .where(sql`${t.isDefault}`),
  ],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

// ── Carts ────────────────────────────────────────────────────────────────────

/** Server-side cart. The browser only holds a random token; the DB stores its SHA-256 hash. */
export const carts = pgTable(
  "carts",
  {
    id: uuid().primaryKey().defaultRandom(),
    tokenHash: text().notNull().unique(),
    userId: uuid().references(() => users.id, { onDelete: "cascade" }),
    couponCode: text(),
    expiresAt: tsNullable().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("carts_one_per_user")
      .on(t.userId)
      .where(sql`${t.userId} is not null`),
    index("carts_expires_idx").on(t.expiresAt),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("cart_items_cart_variant_unique").on(t.cartId, t.variantId),
    check("cart_items_quantity_range", sql`${t.quantity} between 1 and 999`),
  ],
);

// ── Coupons ──────────────────────────────────────────────────────────────────

export const COUPON_TYPES = ["percentage", "fixed_amount", "free_shipping"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const coupons = pgTable(
  "coupons",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull().unique(),
    description: text(),
    type: text().$type<CouponType>().notNull(),
    /** percentage: 1..100 · fixed_amount: minor units · free_shipping: 0 */
    value: money().notNull().default(0),
    minSubtotal: money(),
    maxDiscount: money(),
    startsAt: tsNullable(),
    endsAt: tsNullable(),
    usageLimit: integer(),
    usageLimitPerCustomer: integer(),
    usedCount: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("coupons_code_uppercase", sql`${t.code} = upper(${t.code})`),
    check("coupons_type_valid", sql`${t.type} in ('percentage','fixed_amount','free_shipping')`),
    check(
      "coupons_percentage_range",
      sql`${t.type} <> 'percentage' or ${t.value} between 1 and 100`,
    ),
    check("coupons_value_nonnegative", sql`${t.value} >= 0`),
  ],
);

// ── Orders ───────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partially_refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["cod", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type ShippingAddressSnapshot = {
  fullName: string;
  phone: string;
  zoneId: string | null;
  zoneName: LocalizedText;
  city: string;
  area?: string | null;
  street?: string | null;
  landmark?: string | null;
  notes?: string | null;
};

/** Human-friendly order numbers (#10001…). Never used alone for access control. */
export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 10001, increment: 1 });

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderNumber: bigint({ mode: "number" })
      .notNull()
      .unique()
      .default(sql`nextval('order_number_seq')`),
    /** SHA-256 of the secret token in the guest "view order" link. */
    accessTokenHash: text().notNull().unique(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    status: text().$type<OrderStatus>().notNull().default("pending"),
    paymentStatus: text().$type<PaymentStatus>().notNull().default("unpaid"),
    paymentMethod: text().$type<PaymentMethod>().notNull(),
    paymentReference: text(),
    currency: text().notNull(),
    locale: text().notNull(),
    customerName: text().notNull(),
    customerPhone: text().notNull(),
    customerEmail: text(),
    shippingAddress: jsonb().$type<ShippingAddressSnapshot>().notNull(),
    shippingZoneId: uuid().references(() => shippingZones.id, { onDelete: "set null" }),
    subtotal: money().notNull(),
    discountTotal: money().notNull().default(0),
    shippingTotal: money().notNull().default(0),
    taxTotal: money().notNull().default(0),
    grandTotal: money().notNull(),
    couponId: uuid().references(() => coupons.id, { onDelete: "set null" }),
    couponCode: text(),
    customerNote: text(),
    internalNote: text(),
    idempotencyKey: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    placedAt: createdAt(),
    confirmedAt: tsNullable(),
    shippedAt: tsNullable(),
    deliveredAt: tsNullable(),
    cancelledAt: tsNullable(),
    cancelReason: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_user_placed_idx").on(t.userId, t.placedAt),
    index("orders_status_placed_idx").on(t.status, t.placedAt),
    index("orders_phone_idx").on(t.customerPhone),
    index("orders_placed_idx").on(t.placedAt),
    check(
      "orders_status_valid",
      sql`${t.status} in ('pending','confirmed','processing','shipped','delivered','cancelled','returned')`,
    ),
    check(
      "orders_payment_status_valid",
      sql`${t.paymentStatus} in ('unpaid','paid','refunded','partially_refunded')`,
    ),
    check("orders_payment_method_valid", sql`${t.paymentMethod} in ('cod','bank_transfer')`),
    check(
      "orders_totals_nonnegative",
      sql`${t.subtotal} >= 0 and ${t.discountTotal} >= 0 and ${t.shippingTotal} >= 0 and ${t.taxTotal} >= 0 and ${t.grandTotal} >= 0`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid().references(() => products.id, { onDelete: "set null" }),
    variantId: uuid().references(() => productVariants.id, { onDelete: "set null" }),
    productName: localized().notNull(),
    variantLabel: localized(),
    sku: text(),
    imageUrl: text(),
    unitPrice: money().notNull(),
    compareAtPrice: money(),
    quantity: integer().notNull(),
    lineTotal: money().notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const ORDER_EVENT_TYPES = [
  "placed",
  "status_changed",
  "payment_status_changed",
  "note",
  "notification_sent",
] as const;
export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number];

/** Order timeline: status history, notes, notifications. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text().$type<OrderEventType>().notNull(),
    fromStatus: text(),
    toStatus: text(),
    message: text(),
    isCustomerVisible: boolean().notNull().default(false),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    couponId: uuid()
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid()
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    customerPhone: text(),
    discountAmount: money().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("coupon_redemptions_user_idx").on(t.couponId, t.userId),
    index("coupon_redemptions_phone_idx").on(t.couponId, t.customerPhone),
  ],
);

// ── Inventory ────────────────────────────────────────────────────────────────

export const INVENTORY_REASONS = [
  "initial",
  "manual_adjustment",
  "restock",
  "order_placed",
  "order_cancelled",
  "return",
] as const;
export type InventoryReason = (typeof INVENTORY_REASONS)[number];

/** Every stock change, so the owner can see why a number moved. */
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid().primaryKey().defaultRandom(),
    variantId: uuid().references(() => productVariants.id, { onDelete: "set null" }),
    delta: integer().notNull(),
    stockAfter: integer(),
    reason: text().$type<InventoryReason>().notNull(),
    orderId: uuid().references(() => orders.id, { onDelete: "set null" }),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [index("inventory_movements_variant_idx").on(t.variantId, t.createdAt)],
);
