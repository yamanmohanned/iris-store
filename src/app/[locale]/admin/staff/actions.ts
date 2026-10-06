"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { assertStaff } from "@/server/auth/session";
import { USER_ROLES } from "@/server/db/schema";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { assignRole, revokeStaffSessions } from "@/server/services/people-admin";

type Result = { ok: boolean; message?: string };

const target = z.union([
  z.object({ userId: z.uuid() }),
  z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) }),
]);

async function explain(error: unknown): Promise<Result> {
  const t = await getTranslations("admin.staff.errors");
  if (isAppError(error)) {
    const reason = error.details?.reason;
    if (reason === "no_account") return { ok: false, message: t("noAccount") };
    if (reason === "unverified") return { ok: false, message: t("unverified") };
    if (reason === "self") return { ok: false, message: t("self") };
    if (reason === "owner") return { ok: false, message: t("owner") };
    if (reason === "suspended") return { ok: false, message: t("suspended") };
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
      return { ok: false, message: (await getTranslations("admin"))("denied") };
  }
  logger.error({ err: error }, "staff action failed");
  return { ok: false, message: (await getTranslations("errors"))("genericBody") };
}

export async function assignRoleAction(who: unknown, role: unknown): Promise<Result> {
  const parsedTarget = target.safeParse(who);
  const parsedRole = z.enum(USER_ROLES).safeParse(role);
  if (!parsedTarget.success) {
    const t = await getTranslations("admin.staff.errors");
    return { ok: false, message: t("email") };
  }
  if (!parsedRole.success) return { ok: false };
  let changed = false;
  try {
    const { actor } = await assertStaff("staff:manage");
    changed = (await assignRole(parsedTarget.data, parsedRole.data, actor)).changed;
  } catch (error) {
    return explain(error);
  }
  refresh();
  const t = await getTranslations("admin.staff");
  if (!changed) return { ok: true, message: t("unchanged") };
  return { ok: true, message: parsedRole.data === "customer" ? t("removed") : t("saved") };
}

export async function revokeStaffSessionsAction(userId: unknown): Promise<Result> {
  const id = z.uuid().safeParse(userId);
  if (!id.success) return { ok: false };
  try {
    const { actor } = await assertStaff("staff:manage");
    await revokeStaffSessions(id.data, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.staff"))("signedOut") };
}
