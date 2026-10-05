import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { auditLogs, coupons, orders, productVariants, products, users } from "@/server/db/schema";
import { pgErrorOf, resetDatabase } from "@tests/support/db";

async function createProduct() {
  const [product] = await db
    .insert(products)
    .values({ slug: `p-${crypto.randomUUID()}`, name: { ar: "منتج", en: "Product" } })
    .returning();
  return product!;
}

describe("database schema guarantees", () => {
  beforeEach(resetDatabase);

  it("requires lowercase emails and valid roles", async () => {
    await expect(
      db.insert(users).values({ name: "A", email: "Upper@Example.com" }),
    ).rejects.toThrow();
    await expect(
      db.insert(users).values({ name: "A", email: "a@example.com", role: "superuser" as never }),
    ).rejects.toThrow();
    const [u] = await db.insert(users).values({ name: "A", email: "a@example.com" }).returning();
    expect(u!.role).toBe("customer");
  });

  it("never lets stock go negative or compare-at price fall below price", async () => {
    const product = await createProduct();
    await expect(
      db.insert(productVariants).values({ productId: product.id, price: 1000, stockQuantity: -1 }),
    ).rejects.toThrow();
    await expect(
      db
        .insert(productVariants)
        .values({ productId: product.id, price: 1000, compareAtPrice: 900 }),
    ).rejects.toThrow();
    const [v] = await db
      .insert(productVariants)
      .values({ productId: product.id, price: 1000, compareAtPrice: 1500, stockQuantity: 3 })
      .returning();
    // Concurrent-safe conditional decrement: only succeeds while enough stock remains.
    const dec = (qty: number) =>
      db
        .update(productVariants)
        .set({ stockQuantity: sql`${productVariants.stockQuantity} - ${qty}` })
        .where(sql`${productVariants.id} = ${v!.id} and ${productVariants.stockQuantity} >= ${qty}`)
        .returning({ stock: productVariants.stockQuantity });
    expect(await dec(2)).toEqual([{ stock: 1 }]);
    expect(await dec(2)).toEqual([]);
  });

  it("issues sequential human-friendly order numbers starting at 10001", async () => {
    const base = {
      paymentMethod: "cod" as const,
      currency: "IQD",
      locale: "ar",
      customerName: "زبون",
      customerPhone: "+9647700000000",
      shippingAddress: {
        fullName: "زبون",
        phone: "+9647700000000",
        zoneId: null,
        zoneName: { ar: "بغداد" },
        city: "الكرادة",
      },
      subtotal: 1000,
      grandTotal: 1000,
    };
    const [a] = await db
      .insert(orders)
      .values({ ...base, accessTokenHash: "h1", idempotencyKey: "k1" })
      .returning();
    const [b] = await db
      .insert(orders)
      .values({ ...base, accessTokenHash: "h2", idempotencyKey: "k2" })
      .returning();
    expect(a!.orderNumber).toBe(10001);
    expect(b!.orderNumber).toBe(10002);
    // The idempotency key blocks duplicate submissions of the same checkout.
    await expect(
      db.insert(orders).values({ ...base, accessTokenHash: "h3", idempotencyKey: "k1" }),
    ).rejects.toThrow();
  });

  it("validates coupon codes and percentage ranges", async () => {
    await expect(
      db.insert(coupons).values({ code: "lower", type: "fixed_amount", value: 5 }),
    ).rejects.toThrow();
    await expect(
      db.insert(coupons).values({ code: "BIG", type: "percentage", value: 150 }),
    ).rejects.toThrow();
    await db.insert(coupons).values({ code: "SAVE10", type: "percentage", value: 10 });
  });

  it("keeps audit logs append-only", async () => {
    const [log] = await db.insert(auditLogs).values({ action: "test.created" }).returning();
    const updateError = await pgErrorOf(
      db.update(auditLogs).set({ action: "tampered" }).where(eq(auditLogs.id, log!.id)),
    );
    expect(updateError.message).toMatch(/append-only/);
    const deleteError = await pgErrorOf(db.delete(auditLogs).where(eq(auditLogs.id, log!.id)));
    expect(deleteError.message).toMatch(/retention/);
    // The retention job can purge inside a transaction that opts in explicitly.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_retention = 'on'`);
      await tx.delete(auditLogs).where(eq(auditLogs.id, log!.id));
    });
  });

  it("still allows deleting a user referenced by audit logs (actor is nulled)", async () => {
    const [u] = await db.insert(users).values({ name: "B", email: "b@example.com" }).returning();
    await db
      .insert(auditLogs)
      .values({ action: "user.did_something", actorId: u!.id, actorLabel: "b@example.com" });
    await db.delete(users).where(eq(users.id, u!.id));
    const [row] = await db.select().from(auditLogs);
    expect(row!.actorId).toBeNull();
    expect(row!.actorLabel).toBe("b@example.com");
  });
});
