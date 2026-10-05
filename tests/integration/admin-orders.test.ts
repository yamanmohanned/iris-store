import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import {
  couponRedemptions,
  coupons,
  inventoryMovements,
  orders,
  outboxMessages,
  products,
  productVariants,
  shippingZones,
} from "@/server/db/schema";
import {
  addOrderNote,
  getOrderAdmin,
  listOrdersAdmin,
  setInternalNote,
  updateOrderStatus,
  updatePaymentStatus,
} from "@/server/services/admin-orders";
import { addCartItem, createGuestCart, setCartCoupon } from "@/server/services/cart";
import { saveProduct } from "@/server/services/catalog-admin";
import { getOrderByAccessToken, placeOrder } from "@/server/services/orders";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

async function setup() {
  const staff = await createVerifiedUser({
    email: "staff@example.com",
    password: "Calm-River-Stone-2026",
    role: "order_manager",
    name: "Staff",
  });
  const [zone] = await db
    .insert(shippingZones)
    .values({ name: { ar: "بغداد" }, fee: 5_000 })
    .returning();
  const product = await saveProduct(
    { name: { ar: "حقيبة" }, status: "active", variants: [{ price: 20_000, stockQuantity: 5 }] },
    null,
  );
  const [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id));
  return {
    staff: { id: staff.id, label: staff.email },
    zoneId: zone!.id,
    product,
    variant: variant!,
  };
}

async function order(
  f: Awaited<ReturnType<typeof setup>>,
  opts: {
    qty?: number;
    coupon?: string;
    total?: number;
    name?: string;
    phone?: string;
    email?: string;
  } = {},
) {
  const cart = await createGuestCart();
  await addCartItem(cart.id, f.variant.id, opts.qty ?? 2);
  if (opts.coupon) await setCartCoupon(cart.id, opts.coupon);
  const placed = await placeOrder(
    {
      fullName: opts.name ?? "زينب علي",
      phone: opts.phone ?? "07701234567",
      email: opts.email ?? "zainab@example.com",
      zoneId: f.zoneId,
      city: "الكرادة",
      paymentMethod: "cod",
      idempotencyKey: randomBytes(18).toString("base64url"),
      expectedTotal: opts.total ?? (opts.qty ?? 2) * 20_000 + 5_000,
    },
    { cartId: cart.id, userId: null, locale: "ar", ip: null, userAgent: null },
  );
  return placed;
}

const stock = async (variantId: string) =>
  (await db.select().from(productVariants).where(eq(productVariants.id, variantId)))[0]!
    .stockQuantity;

describe("order workflow (admin)", () => {
  beforeEach(resetDatabase);

  it("moves an order through its lifecycle, timestamps it and emails the customer", async () => {
    const f = await setup();
    const placed = await order(f);
    for (const [from, to] of [
      ["pending", "confirmed"],
      ["confirmed", "processing"],
      ["processing", "shipped"],
      ["shipped", "delivered"],
    ] as const)
      await updateOrderStatus({ orderId: placed.orderId, from, to }, f.staff);

    const [row] = await db.select().from(orders).where(eq(orders.id, placed.orderId));
    expect(row).toMatchObject({ status: "delivered", paymentStatus: "paid" }); // COD collected on delivery
    expect(row!.confirmedAt && row!.shippedAt && row!.deliveredAt).toBeTruthy();

    const customerView = await getOrderByAccessToken(placed.accessToken);
    expect(customerView!.events.map((e) => e.toStatus)).toEqual([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ]);
    const emails = await db
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.template, "order_status"));
    expect(emails).toHaveLength(4);

    const admin = await getOrderAdmin(placed.orderNumber);
    expect(admin!.timeline.at(-1)).toMatchObject({
      type: "status_changed",
      toStatus: "delivered",
      actorLabel: "Staff",
    });
  });

  it("refuses moves that skip the rules or act on a stale view", async () => {
    const f = await setup();
    const placed = await order(f);
    await expect(
      updateOrderStatus({ orderId: placed.orderId, from: "pending", to: "delivered" }, f.staff),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      updateOrderStatus({ orderId: placed.orderId, from: "confirmed", to: "shipped" }, f.staff),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      details: { current: "pending" },
    });
    await expect(
      updateOrderStatus({ orderId: placed.orderId, from: "pending", to: "cancelled" }, f.staff),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      details: { field: "reason" },
    });
  });

  it("cancelling restocks the items, undoes sales counters and frees the coupon", async () => {
    const f = await setup();
    await db.insert(coupons).values({
      code: "ONCE",
      type: "fixed_amount",
      value: 5_000,
      usageLimit: 1,
      usageLimitPerCustomer: 1,
    });
    const placed = await order(f, { qty: 5, coupon: "ONCE", total: 100_000 });
    expect(await stock(f.variant.id)).toBe(0);
    expect(
      (await db.select().from(products).where(eq(products.id, f.product.id)))[0]!.inStock,
    ).toBe(false);

    const { restocked } = await updateOrderStatus(
      { orderId: placed.orderId, from: "pending", to: "cancelled", reason: "طلب الزبون الإلغاء" },
      f.staff,
    );
    expect(restocked).toBe(true);
    expect(await stock(f.variant.id)).toBe(5);
    const [product] = await db.select().from(products).where(eq(products.id, f.product.id));
    expect(product).toMatchObject({ inStock: true, salesCount: 0 });
    expect((await db.select().from(coupons))[0]!.usedCount).toBe(0);
    expect(await db.$count(couponRedemptions)).toBe(0);
    const [movement] = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.reason, "order_cancelled"));
    expect(movement).toMatchObject({ delta: 5, stockAfter: 5, actorId: f.staff.id });
    const [row] = await db.select().from(orders).where(eq(orders.id, placed.orderId));
    expect(row).toMatchObject({ status: "cancelled", cancelReason: "طلب الزبون الإلغاء" });

    // The freed coupon can be used again by the same customer.
    const again = await order(f, { qty: 1, coupon: "ONCE", total: 20_000 });
    expect((await getOrderByAccessToken(again.accessToken))!.discountTotal).toBe(5_000);
    // Cancelled orders are final.
    await expect(
      updateOrderStatus({ orderId: placed.orderId, from: "cancelled", to: "confirmed" }, f.staff),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("returns after delivery put stock back but keep the coupon used", async () => {
    const f = await setup();
    const placed = await order(f, { qty: 1, total: 25_000 });
    for (const [from, to] of [
      ["pending", "confirmed"],
      ["confirmed", "shipped"],
      ["shipped", "delivered"],
      ["delivered", "returned"],
    ] as const)
      await updateOrderStatus({ orderId: placed.orderId, from, to }, f.staff);
    expect(await stock(f.variant.id)).toBe(5);
    const [movement] = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.reason, "return"));
    expect(movement?.delta).toBe(1);
  });

  it("tracks payments, notes and the internal note", async () => {
    const f = await setup();
    const placed = await order(f, { qty: 1, total: 25_000 });
    await updatePaymentStatus({ orderId: placed.orderId, from: "unpaid", to: "paid" }, f.staff);
    await expect(
      updatePaymentStatus({ orderId: placed.orderId, from: "unpaid", to: "paid" }, f.staff),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await addOrderNote(
      { orderId: placed.orderId, message: "اتصلنا بالزبون", customerVisible: false },
      f.staff,
    );
    await addOrderNote(
      { orderId: placed.orderId, message: "سيصلك الطلب غداً", customerVisible: true },
      f.staff,
    );
    await setInternalNote(placed.orderId, "زبون مميز", f.staff);

    const admin = await getOrderAdmin(placed.orderNumber);
    expect(admin).toMatchObject({ paymentStatus: "paid", internalNote: "زبون مميز" });
    expect(admin!.timeline.map((e) => e.type)).toEqual([
      "placed",
      "payment_status_changed",
      "note",
      "note",
    ]);
    const customer = await getOrderByAccessToken(placed.accessToken);
    expect(customer!.events.map((e) => e.message).filter(Boolean)).toEqual(["سيصلك الطلب غداً"]);
  });

  it("lists orders with status tabs and finds them by number, phone or name", async () => {
    const f = await setup();
    const a = await order(f, { qty: 1, total: 25_000, name: "زينب علي", phone: "07701111111" });
    const b = await order(f, { qty: 1, total: 25_000, name: "محمد حسن", phone: "07702222222" });
    await updateOrderStatus(
      { orderId: b.orderId, from: "pending", to: "cancelled", reason: "مكرر" },
      f.staff,
    );

    const all = await listOrdersAdmin({});
    expect(all).toMatchObject({ total: 2, counts: { pending: 1, cancelled: 1 } });
    expect((await listOrdersAdmin({ status: "open" })).items.map((o) => o.orderNumber)).toEqual([
      a.orderNumber,
    ]);
    expect(
      (await listOrdersAdmin({ q: `#${b.orderNumber}` })).items.map((o) => o.orderNumber),
    ).toEqual([b.orderNumber]);
    expect(
      (await listOrdersAdmin({ q: "+964 770 111 1111" })).items.map((o) => o.orderNumber),
    ).toEqual([a.orderNumber]);
    expect((await listOrdersAdmin({ q: "محمد" })).items.map((o) => o.orderNumber)).toEqual([
      b.orderNumber,
    ]);
    expect((await listOrdersAdmin({ q: "%" })).total).toBe(0);
    expect(all.items[0]).toMatchObject({ itemCount: 1, city: "الكرادة" });
  });
});
