"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z, ZodError } from "zod";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { moveCategory } from "@/server/services/admin-catalog";
import { deleteCategory, saveCategory, type CategoryInput } from "@/server/services/catalog-admin";

type Result = { ok: boolean; message?: string; field?: string };
const uuid = z.uuid();

async function explain(error: unknown): Promise<Result> {
  const t = await getTranslations("admin");
  if (error instanceof ZodError) {
    const field = String(error.issues[0]?.path[0] ?? "");
    if (field === "name")
      return {
        ok: false,
        field,
        message: `${t("categories.nameAr")}: ${t("productEditor.errors.required")}`,
      };
    return { ok: false, field, message: t("productEditor.errors.generic") };
  }
  if (isAppError(error)) {
    const field = error.details?.field as string | undefined;
    if (error.code === "CONFLICT" && field === "slug")
      return { ok: false, field, message: t("productEditor.errors.slugTaken") };
    if (error.code === "CONFLICT") return { ok: false, message: t("categories.hasChildren") };
    if (error.code === "VALIDATION" && field === "parentId")
      return { ok: false, field, message: t("categories.tooDeep") };
    if (error.code === "VALIDATION" && field === "slug")
      return { ok: false, field, message: t("productEditor.errors.slug") };
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
      return { ok: false, message: t("denied") };
  }
  logger.error({ err: error }, "category action failed");
  return { ok: false, message: (await getTranslations("errors"))("genericBody") };
}

export async function saveCategoryAction(
  categoryId: string | null,
  input: CategoryInput,
): Promise<Result> {
  if (categoryId !== null && !uuid.safeParse(categoryId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("products:write");
    await saveCategory(input, actor, categoryId ?? undefined);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.categories"))("saved") };
}

export async function deleteCategoryAction(categoryId: string): Promise<Result> {
  if (!uuid.safeParse(categoryId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("products:write");
    await deleteCategory(categoryId, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.categories"))("deleted") };
}

export async function moveCategoryAction(
  categoryId: string,
  direction: "up" | "down",
): Promise<Result> {
  if (!uuid.safeParse(categoryId).success || (direction !== "up" && direction !== "down"))
    return { ok: false };
  try {
    const { actor } = await assertStaff("products:write");
    await moveCategory(categoryId, direction, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true };
}
