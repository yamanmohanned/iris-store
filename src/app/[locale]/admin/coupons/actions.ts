"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z, ZodError } from "zod";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import {
  deleteCoupon,
  saveCoupon,
  setCouponActive,
  type CouponInput,
} from "@/server/services/coupons-admin";

type Result = { ok: boolean; message?: string; field?: string };
const uuid = z.uuid();

async function explain(error: unknown): Promise<Result> {
  const t = await getTranslations("admin");
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = String(issue?.path[0] ?? "");
    if (field === "code") return { ok: false, field, message: t("coupons.errors.code") };
    if (field === "value")
      return {
        ok: false,
        field,
        message: t(
          issue?.message === "percentage" ? "coupons.errors.percentage" : "coupons.errors.amount",
        ),
      };
    if (field === "maxDiscount" || field === "minSubtotal")
      return { ok: false, field, message: t("coupons.errors.amount") };
    if (field === "endsOn" || field === "startsOn")
      return { ok: false, field: "endsOn", message: t("coupons.errors.dates") };
    if (field === "usageLimit" || field === "usageLimitPerCustomer")
      return { ok: false, field: "usageLimit", message: t("coupons.errors.limit") };
    return { ok: false, message: t("productEditor.errors.generic") };
  }
  if (isAppError(error)) {
    if (error.code === "CONFLICT" && error.details?.field === "code")
      return { ok: false, field: "code", message: t("coupons.errors.codeTaken") };
    if (error.code === "CONFLICT") return { ok: false, message: t("coupons.errors.used") };
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
      return { ok: false, message: t("denied") };
  }
  logger.error({ err: error }, "coupon action failed");
  return { ok: false, message: (await getTranslations("errors"))("genericBody") };
}

export async function saveCouponAction(
  couponId: string | null,
  input: CouponInput,
): Promise<Result> {
  if (couponId !== null && !uuid.safeParse(couponId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("coupons:write");
    await saveCoupon(input, actor, couponId ?? undefined);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.coupons"))("saved") };
}

export async function setCouponActiveAction(couponId: string, active: boolean): Promise<Result> {
  if (!uuid.safeParse(couponId).success || typeof active !== "boolean") return { ok: false };
  try {
    const { actor } = await assertStaff("coupons:write");
    await setCouponActive(couponId, active, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  const t = await getTranslations("admin.coupons");
  return { ok: true, message: t(active ? "activated" : "deactivated") };
}

export async function deleteCouponAction(couponId: string): Promise<Result> {
  if (!uuid.safeParse(couponId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("coupons:write");
    await deleteCoupon(couponId, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.coupons"))("deleted") };
}
