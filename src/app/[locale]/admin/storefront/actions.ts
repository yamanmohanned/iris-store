"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z, ZodError } from "zod";
import type { PickerProduct } from "@/components/admin/product-picker";
import type { SettingsResult } from "@/components/admin/settings/shell";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { listProductsAdmin } from "@/server/services/admin-catalog";
import {
  deleteHomeSection,
  moveHomeSection,
  saveHomeSection,
  setHomeSectionActive,
  type HomeSectionInput,
} from "@/server/services/content";

type Result = { ok: boolean; message?: string };
const uuid = z.uuid();

async function explain(error: unknown): Promise<SettingsResult> {
  const t = await getTranslations("admin.home");
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.map(String).join(".");
      const last = String(issue.path[issue.path.length - 1] ?? "");
      fields[path] ??= last === "ctaHref" ? t("errors.link") : t("errors.invalid");
    }
    return { ok: false, message: t("errors.check"), fields };
  }
  if (isAppError(error) && (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED"))
    return { ok: false, message: (await getTranslations("admin"))("denied") };
  if (isAppError(error) && error.code === "NOT_FOUND")
    return { ok: false, message: t("errors.gone") };
  logger.error({ err: error }, "home section action failed");
  return { ok: false, message: (await getTranslations("errors"))("genericBody") };
}

export async function saveHomeSectionAction(
  sectionId: string | null,
  input: Record<string, unknown>,
): Promise<SettingsResult> {
  if (sectionId !== null && !uuid.safeParse(sectionId).success)
    return { ok: false, message: "invalid id" };
  let id: string;
  try {
    const { actor } = await assertStaff("content:write");
    id = (await saveHomeSection(input as HomeSectionInput, actor, sectionId ?? undefined)).id;
  } catch (error) {
    return explain(error);
  }
  refresh();
  const t = await getTranslations("admin.home");
  return { ok: true, id, message: sectionId ? t("saved") : t("added") };
}

export async function setHomeSectionActiveAction(
  sectionId: string,
  active: boolean,
): Promise<Result> {
  if (!uuid.safeParse(sectionId).success || typeof active !== "boolean") return { ok: false };
  try {
    const { actor } = await assertStaff("content:write");
    await setHomeSectionActive(sectionId, active, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  const t = await getTranslations("admin.home");
  return { ok: true, message: active ? t("shown") : t("hiddenNow") };
}

export async function moveHomeSectionAction(
  sectionId: string,
  direction: "up" | "down",
): Promise<Result> {
  if (!uuid.safeParse(sectionId).success || (direction !== "up" && direction !== "down"))
    return { ok: false };
  try {
    const { actor } = await assertStaff("content:write");
    await moveHomeSection(sectionId, direction, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteHomeSectionAction(sectionId: string): Promise<Result> {
  if (!uuid.safeParse(sectionId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("content:write");
    await deleteHomeSection(sectionId, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.home"))("deleted") };
}

/** Published products matching a search (name, spelling variants or SKU) for the picker. */
export async function searchProductsForPickerAction(q: unknown): Promise<PickerProduct[]> {
  const term = z.string().trim().min(2).max(100).safeParse(q);
  if (!term.success) return [];
  await assertStaff("content:write");
  const { items } = await listProductsAdmin({ q: term.data, status: "active", pageSize: 12 });
  return items.map((p) => ({ id: p.id, name: p.name, image: p.image, price: p.minPrice }));
}
