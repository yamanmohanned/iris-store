import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { productVariants, shippingZones } from "@/server/db/schema";
import { updateOrderStatus } from "@/server/services/admin-orders";
import { addCartItem, createGuestCart } from "@/server/services/cart";
import { newOptionValueId, saveProduct } from "@/server/services/catalog-admin";
import { placeOrder } from "@/server/services/orders";
import { dashboardStats } from "@/server/services/reports";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

describe("dashboard stats", () => {
  beforeEach(resetDatabase);

  it("counts today's sales (not cancelled ones), work to do, top products and low stock", async () => {
    const [zone] = await db
      .insert(shippingZones)
      .values({ name: { ar: "بغداد" }, fee: 5_000 })
      .returning();
    const m = newOptionValueId();
    const shirt = await saveProduct(
      {
        name: { ar: "قميص" },
        status: "active",
        options: [{ name: { ar: "المقاس" }, values: [{ id: m, label: { ar: "M" } }] }],
        variants: [{ optionValueIds: [m], price: 10_000, stockQuantity: 4 }],
      },
      null,
    );
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, shirt.id));
    const buy = async (qty: number) => {
      const cart = await createGuestCart();
      await addCartItem(cart.id, variant!.id, qty);
      return placeOrder(
        {
          fullName: "زبون",
          phone: `0770${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`,
          zoneId: zone!.id,
          city: "بغداد",
          paymentMethod: "cod",
          idempotencyKey: randomBytes(18).toString("base64url"),
          expectedTotal: qty * 10_000 + 5_000,
        },
        { cartId: cart.id, userId: null, locale: "ar", ip: null, userAgent: null },
      );
    };
    const kept = await buy(2);
    const dropped = await buy(1);
    const staff = await createVerifiedUser({
      email: "staff@example.com",
      password: "Calm-River-Stone-2026",
      role: "admin",
    });
    await updateOrderStatus(
      { orderId: kept.orderId, from: "pending", to: "confirmed" },
      { id: staff.id },
    );
    await updateOrderStatus(
      { orderId: dropped.orderId, from: "pending", to: "cancelled", reason: "test" },
      { id: staff.id },
    );

    const s = await dashboardStats();
    expect(s).toMatchObject({
      ordersToday: 1,
      revenueToday: 25_000,
      orders7d: 1,
      pending: 0,
      toShip: 1,
    });
    expect(s.daily).toHaveLength(14);
    expect(s.daily.at(-1)).toMatchObject({ orders: 1, revenue: 25_000 });
    expect(s.topProducts[0]).toMatchObject({ name: { ar: "قميص" }, units: 2, revenue: 20_000 });
    // 4 − 2 = 2 left (≤ default threshold 3) → low stock, with its option label.
    expect(s.lowStock).toEqual([
      { productId: shirt.id, name: { ar: "قميص" }, options: ["M"], stock: 2 },
    ]);
    expect(s.lowStockCount).toBe(1);
  });
});
