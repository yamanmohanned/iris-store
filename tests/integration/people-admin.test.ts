import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { auditLogs, productVariants, sessions, shippingZones, users } from "@/server/db/schema";
import { updateOrderStatus } from "@/server/services/admin-orders";
import { listAuditLogs } from "@/server/services/audit-admin";
import { addCartItem, createGuestCart } from "@/server/services/cart";
import { saveProduct } from "@/server/services/catalog-admin";
import { placeOrder } from "@/server/services/orders";
import {
  assignRole,
  getCustomerAdmin,
  listCustomersAdmin,
  listStaff,
  revokeAllSessions,
  setCustomerSuspended,
} from "@/server/services/people-admin";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

const PASSWORD = "Calm-River-Stone-2026";

async function person(email: string, role = "customer", name = "Customer") {
  const u = await createVerifiedUser({ email, password: PASSWORD, role, name });
  return { id: u.id, label: u.email, role };
}

async function openSession(userId: string) {
  await db.insert(sessions).values({
    userId,
    token: randomBytes(16).toString("hex"),
    expiresAt: new Date(Date.now() + 86_400_000),
  });
}

async function buy(userId: string, qty: number) {
  const [zone] = await db
    .insert(shippingZones)
    .values({ name: { ar: "بغداد" }, fee: 5_000 })
    .returning();
  const product = await saveProduct(
    {
      name: { ar: `حقيبة ${randomBytes(3).toString("hex")}` },
      status: "active",
      variants: [{ price: 20_000, stockQuantity: 10 }],
    },
    null,
  );
  const [variant] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id));
  const cart = await createGuestCart();
  await addCartItem(cart.id, variant!.id, qty);
  return placeOrder(
    {
      fullName: "زينب علي",
      phone: "07701234567",
      zoneId: zone!.id,
      city: "الكرادة",
      paymentMethod: "cod",
      idempotencyKey: randomBytes(18).toString("base64url"),
      expectedTotal: qty * 20_000 + 5_000,
    },
    { cartId: cart.id, userId, locale: "ar", ip: null, userAgent: null },
  );
}

describe("customers (admin)", () => {
  beforeEach(resetDatabase);

  it("lists customers with what they bought, searchable by name, email or phone", async () => {
    const owner = await person("owner@example.com", "owner", "Owner");
    const zainab = await person("zainab@example.com", "customer", "زينب علي");
    const omar = await person("omar@example.com", "customer", "عمر");
    await db.update(users).set({ phone: "+9647709876543" }).where(eq(users.id, omar.id));

    await buy(zainab.id, 1); // 25,000
    const second = await buy(zainab.id, 2); // 45,000, then cancelled → not counted
    await updateOrderStatus(
      { orderId: second.orderId, from: "pending", to: "cancelled", reason: "طلب الزبون" },
      owner,
    );

    const all = await listCustomersAdmin();
    expect(all.items.map((c) => c.email).sort()).toEqual([
      "omar@example.com",
      "zainab@example.com",
    ]);
    expect(all.items.find((c) => c.id === zainab.id)).toMatchObject({
      orderCount: 1,
      totalSpent: 25_000,
    });
    expect(all.items.find((c) => c.id === omar.id)).toMatchObject({ orderCount: 0, totalSpent: 0 });

    expect((await listCustomersAdmin({ q: "زينب" })).items.map((c) => c.id)).toEqual([zainab.id]);
    expect((await listCustomersAdmin({ q: "OMAR@" })).items.map((c) => c.id)).toEqual([omar.id]);
    expect((await listCustomersAdmin({ q: "0770 987" })).items.map((c) => c.id)).toEqual([omar.id]);

    const detail = await getCustomerAdmin(zainab.id);
    expect(detail).toMatchObject({ orderCount: 1, totalSpent: 25_000, averageOrder: 25_000 });
    expect(detail!.orders).toHaveLength(2);
    expect(await getCustomerAdmin(owner.id)).toBeNull();
  });

  it("suspends a customer: signed out everywhere and listed as suspended", async () => {
    const owner = await person("owner@example.com", "owner", "Owner");
    const staff = await person("orders@example.com", "order_manager", "Orders");
    const c = await person("c@example.com");
    await openSession(c.id);
    await openSession(c.id);

    await setCustomerSuspended(c.id, true, "  احتيال متكرر  ", owner);
    const [row] = await db.select().from(users).where(eq(users.id, c.id));
    expect(row).toMatchObject({ banned: true, banReason: "احتيال متكرر" });
    expect(await db.select().from(sessions).where(eq(sessions.userId, c.id))).toHaveLength(0);
    expect((await listCustomersAdmin({ status: "suspended" })).items.map((x) => x.id)).toEqual([
      c.id,
    ]);

    await setCustomerSuspended(c.id, false, null, owner);
    expect((await db.select().from(users).where(eq(users.id, c.id)))[0]).toMatchObject({
      banned: false,
      banReason: null,
    });
    await expect(setCustomerSuspended(staff.id, true, null, owner)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const actions = (await db.select().from(auditLogs)).map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(["customer.suspended", "customer.reactivated"]));
  });
});

describe("staff and roles (admin)", () => {
  beforeEach(resetDatabase);

  it("promotes verified accounts, revokes their sessions and keeps owners untouchable", async () => {
    const owner = await person("owner@example.com", "owner", "Owner");
    const sara = await person("sara@example.com", "customer", "Sara");
    await openSession(sara.id);

    await assignRole({ email: " SARA@example.com " }, "order_manager", owner);
    expect((await db.select().from(users).where(eq(users.id, sara.id)))[0]!.role).toBe(
      "order_manager",
    );
    expect(await db.select().from(sessions).where(eq(sessions.userId, sara.id))).toHaveLength(0);
    expect((await listStaff()).map((s) => [s.email, s.role])).toEqual([
      ["owner@example.com", "owner"],
      ["sara@example.com", "order_manager"],
    ]);

    await expect(assignRole({ userId: owner.id }, "admin", owner)).rejects.toMatchObject({
      details: { reason: "self" },
    });
    await expect(assignRole({ email: "nobody@example.com" }, "admin", owner)).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(assignRole({ userId: sara.id }, "owner", owner)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const unverified = await person("new@example.com");
    await db.update(users).set({ emailVerified: false }).where(eq(users.id, unverified.id));
    await expect(
      assignRole({ userId: unverified.id }, "catalog_manager", owner),
    ).rejects.toMatchObject({ details: { reason: "unverified" } });

    // Admins manage the manager roles only.
    const admin = await person("admin@example.com", "admin", "Admin");
    await expect(assignRole({ userId: sara.id }, "admin", admin)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(assignRole({ userId: owner.id }, "customer", admin)).rejects.toMatchObject({
      details: { reason: "owner" },
    });

    await assignRole({ userId: sara.id }, "customer", owner);
    expect((await listStaff()).map((s) => s.email)).toEqual([
      "owner@example.com",
      "admin@example.com",
    ]);
    const log = await listAuditLogs({ category: "people" });
    expect(log.items.map((l) => l.action)).toEqual(["staff.removed", "staff.role_changed"]);
    expect(log.items[0]).toMatchObject({ actorEmail: "owner@example.com", entityId: sara.id });
  });

  it("signs a person out everywhere and finds the event in the log", async () => {
    const owner = await person("owner@example.com", "owner", "Owner");
    const staff = await person("cat@example.com", "catalog_manager", "Cat");
    await openSession(staff.id);
    await revokeAllSessions(staff.id, owner);
    expect(await db.select().from(sessions).where(eq(sessions.userId, staff.id))).toHaveLength(0);
    const found = await listAuditLogs({ q: "cat@example.com" });
    expect(found.items.map((l) => l.action)).toEqual(["user.sessions_revoked"]);
    expect(found.items[0]!.metadata).toMatchObject({ sessions: 1 });
    expect((await listAuditLogs({ category: "orders" })).total).toBe(0);
  });
});
