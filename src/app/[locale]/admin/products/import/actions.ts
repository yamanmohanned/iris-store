"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { enforceRateLimit } from "@/server/security/rate-limit";
import {
  applyProductImport,
  CSV_COLUMNS,
  previewProductImport,
  type ImportIssue,
  type ImportPreview,
  type ImportSummary,
} from "@/server/services/product-csv";
import { getSettings } from "@/server/services/settings";

/** The page refuses files over 1.5 MB before sending; this is the server's own limit. */
const fileText = z.string().min(1).max(1_600_000);

export type IssueView = { row?: number; text: string };
export type PreviewResult =
  | {
      ok: true;
      summary: ImportSummary;
      items: ImportPreview["items"];
      errors: IssueView[];
      warnings: IssueView[];
    }
  | { ok: false; message: string };
export type ImportResult = { ok: true; summary: ImportSummary } | { ok: false; message: string };

async function describer() {
  const t = await getTranslations("admin.productImport");
  const locale = (await getLocale()) === "en" ? "en" : "ar";
  return (issue: ImportIssue): IssueView => ({
    row: issue.row,
    text: t(`issues.${issue.code}` as "issues.required", {
      column: CSV_COLUMNS.find((c) => c.key === issue.column)?.[locale] ?? "",
      value: issue.value ?? "",
    }),
  });
}

async function explain(error: unknown): Promise<string> {
  const t = await getTranslations("admin.productImport");
  if (isAppError(error)) {
    if (error.code === "VALIDATION") return t("errors.hasErrors");
    if (error.code === "CONFLICT") return t("errors.conflict");
    if (error.code === "RATE_LIMITED") return (await getTranslations("errors"))("rateLimited");
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
      return (await getTranslations("errors"))("forbidden");
  }
  logger.error({ err: error }, "product import failed");
  return t("errors.generic");
}

async function checkedText(text: unknown): Promise<string | { message: string }> {
  const parsed = fileText.safeParse(text);
  if (parsed.success) return parsed.data;
  const t = await getTranslations("admin.productImport");
  return { message: typeof text === "string" && text ? t("tooLarge") : t("issues.empty_file") };
}

/** Check a file and describe what importing it would do. Nothing is written. */
export async function previewImportAction(text: string): Promise<PreviewResult> {
  const input = await checkedText(text);
  if (typeof input !== "string") return { ok: false, ...input };
  try {
    const { actor } = await assertStaff("products:write");
    await enforceRateLimit(`products:import-check:${actor.id}`, 60, 3600);
    const { general } = await getSettings();
    const preview = await previewProductImport(input, general.currencyDecimals);
    const describe = await describer();
    return {
      ok: true,
      summary: preview.summary,
      items: preview.items,
      errors: preview.errors.map(describe),
      warnings: preview.warnings.map(describe),
    };
  } catch (error) {
    return { ok: false, message: await explain(error) };
  }
}

/** Import a file that passes the checks: all products in one go, or none. */
export async function applyImportAction(text: string): Promise<ImportResult> {
  const input = await checkedText(text);
  if (typeof input !== "string") return { ok: false, ...input };
  try {
    const { actor } = await assertStaff("products:write");
    await enforceRateLimit(`products:import:${actor.id}`, 20, 3600);
    const { general } = await getSettings();
    return { ok: true, summary: await applyProductImport(input, general.currencyDecimals, actor) };
  } catch (error) {
    return { ok: false, message: await explain(error) };
  }
}
