"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z, ZodError } from "zod";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { deleteProduct, saveProduct, type ProductInput } from "@/server/services/catalog-admin";

export type SaveProductResult =
  { ok: true; id: string; slug: string } | { ok: false; message: string; field?: string };

const uuid = z.uuid();

async function explain(error: unknown): Promise<{ message: string; field?: string }> {
  const t = await getTranslations("admin.productEditor");
  if (error instanceof ZodError) {
    for (const issue of error.issues) {
      const [first, , third] = issue.path;
      if (first === "name")
        return { message: `${t("nameAr")}: ${t("errors.required")}`, field: "name" };
      if (first === "slug") return { message: t("errors.slug"), field: "slug" };
      if (first === "options") return { message: t("errors.options"), field: "options" };
      if (first === "variants" && third === "compareAtPrice")
        return { message: t("errors.compareAt"), field: "variants" };
      if (issue.message === "duplicate_sku")
        return { message: t("errors.duplicateSku"), field: "variants" };
      if (first === "variants" && issue.code === "too_big")
        return { message: t("errors.tooManyVariants"), field: "variants" };
      if (first === "variants") return { message: t("errors.price"), field: "variants" };
    }
    return { message: t("errors.generic") };
  }
  if (isAppError(error)) {
    if (error.code === "CONFLICT" && error.details?.field === "slug")
      return { message: t("errors.slugTaken"), field: "slug" };
    if (error.code === "CONFLICT") return { message: t("conflict") };
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
      return { message: (await getTranslations("admin"))("denied") };
  }
  logger.error({ err: error }, "save product failed");
  return { message: (await getTranslations("errors"))("genericBody") };
}

/** Create (no id) or update a product. Everything is validated again by the catalog service. */
export async function saveProductAction(
  productId: string | null,
  input: ProductInput,
): Promise<SaveProductResult> {
  if (productId !== null && !uuid.safeParse(productId).success)
    return { ok: false, message: "invalid id" };
  try {
    const { actor } = await assertStaff("products:write");
    const saved = await saveProduct(input, actor, productId ?? undefined);
    refresh();
    return { ok: true, ...saved };
  } catch (error) {
    return { ok: false, ...(await explain(error)) };
  }
}

export async function deleteProductAction(
  productId: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!uuid.safeParse(productId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("products:write");
    await deleteProduct(productId, actor);
    return { ok: true };
  } catch (error) {
    return { ok: false, ...(await explain(error)) };
  }
}
