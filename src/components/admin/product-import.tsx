"use client";

import { CheckCircle2, FileUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { ImportResult, PreviewResult } from "@/app/[locale]/admin/products/import/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";

const MAX_FILE_BYTES = 1_500_000;

/**
 * Excel saves "CSV UTF-8" or, by default on Arabic Windows, the Windows-1256 code page: try UTF-8
 * strictly, then fall back so Arabic text survives either way.
 */
async function readCsv(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1256").decode(bytes);
    } catch {
      return null;
    }
  }
}

/** Choose a spreadsheet, check it, review what will change, then import it in one go. */
export function ProductImport({
  previewAction,
  applyAction,
}: {
  previewAction: (text: string) => Promise<PreviewResult>;
  applyAction: (text: string) => Promise<ImportResult>;
}) {
  const t = useTranslations("admin.productImport");
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [preview, setPreview] = useState<Extract<PreviewResult, { ok: true }> | null>(null);
  const [done, setDone] = useState<Extract<ImportResult, { ok: true }>["summary"] | null>(null);
  const [checking, startCheck] = useTransition();
  const [importing, startImport] = useTransition();

  // Move focus to the outcome so keyboard and screen reader users land on it.
  useEffect(() => {
    if (preview || done) resultHeading.current?.focus();
  }, [preview, done]);

  async function choose(selected: File | undefined) {
    setPreview(null);
    setDone(null);
    setProblem(null);
    setFile(null);
    if (!selected) return;
    if (!/\.(csv|txt)$/i.test(selected.name)) return setProblem(t("notCsv"));
    if (selected.size > MAX_FILE_BYTES) return setProblem(t("tooLarge"));
    const text = await readCsv(selected);
    if (text === null) return setProblem(t("unreadable"));
    setFile({ name: selected.name, text });
  }

  function check() {
    if (!file) return;
    startCheck(async () => {
      const result = await previewAction(file.text);
      if (result.ok) setPreview(result);
      else setProblem(result.message);
    });
  }

  function runImport() {
    if (!file) return;
    startImport(async () => {
      const result = await applyAction(file.text);
      if (!result.ok) return setProblem(result.message);
      setDone(result.summary);
      setPreview(null);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  const reset = () => {
    setPreview(null);
    setFile(null);
    setProblem(null);
    if (fileInput.current) {
      fileInput.current.value = "";
      fileInput.current.click();
    }
  };

  const listed = preview?.items.length ?? 0;
  const total = preview ? preview.summary.created + preview.summary.updated : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}
        >
          <FileUp aria-hidden="true" />
          {t("chooseFile")}
        </label>
        <input
          ref={fileInput}
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        {file ? (
          <p className="text-sm font-medium">
            <bdi>{file.name}</bdi>
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
      </div>

      {problem ? <Alert tone="danger">{problem}</Alert> : null}

      {file && !preview ? (
        <Button onClick={check} loading={checking}>
          {checking ? t("checking") : t("preview")}
        </Button>
      ) : null}

      {preview ? (
        <section className="space-y-4" aria-labelledby={`${inputId}-result`}>
          <h3
            id={`${inputId}-result`}
            ref={resultHeading}
            tabIndex={-1}
            className="font-semibold outline-none"
          >
            {t("summaryTitle")}
          </h3>
          <ul className="flex flex-wrap gap-2 text-sm">
            <li className="rounded-full bg-surface-muted px-3 py-1">
              {t("summary.rows", { count: preview.summary.rows })}
            </li>
            <li className="rounded-full bg-success-soft px-3 py-1 text-success">
              {t("summary.created", { count: preview.summary.created })}
            </li>
            <li className="rounded-full bg-info-soft px-3 py-1 text-info">
              {t("summary.updated", { count: preview.summary.updated })}
            </li>
            <li className="rounded-full bg-surface-muted px-3 py-1">
              {t("summary.variants", {
                created: preview.summary.variantsCreated,
                updated: preview.summary.variantsUpdated,
              })}
            </li>
          </ul>

          {preview.errors.length ? (
            <div className="space-y-2 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm">
              <p className="font-semibold text-danger">
                {t("errorsTitle", { count: preview.errors.length })}
              </p>
              <p>{t("errorsHint")}</p>
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {preview.errors.map((issue, i) => (
                  <li key={i}>
                    {issue.row ? (
                      <span className="font-semibold tabular">
                        {t("row", { row: issue.row })}:{" "}
                      </span>
                    ) : null}
                    {issue.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.warnings.length ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t("warningsTitle")}</p>
              <ul className="list-disc space-y-1 ps-5">
                {preview.warnings.map((issue, i) => (
                  <li key={i}>{issue.text}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {listed ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("itemsTitle")}</p>
              <ul className="divide-y rounded-xl border text-sm">
                {preview.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2">
                    <Badge tone={item.action === "create" ? "success" : "info"}>
                      {item.action === "create" ? t("actionCreate") : t("actionUpdate")}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate">
                      {item.name || <bdi dir="ltr">{item.handle ?? "—"}</bdi>}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t("variantsCount", { count: item.variants })}
                    </span>
                  </li>
                ))}
              </ul>
              {total > listed ? (
                <p className="text-xs text-muted-foreground">
                  {t("more", { count: total - listed })}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!preview.errors.length && total ? (
              <Button onClick={runImport} loading={importing}>
                {importing ? t("importing") : t("apply", { count: total })}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={reset} disabled={importing}>
              {t("anotherFile")}
            </Button>
          </div>
        </section>
      ) : null}

      {done ? (
        <div className="space-y-3 rounded-xl border border-success/30 bg-success-soft p-4">
          <h3
            ref={resultHeading}
            tabIndex={-1}
            className="flex items-center gap-2 font-semibold text-success outline-none"
          >
            <CheckCircle2 className="size-5" aria-hidden="true" />
            {t("done", { created: done.created, updated: done.updated })}
          </h3>
          <Link
            href="/admin/products"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("viewProducts")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
