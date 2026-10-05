import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { products, shippingZones } from "@/server/db/schema";
import {
  deleteAddress,
  listAddresses,
  MAX_ADDRESSES,
  saveAddress,
  setDefaultAddress,
} from "@/server/services/addresses";
import { saveProduct } from "@/server/services/catalog-admin";
import { isInWishlist, listWishlist, toggleWishlist } from "@/server/services/wishlist";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

async function users() {
  const a = await createVerifiedUser({ email: "a@example.com", password: "Calm-River-Stone-2026" });
  const b = await createVerifiedUser({ email: "b@example.com", password: "Calm-River-Stone-2026" });
  const [zone] = await db
    .insert(shippingZones)
    .values({ name: { ar: "بغداد" }, fee: 5_000 })
    .returning();
  return { a, b, zoneId: zone!.id };
}

const address = (zoneId: string, extra: Record<string, unknown> = {}) => ({
  fullName: "زينب علي",
  phone: "07701234567",
  zoneId,
  city: "الكرادة",
  ...extra,
});

describe("address book", () => {
  beforeEach(resetDatabase);

  it("makes the first address the default and keeps exactly one default", async () => {
    const { a, zoneId } = await users();
    const home = await saveAddress(a.id, address(zoneId, { label: "البيت" }));
    expect(home).toMatchObject({ isDefault: true, phone: "+9647701234567" });
    const work = await saveAddress(a.id, address(zoneId, { label: "العمل", isDefault: true }));
    let list = await listAddresses(a.id);
    expect(list.filter((x) => x.isDefault).map((x) => x.id)).toEqual([work.id]);

    await setDefaultAddress(a.id, home.id);
    list = await listAddresses(a.id);
    expect(list[0]).toMatchObject({ id: home.id, isDefault: true });

    // Deleting the default hands it to the remaining address.
    await deleteAddress(a.id, home.id);
    expect(await listAddresses(a.id)).toEqual([
      expect.objectContaining({ id: work.id, isDefault: true }),
    ]);
  });

  it("never lets one customer read or change another customer's address", async () => {
    const { a, b, zoneId } = await users();
    const mine = await saveAddress(a.id, address(zoneId));
    await expect(
      saveAddress(b.id, address(zoneId, { city: "مخترق" }), mine.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(setDefaultAddress(b.id, mine.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await deleteAddress(b.id, mine.id);
    expect(await listAddresses(a.id)).toHaveLength(1);
    expect(await listAddresses(b.id)).toEqual([]);
  });

  it("validates the phone and caps the number of addresses", async () => {
    const { a, zoneId } = await users();
    await expect(saveAddress(a.id, address(zoneId, { phone: "0612345678" }))).rejects.toMatchObject(
      { code: "VALIDATION", details: { field: "phone" } },
    );
    for (let i = 0; i < MAX_ADDRESSES; i++)
      await saveAddress(a.id, address(zoneId, { label: `#${i}` }));
    await expect(saveAddress(a.id, address(zoneId))).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("wishlist", () => {
  beforeEach(resetDatabase);

  it("toggles, lists newest first and hides products that are no longer sold", async () => {
    const { a, b } = await users();
    const first = await saveProduct(
      { name: { ar: "أول" }, status: "active", variants: [{ price: 1_000, stockQuantity: 1 }] },
      null,
    );
    const second = await saveProduct(
      { name: { ar: "ثاني" }, status: "active", variants: [{ price: 2_000, stockQuantity: 1 }] },
      null,
    );
    const draft = await saveProduct(
      { name: { ar: "مسودة" }, status: "draft", variants: [{ price: 1, stockQuantity: 1 }] },
      null,
    );

    expect(await toggleWishlist(a.id, first.id)).toBe(true);
    expect(await toggleWishlist(a.id, second.id)).toBe(true);
    await expect(toggleWishlist(a.id, draft.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await listWishlist(a.id)).map((p) => p.id)).toEqual([second.id, first.id]);
    expect(await isInWishlist(b.id, first.id)).toBe(false);

    expect(await toggleWishlist(a.id, second.id)).toBe(false);
    await db.update(products).set({ status: "archived" }).where(eq(products.id, first.id));
    expect(await listWishlist(a.id)).toEqual([]);
  });
});
