"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import {
  getCustomerAdmin,
  revokeAllSessions,
  setCustomerSuspended,
} from "@/server/services/people-admin";

type Result = { ok: boolean; message?: string };

const suspendInput = z.object({
  userId: z.uuid(),
  suspended: z.boolean(),
  reason: z.string().trim().max(300).nullable(),
});

async function fail(error: unknown): Promise<Result> {
  const t = await getTranslations("admin");
  if (isAppError(error) && (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED"))
    return { ok: false, message: t("denied") };
  if (isAppError(error) && error.code === "NOT_FOUND")
    return { ok: false, message: t("customers.gone") };
  logger.error({ err: error }, "customer action failed");
  return { ok: false, message: (await getTranslations("errors"))("genericBody") };
}

export async function setCustomerSuspendedAction(
  userId: string,
  suspended: boolean,
  reason: string | null,
): Promise<Result> {
  const input = suspendInput.safeParse({ userId, suspended, reason });
  if (!input.success) return { ok: false };
  try {
    const { actor } = await assertStaff("customers:write");
    await setCustomerSuspended(input.data.userId, input.data.suspended, input.data.reason, actor);
  } catch (error) {
    return fail(error);
  }
  refresh();
  const t = await getTranslations("admin.customers");
  return { ok: true, message: suspended ? t("suspendedDone") : t("reactivatedDone") };
}

export async function revokeCustomerSessionsAction(userId: string): Promise<Result> {
  if (!z.uuid().safeParse(userId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("customers:write");
    // Only customer accounts from this page; staff are handled on the staff page.
    if (!(await getCustomerAdmin(userId))) return { ok: false };
    await revokeAllSessions(userId, actor);
  } catch (error) {
    return fail(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.customers"))("signedOut") };
}
