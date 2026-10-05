"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ZodError } from "zod";
import type { SettingsResult } from "@/components/admin/settings/shell";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { enforceRateLimit } from "@/server/security/rate-limit";
import {
  clearStoreCache,
  isEditableSection,
  saveSettingsSection,
} from "@/server/services/settings-admin";

/** Message key for a failed field, by its dotted path in the section ("contact.email"). */
function fieldMessageKey(path: string) {
  if (path.startsWith("adminEmails") || path === "contact.email") return "errors.email" as const;
  if (path === "announcement.link") return "errors.link" as const;
  if (path === "primaryColor") return "errors.color" as const;
  if (path === "minOrderAmount" || path === "freeShippingThreshold")
    return "errors.amount" as const;
  if (path.startsWith("tax.")) return "errors.taxRate" as const;
  if (path === "lowStockThreshold") return "errors.threshold" as const;
  return "errors.invalid" as const;
}

async function explain(error: unknown): Promise<SettingsResult> {
  const t = await getTranslations("admin.settings");
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.map(String).join(".");
      fields[path] ??= t(fieldMessageKey(path));
    }
    return { ok: false, message: t("fixErrors"), fields };
  }
  if (isAppError(error)) {
    const field = error.details?.field as string | undefined;
    if (error.code === "VALIDATION" && field === "storeName")
      return { ok: false, message: t("fixErrors"), fields: { storeName: t("errors.storeName") } };
    if (error.code === "VALIDATION" && field === "payments")
      return {
        ok: false,
        message: t("errors.payments"),
        fields: { payments: t("errors.payments") },
      };
    if (error.code === "VALIDATION" && field) return { ok: false, message: t("errors.image") };
    if (error.code === "RATE_LIMITED") return { ok: false, message: t("errors.tooFast") };
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
      return { ok: false, message: (await getTranslations("admin"))("denied") };
  }
  logger.error({ err: error }, "settings action failed");
  return { ok: false, message: (await getTranslations("errors"))("genericBody") };
}

export async function saveSettingsAction(
  section: string,
  input: Record<string, unknown>,
): Promise<SettingsResult> {
  const t = await getTranslations("admin.settings");
  if (!isEditableSection(section) || !input || typeof input !== "object" || Array.isArray(input))
    return { ok: false, message: t("errors.invalid") };
  try {
    const { actor } = await assertStaff("settings:write");
    await saveSettingsSection(section, input, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: t("saved") };
}

export async function clearCacheAction(): Promise<SettingsResult> {
  try {
    const { actor } = await assertStaff("settings:write");
    await enforceRateLimit(`admin:cache-clear:${actor.id}`, 10, 600);
    await clearStoreCache(actor);
  } catch (error) {
    return explain(error);
  }
  return { ok: true, message: (await getTranslations("admin.settings"))("cache.done") };
}
