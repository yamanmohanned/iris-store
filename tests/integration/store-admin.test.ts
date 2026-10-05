import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { addDays, dayInZone } from "@/lib/dates";
import { db } from "@/server/db/client";
import { auditLogs, coupons, productVariants } from "@/server/db/schema";
import { addCartItem, createGuestCart, setCartCoupon } from "@/server/services/cart";
import { saveProduct } from "@/server/services/catalog-admin";
import { evaluateCoupon, getShippingZones } from "@/server/services/checkout";
import {
  deleteCoupon,
  listCouponsAdmin,
  saveCoupon,
  setCouponActive,
} from "@/server/services/coupons-admin";
import { placeOrder } from "@/server/services/orders";
import { deleteZone, listZonesAdmin, moveZone, saveZone } from "@/server/services/shipping-admin";
import { resetDatabase } from "@tests/support/db";

const noActor = null;

async function placeWithCoupon(zoneId: string, code: string) {
  const product = await saveProduct(
    { name: { ar: "حقيبة" }, status: "active", variants: [{ price: 20_000, stockQuantity: 5 }] },
    null,
  );
  const [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id));
  const cart = await createGuestCart();
  await addCartItem(cart.id, variant!.id, 1);
  await setCartCoupon(cart.id, code);
  return placeOrder(
    {
      fullName: "زينب علي",
      phone: "07701234567",
      zoneId,
      city: "الكرادة",
      paymentMethod: "cod",
      idempotencyKey: randomBytes(18).toString("base64url"),
      expectedTotal: 20_000 - 2_000 + 4_000,
    },
    { cartId: cart.id, userId: null, locale: "ar", ip: null, userAgent: null },
  );
}

describe("delivery areas (admin)", () => {
  beforeEach(resetDatabase);

  it("adds areas at the end, reorders them and hides them from checkout", async () => {
    const baghdad = await saveZone({ name: { ar: "بغداد", en: " " }, fee: 4_000 }, noActor);
    const basra = await saveZone(
      { name: { ar: "البصرة" }, fee: 7_000, minDays: 2, maxDays: 3, codAvailable: false },
      noActor,
    );
    expect(baghdad.name).toEqual({ ar: "بغداد" }); // blank English dropped
    expect((await listZonesAdmin()).map((z) => z.id)).toEqual([baghdad.id, basra.id]);

    await moveZone(basra.id, "up", noActor);
    await moveZone(basra.id, "up", noActor); // already first: no change
    expect((await listZonesAdmin()).map((z) => z.id)).toEqual([basra.id, baghdad.id]);

    await saveZone({ name: { ar: "البصرة" }, fee: 7_500, isActive: false }, noActor, basra.id);
    expect((await getShippingZones()).map((z) => z.id)).toEqual([baghdad.id]);
    expect((await listZonesAdmin())[0]).toMatchObject({ fee: 7_500, isActive: false });
  });

  it("rejects impossible delivery times and keeps past orders when an area is deleted", async () => {
    await expect(
      saveZone({ name: { ar: "أربيل" }, fee: 5_000, minDays: 4, maxDays: 2 }, noActor),
    ).rejects.toThrow();
    await expect(saveZone({ name: { ar: " " }, fee: 5_000 }, noActor)).rejects.toThrow();

    const zone = await saveZone({ name: { ar: "بغداد" }, fee: 4_000 }, noActor);
    await saveCoupon({ code: "save2000", type: "fixed_amount", value: 2_000 }, noActor);
    const placed = await placeWithCoupon(zone.id, "SAVE2000");
    expect((await listZonesAdmin())[0]!.orderCount).toBe(1);

    await deleteZone(zone.id, noActor);
    expect(await listZonesAdmin()).toEqual([]);
    expect(placed.orderNumber).toBeTruthy();
  });
});

describe("coupons (admin)", () => {
  beforeEach(resetDatabase);

  it("normalizes codes, stores days in the store's time zone and lists their status", async () => {
    const saved = await saveCoupon(
      {
        code: " eid 25 ",
        type: "percentage",
        value: 25,
        maxDiscount: 10_000,
        startsOn: "2026-11-01",
        endsOn: "2026-11-30",
        usageLimit: 100,
      },
      noActor,
    );
    expect(saved.code).toBe("EID25");
    // Default store time zone is Baghdad (UTC+3): the window is [Nov 1 00:00, Dec 1 00:00) local.
    expect(saved.startsAt?.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(saved.endsAt?.toISOString()).toBe("2026-11-30T21:00:00.000Z");

    const [row] = await listCouponsAdmin();
    expect(row).toMatchObject({
      code: "EID25",
      startsOn: "2026-11-01",
      endsOn: "2026-11-30",
      maxDiscount: 10_000,
      usageLimit: 100,
      redemptions: 0,
    });

    // Free shipping ignores a value; fixed amounts never keep a percentage cap.
    const ship = await saveCoupon(
      { code: "SHIP", type: "free_shipping", value: 999, maxDiscount: 5 },
      noActor,
    );
    expect(ship).toMatchObject({ value: 0, maxDiscount: null });
  });

  it("derives scheduled, expired, used up and switched-off states", async () => {
    const today = dayInZone(new Date(), "Asia/Baghdad");
    await saveCoupon(
      { code: "LATER", type: "fixed_amount", value: 1_000, startsOn: addDays(today, 1) },
      noActor,
    );
    await saveCoupon(
      { code: "GONE", type: "fixed_amount", value: 1_000, endsOn: addDays(today, -1) },
      noActor,
    );
    await saveCoupon(
      { code: "TODAY", type: "fixed_amount", value: 1_000, startsOn: today, endsOn: today },
      noActor,
    );
    const once = await saveCoupon(
      { code: "ONCE", type: "fixed_amount", value: 1_000, usageLimit: 1 },
      noActor,
    );
    await db.update(coupons).set({ usedCount: 1 }).where(eq(coupons.id, once.id));
    const off = await saveCoupon({ code: "OFF", type: "percentage", value: 10 }, noActor);
    await setCouponActive(off.id, false, noActor);

    const status = Object.fromEntries((await listCouponsAdmin()).map((c) => [c.code, c.status]));
    expect(status).toEqual({
      LATER: "scheduled",
      GONE: "expired",
      TODAY: "active",
      ONCE: "used_up",
      OFF: "inactive",
    });
    expect((await evaluateCoupon("later")).issue).toBe("not_started");
    expect((await evaluateCoupon("today")).issue).toBeNull();
  });

  it("validates values and keeps codes unique", async () => {
    await expect(
      saveCoupon({ code: "X1", type: "percentage", value: 0 }, noActor),
    ).rejects.toThrow();
    await expect(
      saveCoupon({ code: "X2", type: "percentage", value: 101 }, noActor),
    ).rejects.toThrow();
    await expect(
      saveCoupon({ code: "X3", type: "fixed_amount", value: 0 }, noActor),
    ).rejects.toThrow();
    await expect(saveCoupon({ code: "!", type: "free_shipping" }, noActor)).rejects.toThrow();
    await expect(
      saveCoupon(
        { code: "X4", type: "free_shipping", startsOn: "2026-11-02", endsOn: "2026-11-01" },
        noActor,
      ),
    ).rejects.toThrow();

    const first = await saveCoupon({ code: "SALE", type: "percentage", value: 10 }, noActor);
    await expect(
      saveCoupon({ code: "sale", type: "percentage", value: 20 }, noActor),
    ).rejects.toMatchObject({ code: "CONFLICT", details: { field: "code" } });
    // Saving the same coupon under its own code is fine.
    await saveCoupon({ code: "SALE", type: "percentage", value: 15 }, noActor, first.id);
  });

  it("deletes unused coupons only, reports what used ones gave, and audits changes", async () => {
    const zone = await saveZone({ name: { ar: "بغداد" }, fee: 4_000 }, noActor);
    const unused = await saveCoupon({ code: "UNUSED", type: "free_shipping" }, noActor);
    const used = await saveCoupon(
      { code: "SAVE2000", type: "fixed_amount", value: 2_000 },
      noActor,
    );
    await placeWithCoupon(zone.id, "SAVE2000");

    await expect(deleteCoupon(used.id, noActor)).rejects.toMatchObject({ code: "CONFLICT" });
    await deleteCoupon(unused.id, noActor);
    const rows = await listCouponsAdmin();
    expect(rows.map((c) => c.code)).toEqual(["SAVE2000"]);
    expect(rows[0]).toMatchObject({ usedCount: 1, redemptions: 1, discountTotal: 2_000 });

    const actions = (await db.select({ action: auditLogs.action }).from(auditLogs)).map(
      (a) => a.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining(["coupon.create", "coupon.delete", "shipping_zone.create"]),
    );
  });
});
