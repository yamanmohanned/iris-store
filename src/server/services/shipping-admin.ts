import "server-only";
import { asc, count, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { compactText, type LocalizedText } from "@/lib/localized";
import { requiredLocalizedText } from "@/lib/validation";
import { CacheTags, invalidate } from "@/server/cache";
import { db } from "@/server/db/client";
import { orders, shippingZones } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { audit } from "./audit";
import type { Actor } from "./catalog-admin";

const MAX_MONEY = 1_000_000_000_000;
const days = z.number().int().min(0).max(90).nullish();

export const zoneInputSchema = z
  .object({
    name: requiredLocalizedText(80),
    fee: z.number().int().min(0).max(MAX_MONEY),
    freeShippingThreshold: z.number().int().min(0).max(MAX_MONEY).nullish(),
    minDays: days,
    maxDays: days,
    codAvailable: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.minDays == null || v.maxDays == null || v.minDays <= v.maxDays, {
    path: ["maxDays"],
    message: "days_order",
  });
export type ZoneInput = z.input<typeof zoneInputSchema>;

export type AdminZoneRow = {
  id: string;
  name: LocalizedText;
  fee: number;
  freeShippingThreshold: number | null;
  minDays: number | null;
  maxDays: number | null;
  codAvailable: boolean;
  isActive: boolean;
  /** Orders ever delivered to this area (their address keeps the area name if it is deleted). */
  orderCount: number;
};

/** Every delivery area (hidden ones included) in the order customers see them. */
export async function listZonesAdmin(): Promise<AdminZoneRow[]> {
  const [rows, usage] = await Promise.all([
    db
      .select()
      .from(shippingZones)
      .orderBy(asc(shippingZones.sortOrder), asc(shippingZones.createdAt)),
    db
      .select({ zoneId: orders.shippingZoneId, n: count() })
      .from(orders)
      .where(isNotNull(orders.shippingZoneId))
      .groupBy(orders.shippingZoneId),
  ]);
  const used = new Map(usage.map((u) => [u.zoneId, u.n]));
  return rows.map((z) => ({
    id: z.id,
    name: z.name,
    fee: z.fee,
    freeShippingThreshold: z.freeShippingThreshold,
    minDays: z.minDays,
    maxDays: z.maxDays,
    codAvailable: z.codAvailable,
    isActive: z.isActive,
    orderCount: used.get(z.id) ?? 0,
  }));
}

export async function saveZone(raw: ZoneInput, actor: Actor | null, zoneId?: string) {
  const input = zoneInputSchema.parse(raw);
  const values = {
    name: compactText(input.name)!,
    fee: input.fee,
    freeShippingThreshold: input.freeShippingThreshold ?? null,
    minDays: input.minDays ?? null,
    maxDays: input.maxDays ?? null,
    codAvailable: input.codAvailable,
    isActive: input.isActive,
  };
  const row = await db.transaction(async (tx) => {
    let saved;
    if (zoneId) {
      [saved] = await tx
        .update(shippingZones)
        .set(values)
        .where(eq(shippingZones.id, zoneId))
        .returning();
      if (!saved) throw new AppError("NOT_FOUND", "zone not found");
    } else {
      const [last] = await tx
        .select({ max: sql<number>`coalesce(max(${shippingZones.sortOrder}), -1)::int` })
        .from(shippingZones);
      [saved] = await tx
        .insert(shippingZones)
        .values({ ...values, sortOrder: (last?.max ?? -1) + 1 })
        .returning();
    }
    await audit(
      {
        action: zoneId ? "shipping_zone.update" : "shipping_zone.create",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "shipping_zone",
        entityId: saved!.id,
        metadata: { fee: values.fee, isActive: values.isActive },
      },
      tx,
    );
    return saved!;
  });
  invalidate(CacheTags.shipping);
  return row;
}

/**
 * Remove an area. Past orders keep its name in their address snapshot; saved customer addresses
 * lose the link and ask for the area again at checkout.
 */
export async function deleteZone(zoneId: string, actor: Actor | null) {
  await db.transaction(async (tx) => {
    const [row] = await tx.delete(shippingZones).where(eq(shippingZones.id, zoneId)).returning();
    if (!row) throw new AppError("NOT_FOUND", "zone not found");
    await audit(
      {
        action: "shipping_zone.delete",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "shipping_zone",
        entityId: zoneId,
        metadata: { name: row.name.ar ?? row.name.en },
      },
      tx,
    );
  });
  invalidate(CacheTags.shipping);
}

export async function moveZone(zoneId: string, direction: "up" | "down", actor: Actor | null) {
  await db.transaction(async (tx) => {
    const all = await tx
      .select({ id: shippingZones.id })
      .from(shippingZones)
      .orderBy(asc(shippingZones.sortOrder), asc(shippingZones.createdAt))
      .for("update");
    const index = all.findIndex((z) => z.id === zoneId);
    if (index < 0) throw new AppError("NOT_FOUND", "zone not found");
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= all.length) return;
    [all[index], all[swap]] = [all[swap]!, all[index]!];
    for (const [position, z] of all.entries())
      await tx.update(shippingZones).set({ sortOrder: position }).where(eq(shippingZones.id, z.id));
    await audit(
      {
        action: "shipping_zone.reorder",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "shipping_zone",
        entityId: zoneId,
        metadata: { direction },
      },
      tx,
    );
  });
  invalidate(CacheTags.shipping);
}
