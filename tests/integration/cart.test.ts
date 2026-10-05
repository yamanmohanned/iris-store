import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { carts, coupons, productVariants, products } from "@/server/db/schema";
import {
  addCartItem,
  createGuestCart,
  findGuestCartId,
  findUserCartId,
  getCartView,
  getOrCreateUserCart,
  loadCartLines,
  mergeGuestCart,
  setCartCoupon,
  updateCartItem,
} from "@/server/services/cart";
import { newOptionValueId, saveProduct } from "@/server/services/catalog-admin";
import { priceCart } from "@/server/services/checkout";
import {
  claimCouponUse,
  couponStaticIssue,
  findCoupon,
  normalizeCouponCode,
} from "@/server/services/coupons";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

async function fixtures() {
  const s = newOptionValueId();
  const m = newOptionValueId();
  const shirt = await saveProduct(
    {
      name: { ar: "قميص", en: "Shirt" },
      status: "active",
      options: [
        {
          name: { ar: "المقاس", en: "Size" },
          values: [
            { id: s, label: { ar: "S" } },
            { id: m, label: { ar: "M" } },
          ],
        },
      ],
      variants: [
        { optionValueIds: [s], price: 20_000, stockQuantity: 3 },
        { optionValueIds: [m], price: 22_000, stockQuantity: 0 },
      ],
    },
    null,
  );
  const mug = await saveProduct(
    {
      name: { ar: "كوب" },
      status: "active",
      variants: [{ price: 5_000, stockQuantity: 50, trackInventory: false }],
    },
    null,
  );
  const variants = await db.select().from(productVariants);
  const small = variants.find((v) => v.productId === shirt.id && v.price === 20_000)!;
  const medium = variants.find((v) => v.productId === shirt.id && v.price === 22_000)!;
  const mugVariant = variants.find((v) => v.productId === mug.id)!;
  return { shirt, mug, small, medium, mugVariant };
}

describe("cart", () => {
  beforeEach(resetDatabase);

  it("caps quantities by stock and refuses what cannot be sold", async () => {
    const f = await fixtures();
    const { id } = await createGuestCart();
    expect(await addCartItem(id, f.small.id, 2)).toEqual({ quantity: 2, limited: false });
    expect(await addCartItem(id, f.small.id, 5)).toEqual({ quantity: 3, limited: true });
    await expect(addCartItem(id, f.small.id, 1)).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    await expect(addCartItem(id, f.medium.id, 1)).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    // Untracked inventory: capped only by the per-line maximum.
    expect((await addCartItem(id, f.mugVariant.id, 99)).quantity).toBe(99);
    await db.update(products).set({ status: "draft" }).where(eq(products.id, f.mug.id));
    await expect(addCartItem(id, f.mugVariant.id, 1)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(addCartItem(id, f.small.id, 0)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("updates and removes only lines of the same cart", async () => {
    const f = await fixtures();
    const mine = await createGuestCart();
    const other = await createGuestCart();
    await addCartItem(mine.id, f.small.id, 1);
    const [line] = await loadCartLines(mine.id);
    expect(await updateCartItem(mine.id, line!.id, 10)).toEqual({ quantity: 3, limited: true });
    await expect(updateCartItem(other.id, line!.id, 1)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await updateCartItem(mine.id, line!.id, 0);
    expect(await loadCartLines(mine.id)).toEqual([]);
  });

  it("shows live prices, variant labels and availability problems", async () => {
    const f = await fixtures();
    const { id } = await createGuestCart();
    await addCartItem(id, f.small.id, 3);
    await addCartItem(id, f.mugVariant.id, 2);
    // Later: the price changes and stock drops below the cart quantity.
    await db
      .update(productVariants)
      .set({ price: 18_000, stockQuantity: 1 })
      .where(eq(productVariants.id, f.small.id));

    const view = (await getCartView(id))!;
    const shirt = view.lines.find((l) => l.variantId === f.small.id)!;
    expect(shirt).toMatchObject({
      unitPrice: 18_000,
      quantity: 3,
      maxQuantity: 1,
      issue: "insufficient_stock",
      lineTotal: 54_000,
    });
    expect(shirt.variantLabel).toEqual({ ar: "المقاس: S", en: "Size: S" });
    expect(view.itemCount).toBe(2); // only lines without problems count as buyable

    await db.update(products).set({ status: "archived" }).where(eq(products.id, f.shirt.id));
    const after = (await getCartView(id))!;
    expect(after.lines.find((l) => l.variantId === f.small.id)).toMatchObject({
      issue: "unavailable",
      maxQuantity: 0,
    });
  });

  it("moves a guest cart into the account after sign-in, merging with an existing one", async () => {
    const f = await fixtures();
    const user = await createVerifiedUser({
      email: "buyer@example.com",
      password: "Calm-River-Stone-2026",
    });

    // 1) No account cart yet: the guest cart is claimed and its cookie token stops working.
    const guest = await createGuestCart();
    await addCartItem(guest.id, f.small.id, 1);
    await mergeGuestCart(guest.id, user.id);
    expect(await findUserCartId(user.id)).toBe(guest.id);
    expect(await findGuestCartId(guest.token)).toBeNull();

    // 2) Account cart exists: lines are merged (quantities added, capped later by stock) and the guest cart is removed.
    await setCartCoupon(guest.id, "KEEPME");
    const second = await createGuestCart();
    await addCartItem(second.id, f.small.id, 1);
    await addCartItem(second.id, f.mugVariant.id, 2);
    await setCartCoupon(second.id, "OTHER");
    await mergeGuestCart(second.id, user.id);
    await mergeGuestCart(second.id, user.id); // idempotent
    const view = (await getCartView(guest.id))!;
    expect(view.lines.map((l) => [l.variantId, l.quantity]).sort()).toEqual(
      [
        [f.small.id, 2],
        [f.mugVariant.id, 2],
      ].sort(),
    );
    expect(view.couponCode).toBe("KEEPME");
    expect(await db.$count(carts)).toBe(1);
    expect(await getOrCreateUserCart(user.id)).toBe(guest.id);
  });
});

describe("coupons", () => {
  beforeEach(resetDatabase);

  async function coupon(values: Partial<typeof coupons.$inferInsert> & { code: string }) {
    const [row] = await db
      .insert(coupons)
      .values({ type: "percentage", value: 10, ...values })
      .returning();
    return row!;
  }

  it("normalizes codes typed on phones", () => {
    expect(normalizeCouponCode(" welcome 10 ")).toBe("WELCOME10");
    expect(normalizeCouponCode("عيد٢٠")).toBe("عيد20");
    expect(normalizeCouponCode("bad code!")).toBeNull();
    expect(normalizeCouponCode("x")).toBeNull();
  });

  it("reports why a code cannot be used", async () => {
    const day = 24 * 60 * 60 * 1000;
    expect(couponStaticIssue(await coupon({ code: "OFF", isActive: false }))).toBe("inactive");
    expect(
      couponStaticIssue(await coupon({ code: "SOON", startsAt: new Date(Date.now() + day) })),
    ).toBe("not_started");
    expect(
      couponStaticIssue(await coupon({ code: "OLD", endsAt: new Date(Date.now() - day) })),
    ).toBe("expired");
    expect(couponStaticIssue(await coupon({ code: "FULL", usageLimit: 1, usedCount: 1 }))).toBe(
      "used_up",
    );
    expect(couponStaticIssue(await coupon({ code: "OK" }))).toBeNull();
    expect(await findCoupon("ok")).toMatchObject({ code: "OK" });
  });

  it("lets only one of many simultaneous orders take the last use", async () => {
    const c = await coupon({ code: "LAST", usageLimit: 1 });
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        db.transaction((tx) => claimCouponUse(tx, c, { phone: `+96477000000${i}` })),
      ),
    );
    expect(results.filter((issue) => issue === null)).toHaveLength(1);
    expect(results.filter((issue) => issue === "used_up")).toHaveLength(5);
    expect((await findCoupon("LAST"))!.usedCount).toBe(1);
  });

  it("applies a code in the cart only when the minimum is reached", async () => {
    const f = await fixtures();
    await coupon({ code: "BIG", minSubtotal: 50_000 });
    const { id } = await createGuestCart();
    await addCartItem(id, f.small.id, 1);
    await setCartCoupon(id, "BIG");
    const low = await priceCart((await getCartView(id))!);
    expect(low.coupon).toMatchObject({ code: "BIG", issue: "min_subtotal" });
    expect(low.totals.discount).toBe(0);

    await addCartItem(id, f.mugVariant.id, 6);
    const high = await priceCart((await getCartView(id))!);
    expect(high.coupon?.issue).toBeNull();
    expect(high.totals).toMatchObject({ subtotal: 50_000, discount: 5_000, total: 45_000 });
  });
});
