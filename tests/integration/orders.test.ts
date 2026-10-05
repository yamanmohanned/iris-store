import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import {
  addresses,
  coupons,
  inventoryMovements,
  orderItems,
  orders,
  outboxMessages,
  products,
  productVariants,
  shippingZones,
} from "@/server/db/schema";
import { testMailbox } from "@/server/email";
import { addCartItem, createGuestCart, getCartView, setCartCoupon } from "@/server/services/cart";
import { newOptionValueId, saveProduct } from "@/server/services/catalog-admin";
import {
  findOrderTokenForTracking,
  getOrderByAccessToken,
  getOrderForUser,
  hashAccessToken,
  listOrdersForUser,
  placeOrder,
  type CheckoutInput,
} from "@/server/services/orders";
import { processOutbox } from "@/server/services/outbox";
import { updateSetting } from "@/server/services/settings";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

const key = () => randomBytes(18).toString("base64url");

async function setup() {
  const [baghdad] = await db
    .insert(shippingZones)
    .values({ name: { ar: "بغداد", en: "Baghdad" }, fee: 5_000, minDays: 1, maxDays: 2 })
    .returning();
  const [remote] = await db
    .insert(shippingZones)
    .values({ name: { ar: "حلبجة" }, fee: 9_000, codAvailable: false })
    .returning();
  const [closed] = await db
    .insert(shippingZones)
    .values({ name: { ar: "مغلقة" }, fee: 1_000, isActive: false })
    .returning();
  const s = newOptionValueId();
  const dress = await saveProduct(
    {
      name: { ar: "فستان", en: "Dress" },
      status: "active",
      options: [{ name: { ar: "المقاس", en: "Size" }, values: [{ id: s, label: { ar: "S" } }] }],
      variants: [
        {
          optionValueIds: [s],
          price: 30_000,
          compareAtPrice: 40_000,
          stockQuantity: 3,
          sku: "DR-S",
        },
      ],
    },
    null,
  );
  const [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, dress.id));
  return { baghdad: baghdad!, remote: remote!, closed: closed!, dress, variant: variant! };
}

function input(
  zoneId: string,
  expectedTotal: number,
  extra: Partial<CheckoutInput> = {},
): CheckoutInput {
  return {
    fullName: "زينب علي",
    phone: "0770 123 4567",
    email: "zainab@example.com",
    zoneId,
    city: "الكرادة",
    area: "شارع 62",
    landmark: "قرب جامع",
    paymentMethod: "cod",
    idempotencyKey: key(),
    expectedTotal,
    ...extra,
  };
}

const ctx = (cartId: string, userId: string | null = null) => ({
  cartId,
  userId,
  locale: "ar",
  ip: "203.0.113.5",
  userAgent: "vitest",
});

describe("placing orders", () => {
  beforeEach(async () => {
    await resetDatabase();
    testMailbox.length = 0;
  });

  it("creates the order, takes stock, applies the coupon and empties the cart", async () => {
    const f = await setup();
    await updateSetting("notifications", { adminEmails: ["owner@example.com"] }, null);
    await db.insert(coupons).values({ code: "TEN", type: "percentage", value: 10 });
    const cart = await createGuestCart();
    await addCartItem(cart.id, f.variant.id, 2);
    await setCartCoupon(cart.id, "TEN");

    // 60,000 − 10% (6,000) + 5,000 delivery
    const placed = await placeOrder(input(f.baghdad.id, 59_000), ctx(cart.id));
    expect(placed).toMatchObject({ orderNumber: 10001, replayed: false });

    const order = await getOrderByAccessToken(placed.accessToken);
    expect(order).toMatchObject({
      status: "pending",
      paymentMethod: "cod",
      customerPhone: "+9647701234567",
      subtotal: 60_000,
      discountTotal: 6_000,
      shippingTotal: 5_000,
      grandTotal: 59_000,
      couponCode: "TEN",
    });
    expect(order!.items[0]).toMatchObject({
      quantity: 2,
      unitPrice: 30_000,
      lineTotal: 60_000,
      variantLabel: { ar: "المقاس: S", en: "Size: S" },
    });
    expect(order!.shippingAddress).toMatchObject({
      city: "الكرادة",
      zoneName: { ar: "بغداد", en: "Baghdad" },
    });
    expect(order!.events.map((e) => e.type)).toEqual(["placed"]);

    // Only the token's hash is stored.
    const [row] = await db.select().from(orders);
    expect(row!.accessTokenHash).toBe(hashAccessToken(placed.accessToken));
    expect(row!.accessTokenHash).not.toContain(placed.accessToken);

    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, f.variant.id));
    expect(variant!.stockQuantity).toBe(1);
    const [movement] = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.reason, "order_placed"));
    expect(movement).toMatchObject({ delta: -2, stockAfter: 1, orderId: placed.orderId });
    const [product] = await db.select().from(products).where(eq(products.id, f.dress.id));
    expect(product!.salesCount).toBe(2);
    expect((await db.select().from(coupons))[0]!.usedCount).toBe(1);

    const view = await getCartView(cart.id);
    expect(view).toMatchObject({ lines: [], couponCode: null });

    const outbox = await db.select().from(outboxMessages);
    expect(outbox.map((m) => [m.template, m.recipient]).sort()).toEqual(
      [
        ["admin_low_stock", "owner@example.com"],
        ["admin_new_order", "owner@example.com"],
        ["order_placed", "zainab@example.com"],
      ].sort(),
    );
  });

  it("returns the same order for a repeated submit (double tap, retried request)", async () => {
    const f = await setup();
    const cart = await createGuestCart();
    await addCartItem(cart.id, f.variant.id, 1);
    const same = input(f.baghdad.id, 35_000);
    const first = await placeOrder(same, ctx(cart.id));
    const second = await placeOrder(same, ctx(cart.id));
    expect(second).toEqual({ ...first, replayed: true });
    expect(await db.$count(orders)).toBe(1);
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, f.variant.id));
    expect(variant!.stockQuantity).toBe(2);
  });

  it("never sells the last unit twice, even when two customers check out at the same moment", async () => {
    const f = await setup();
    await db
      .update(productVariants)
      .set({ stockQuantity: 1 })
      .where(eq(productVariants.id, f.variant.id));
    const a = await createGuestCart();
    const b = await createGuestCart();
    await addCartItem(a.id, f.variant.id, 1);
    await addCartItem(b.id, f.variant.id, 1);
    const results = await Promise.allSettled([
      placeOrder(input(f.baghdad.id, 35_000, { phone: "07701111111" }), ctx(a.id)),
      placeOrder(input(f.baghdad.id, 35_000, { phone: "07702222222" }), ctx(b.id)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "OUT_OF_STOCK" });
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, f.variant.id));
    expect(variant!.stockQuantity).toBe(0);
    const [product] = await db.select().from(products).where(eq(products.id, f.dress.id));
    expect(product!.inStock).toBe(false);
  });

  it("refuses to charge a total the customer did not see, and writes nothing", async () => {
    const f = await setup();
    const cart = await createGuestCart();
    await addCartItem(cart.id, f.variant.id, 1);
    await db
      .update(productVariants)
      .set({ price: 32_000 })
      .where(eq(productVariants.id, f.variant.id));
    await expect(placeOrder(input(f.baghdad.id, 35_000), ctx(cart.id))).rejects.toMatchObject({
      code: "CONFLICT",
      details: { priceChanged: true, total: 37_000 },
    });
    expect(await db.$count(orders)).toBe(0);
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, f.variant.id));
    expect(variant!.stockQuantity).toBe(3);
  });

  it("enforces a coupon's once-per-customer rule by phone number, whatever its format", async () => {
    const f = await setup();
    await db
      .insert(coupons)
      .values({ code: "ONCE", type: "fixed_amount", value: 5_000, usageLimitPerCustomer: 1 });
    const first = await createGuestCart();
    await addCartItem(first.id, f.variant.id, 1);
    await setCartCoupon(first.id, "ONCE");
    await placeOrder(input(f.baghdad.id, 30_000), ctx(first.id));

    const second = await createGuestCart();
    await addCartItem(second.id, f.variant.id, 1);
    await setCartCoupon(second.id, "ONCE");
    await expect(
      placeOrder(input(f.baghdad.id, 30_000, { phone: "+964 770 123 4567" }), ctx(second.id)),
    ).rejects.toMatchObject({
      code: "INVALID_COUPON",
      details: { issue: "already_used", code: "ONCE", total: 35_000 },
    });
    // Confirming the total without the discount goes through.
    const placed = await placeOrder(
      input(f.baghdad.id, 35_000, { phone: "+964 770 123 4567" }),
      ctx(second.id),
    );
    expect((await getOrderByAccessToken(placed.accessToken))?.discountTotal).toBe(0);
    expect((await db.select().from(coupons))[0]!.usedCount).toBe(1);
  });

  it("validates phone, delivery area, payment method, minimum order and guest checkout", async () => {
    const f = await setup();
    const cart = await createGuestCart();
    await addCartItem(cart.id, f.variant.id, 1);
    const place = (extra: Partial<CheckoutInput>, zone = f.baghdad.id, total = 35_000) =>
      placeOrder(input(zone, total, extra), ctx(cart.id));

    // Right length, but not an Iraqi mobile number (07…).
    await expect(place({ phone: "0670 123 4567" })).rejects.toMatchObject({
      code: "VALIDATION",
      details: { field: "phone" },
    });
    await expect(place({}, f.closed.id, 31_000)).rejects.toMatchObject({
      code: "VALIDATION",
      details: { field: "zoneId" },
    });
    await expect(place({}, f.remote.id, 39_000)).rejects.toMatchObject({
      code: "VALIDATION",
      details: { field: "paymentMethod" },
    });
    await expect(place({ paymentMethod: "bank_transfer" })).rejects.toMatchObject({
      code: "VALIDATION",
      details: { field: "paymentMethod" },
    });
    await expect(place({ fullName: "" })).rejects.toThrow();

    await updateSetting("checkout", { minOrderAmount: 50_000 }, null);
    await expect(place({})).rejects.toMatchObject({
      code: "VALIDATION",
      details: { minOrder: 50_000 },
    });
    await updateSetting("checkout", { minOrderAmount: 0, guestCheckout: false }, null);
    await expect(place({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    // Bank transfer works once enabled, also where cash on delivery is not offered.
    await updateSetting(
      "checkout",
      { guestCheckout: true, bankTransfer: { enabled: true, instructions: { ar: "حساب 123" } } },
      null,
    );
    const placed = await place({ paymentMethod: "bank_transfer" }, f.remote.id, 39_000);
    expect((await getOrderByAccessToken(placed.accessToken))?.paymentMethod).toBe("bank_transfer");
  });

  it("finds an order for tracking only with the matching phone", async () => {
    const f = await setup();
    const cart = await createGuestCart();
    await addCartItem(cart.id, f.variant.id, 1);
    const placed = await placeOrder(input(f.baghdad.id, 35_000), ctx(cart.id));
    expect(await findOrderTokenForTracking(placed.orderNumber, "٠٧٧٠١٢٣٤٥٦٧")).toBe(
      placed.accessToken,
    );
    expect(await findOrderTokenForTracking(placed.orderNumber, "07709999999")).toBeNull();
    expect(await findOrderTokenForTracking(placed.orderNumber + 1, "07701234567")).toBeNull();
    expect(await getOrderByAccessToken("x".repeat(43))).toBeNull();
  });

  it("links orders to the account, saves the address once and keeps orders private", async () => {
    const f = await setup();
    const user = await createVerifiedUser({
      email: "buyer@example.com",
      password: "Calm-River-Stone-2026",
    });
    const other = await createVerifiedUser({
      email: "other@example.com",
      password: "Calm-River-Stone-2026",
    });
    for (let i = 0; i < 2; i++) {
      const cart = await createGuestCart();
      await addCartItem(cart.id, f.variant.id, 1);
      await placeOrder(input(f.baghdad.id, 35_000, { saveAddress: true }), ctx(cart.id, user.id));
    }
    const saved = await db.select().from(addresses).where(eq(addresses.userId, user.id));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ isDefault: true, phone: "+9647701234567", city: "الكرادة" });

    const list = await listOrdersForUser(user.id);
    expect(list.items.map((o) => o.orderNumber)).toEqual([10002, 10001]);
    expect(list.items[0]).toMatchObject({ itemCount: 1, status: "pending" });
    expect(await getOrderForUser(user.id, 10001)).not.toBeNull();
    expect(await getOrderForUser(other.id, 10001)).toBeNull();
  });
});

describe("notification outbox", () => {
  beforeEach(async () => {
    await resetDatabase();
    testMailbox.length = 0;
  });

  it("emails the order confirmation with a working link, once", async () => {
    const f = await setup();
    const cart = await createGuestCart();
    await addCartItem(cart.id, f.variant.id, 1);
    const placed = await placeOrder(input(f.baghdad.id, 35_000), ctx(cart.id));
    expect(await processOutbox()).toEqual({ sent: 1, failed: 0 });
    expect(await processOutbox()).toEqual({ sent: 0, failed: 0 });

    const mail = testMailbox.find((m) => m.to === "zainab@example.com")!;
    expect(mail.subject).toContain("10001");
    expect(mail.html).toContain(`/order/${placed.accessToken}`);
    expect(mail.html).toContain("35,000");
    const [msg] = await db.select().from(outboxMessages);
    expect(msg).toMatchObject({ status: "sent", attempts: 1 });
  });

  it("parks messages it can never send and schedules retries for the rest", async () => {
    await db.insert(outboxMessages).values([
      { channel: "sms", recipient: "+9647700000000", template: "order_placed", payload: {} },
      { channel: "email", recipient: "a@example.com", template: "nope", payload: {} },
    ]);
    expect(await processOutbox()).toEqual({ sent: 0, failed: 2 });
    const rows = await db.select().from(outboxMessages);
    expect(rows.every((r) => r.status === "failed" && r.lastError)).toBe(true);
    expect(await db.$count(orderItems)).toBe(0);
  });
});
