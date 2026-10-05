import "server-only";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { db } from "@/server/db/client";
import { addresses } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { getSettings } from "./settings";

export const MAX_ADDRESSES = 10;

export type AddressDTO = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  zoneId: string | null;
  city: string;
  area: string | null;
  street: string | null;
  landmark: string | null;
  isDefault: boolean;
};

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const addressInputSchema = z.object({
  label: optional(40),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  zoneId: z.uuid(),
  city: z.string().trim().min(2).max(80),
  area: optional(120),
  street: optional(200),
  landmark: optional(200),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.input<typeof addressInputSchema>;

const toDTO = (a: typeof addresses.$inferSelect): AddressDTO => ({
  id: a.id,
  label: a.label,
  fullName: a.fullName,
  phone: a.phone,
  zoneId: a.shippingZoneId,
  city: a.city,
  area: a.area,
  street: a.street,
  landmark: a.landmark,
  isDefault: a.isDefault,
});

export async function listAddresses(userId: string): Promise<AddressDTO[]> {
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.updatedAt));
  return rows.map(toDTO);
}

/** Create (no id) or update an address of this customer. The first address becomes the default. */
export async function saveAddress(
  userId: string,
  raw: AddressInput,
  addressId?: string,
): Promise<AddressDTO> {
  const input = addressInputSchema.parse(raw);
  const { general } = await getSettings();
  const phone = normalizePhone(input.phone, general.phoneCode);
  if (!phone) throw new AppError("VALIDATION", "invalid phone", { field: "phone" });
  const values = {
    label: input.label,
    fullName: input.fullName,
    phone,
    shippingZoneId: input.zoneId,
    city: input.city,
    area: input.area,
    street: input.street,
    landmark: input.landmark,
  };

  return db.transaction(async (tx) => {
    const [{ n }] = (await tx
      .select({ n: count() })
      .from(addresses)
      .where(eq(addresses.userId, userId))) as [{ n: number }];
    const makeDefault = input.isDefault || n === 0;
    if (makeDefault)
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(addresses.userId, userId),
            eq(addresses.isDefault, true),
            addressId ? ne(addresses.id, addressId) : undefined,
          ),
        );
    if (addressId) {
      const [row] = await tx
        .update(addresses)
        .set({ ...values, ...(makeDefault ? { isDefault: true } : {}) })
        .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "address");
      return toDTO(row);
    }
    if (n >= MAX_ADDRESSES) throw new AppError("CONFLICT", "too many addresses", { limit: true });
    const [row] = await tx
      .insert(addresses)
      .values({ userId, ...values, isDefault: makeDefault })
      .returning();
    return toDTO(row!);
  });
}

/** Delete one of this customer's addresses; if it was the default, the newest remaining one takes over. */
export async function deleteAddress(userId: string, addressId: string) {
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning({ isDefault: addresses.isDefault });
    if (!deleted?.isDefault) return;
    const [next] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.updatedAt))
      .limit(1);
    if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
  });
}

export async function setDefaultAddress(userId: string, addressId: string) {
  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
    if (!target) throw new AppError("NOT_FOUND", "address");
    await tx
      .update(addresses)
      .set({ isDefault: false })
      .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
    await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, addressId));
  });
}
