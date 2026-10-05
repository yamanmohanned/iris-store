"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z, ZodError } from "zod";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { deleteZone, moveZone, saveZone, type ZoneInput } from "@/server/services/shipping-admin";

type Result = { ok: boolean; message?: string; field?: string };
const uuid = z.uuid();

async function explain(error: unknown): Promise<Result> {
  const t = await getTranslations("admin");
  if (error instanceof ZodError) {
    const field = String(error.issues[0]?.path[0] ?? "");
    if (field === "name") return { ok: false, field, message: t("shipping.errors.name") };
    if (field === "maxDays" || field === "minDays")
      return { ok: false, field: "days", message: t("shipping.errors.days") };
    if (field === "fee" || field === "freeShippingThreshold")
      return {
        ok: false,
        field: field === "fee" ? "fee" : "free",
        message: t("shipping.errors.amount"),
      };
    return { ok: false, message: t("productEditor.errors.generic") };
  }
  if (isAppError(error) && (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED"))
    return { ok: false, message: t("denied") };
  if (isAppError(error) && error.code === "NOT_FOUND")
    return { ok: false, message: (await getTranslations("errors"))("genericBody") };
  logger.error({ err: error }, "shipping zone action failed");
  return { ok: false, message: (await getTranslations("errors"))("genericBody") };
}

export async function saveZoneAction(zoneId: string | null, input: ZoneInput): Promise<Result> {
  if (zoneId !== null && !uuid.safeParse(zoneId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("shipping:write");
    await saveZone(input, actor, zoneId ?? undefined);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.shipping"))("saved") };
}

export async function deleteZoneAction(zoneId: string): Promise<Result> {
  if (!uuid.safeParse(zoneId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("shipping:write");
    await deleteZone(zoneId, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.shipping"))("deleted") };
}

export async function moveZoneAction(zoneId: string, direction: "up" | "down"): Promise<Result> {
  if (!uuid.safeParse(zoneId).success || (direction !== "up" && direction !== "down"))
    return { ok: false };
  try {
    const { actor } = await assertStaff("shipping:write");
    await moveZone(zoneId, direction, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true };
}
