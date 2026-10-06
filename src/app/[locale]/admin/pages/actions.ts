"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z, ZodError } from "zod";
import type { SettingsResult } from "@/components/admin/settings/shell";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import {
  deletePage,
  getPageForEdit,
  movePage,
  nextPageSortOrder,
  savePage,
  type PageInput,
} from "@/server/services/content";

type Result = { ok: boolean; message?: string };
const uuid = z.uuid();

async function explain(error: unknown): Promise<SettingsResult> {
  const t = await getTranslations("admin.pages");
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.map(String).join(".");
      fields[path] ??= path === "title" ? t("errors.title") : t("errors.invalid");
    }
    return { ok: false, message: t("errors.check"), fields };
  }
  if (isAppError(error)) {
    const field = error.details?.field;
    if (error.code === "CONFLICT" && field === "slug")
      return { ok: false, message: t("errors.check"), fields: { slug: t("errors.slugTaken") } };
    if (error.code === "VALIDATION" && field === "slug")
      return { ok: false, message: t("errors.check"), fields: { slug: t("errors.slug") } };
    if (error.code === "FORBIDDEN" && error.message.includes("system"))
      return { ok: false, message: t("errors.system") };
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
      return { ok: false, message: (await getTranslations("admin"))("denied") };
    if (error.code === "NOT_FOUND") return { ok: false, message: t("errors.gone") };
  }
  logger.error({ err: error }, "page action failed");
  return { ok: false, message: (await getTranslations("errors"))("genericBody") };
}

export async function savePageAction(
  pageId: string | null,
  input: Record<string, unknown>,
): Promise<SettingsResult> {
  if (pageId !== null && !uuid.safeParse(pageId).success)
    return { ok: false, message: "invalid id" };
  let id: string;
  try {
    const { actor } = await assertStaff("content:write");
    // Order is changed from the list; edits keep their place and new pages go last.
    const sortOrder = pageId
      ? ((await getPageForEdit(pageId))?.sortOrder ?? 0)
      : await nextPageSortOrder();
    id = (await savePage({ ...(input as PageInput), sortOrder }, actor, pageId ?? undefined)).id;
  } catch (error) {
    return explain(error);
  }
  refresh();
  const t = await getTranslations("admin.pages");
  return { ok: true, id, message: pageId ? t("saved") : t("created") };
}

export async function deletePageAction(pageId: string): Promise<Result> {
  if (!uuid.safeParse(pageId).success) return { ok: false };
  try {
    const { actor } = await assertStaff("content:write");
    await deletePage(pageId, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true, message: (await getTranslations("admin.pages"))("deleted") };
}

export async function movePageAction(pageId: string, direction: "up" | "down"): Promise<Result> {
  if (!uuid.safeParse(pageId).success || (direction !== "up" && direction !== "down"))
    return { ok: false };
  try {
    const { actor } = await assertStaff("content:write");
    await movePage(pageId, direction, actor);
  } catch (error) {
    return explain(error);
  }
  refresh();
  return { ok: true };
}
