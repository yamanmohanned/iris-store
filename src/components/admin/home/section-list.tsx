"use client";

import { ArrowDown, ArrowUp, ExternalLink, LayoutTemplate, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { HomeSectionDTO } from "@/server/services/content";
import { DeleteIconButton, IconButton, PageTitle } from "../kit";
import { BlockThumb, type BlockType } from "./block-thumb";

type Result = { ok: boolean; message?: string };
type Actions = {
  setActive: (id: string, active: boolean) => Promise<Result>;
  move: (id: string, direction: "up" | "down") => Promise<Result>;
  remove: (id: string) => Promise<Result>;
};

export const BLOCK_TYPES: BlockType[] = [
  "hero",
  "categories",
  "products",
  "banner",
  "features",
  "text",
];

/** The home page as an ordered stack of blocks: show/hide, reorder, edit, remove, add. */
export function HomeSectionList({
  rows,
  actions,
  storeHref,
}: {
  rows: HomeSectionDTO[];
  actions: Actions;
  storeHref: string;
}) {
  const t = useTranslations("admin.home");
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageTitle
        title={t("title")}
        description={t("intro")}
        action={
          <div className="flex gap-2">
            <a
              href={storeHref}
              target="_blank"
              rel="noopener"
              className={buttonVariants({ variant: "outline" })}
            >
              <ExternalLink />
              {t("preview")}
            </a>
            <Button onClick={() => setAdding(true)}>
              <Plus />
              {t("new")}
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          <LayoutTemplate className="mb-3 size-8 text-primary" aria-hidden="true" />
          {t("empty")}
        </div>
      ) : (
        <ol className="mt-5 space-y-2.5" aria-label={t("order")}>
          {rows.map((row, i) => (
            <SectionRow
              key={row.id}
              row={row}
              index={i}
              last={i === rows.length - 1}
              actions={actions}
            />
          ))}
        </ol>
      )}

      <Sheet open={adding} onOpenChange={setAdding}>
        {adding ? (
          <SheetContent side="bottom" title={t("choose")} className="sm:mx-auto sm:max-w-2xl">
            <ul className="grid gap-2.5 px-4 pt-1 pb-6 sm:grid-cols-2">
              {BLOCK_TYPES.map((type) => (
                <li key={type}>
                  <Link
                    href={`/admin/storefront/new?type=${type}`}
                    className="flex h-full items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/50 hover:bg-primary-soft/40"
                  >
                    <BlockThumb type={type} />
                    <span className="min-w-0">
                      <span className="block font-medium">{t(`types.${type}.name`)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`types.${type}.description`)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SheetContent>
        ) : null}
      </Sheet>
    </>
  );
}

function SectionRow({
  row,
  index,
  last,
  actions,
}: {
  row: HomeSectionDTO;
  index: number;
  last: boolean;
  actions: Actions;
}) {
  const t = useTranslations("admin.home");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (r.ok && r.message) toast.success(r.message);
      else if (!r.ok && r.message) toast.error(r.message);
    });
  const name = tl(row.title, locale) || t(`types.${row.type}.name`);
  const switchId = `show-${row.id}`;

  return (
    <li
      className={cn(
        // Phones: name on its own line, controls on a second line so names stay readable.
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border bg-surface p-2.5 shadow-card sm:flex-nowrap sm:p-3",
        !row.isActive && "bg-surface-muted/60",
        pending && "opacity-60",
      )}
    >
      <span className="flex min-w-0 basis-full items-center gap-3 sm:flex-1 sm:basis-auto">
        <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <BlockThumb type={row.type} className={cn(!row.isActive && "opacity-50 grayscale")} />
        <Link href={`/admin/storefront/${row.id}`} className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-medium">{name}</span>
            {!row.isActive ? <Badge>{t("hidden")}</Badge> : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {summary(row, t, locale)}
          </span>
        </Link>
      </span>
      <span className="ms-auto flex items-center gap-0.5">
        <span className="me-1 flex items-center" title={row.isActive ? t("hide") : t("show")}>
          <label htmlFor={switchId} className="sr-only">
            {t("visible", { name })}
          </label>
          <Switch
            id={switchId}
            checked={row.isActive}
            disabled={pending}
            onCheckedChange={(on) => run(() => actions.setActive(row.id, on))}
          />
        </span>
        <IconButton
          label={t("moveUp")}
          disabled={index === 0 || pending}
          onClick={() => run(() => actions.move(row.id, "up"))}
        >
          <ArrowUp className="size-4" />
        </IconButton>
        <IconButton
          label={t("moveDown")}
          disabled={last || pending}
          onClick={() => run(() => actions.move(row.id, "down"))}
        >
          <ArrowDown className="size-4" />
        </IconButton>
        <Link
          href={`/admin/storefront/${row.id}`}
          aria-label={tCommon("edit")}
          title={tCommon("edit")}
          className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:inline-flex"
        >
          <Pencil className="size-4" />
        </Link>
        <DeleteIconButton
          label={tCommon("delete")}
          confirmLabel={t("confirmDelete")}
          disabled={pending}
          onConfirm={() => run(() => actions.remove(row.id))}
        />
      </span>
    </li>
  );
}

function summary(
  row: HomeSectionDTO,
  t: ReturnType<typeof useTranslations<"admin.home">>,
  locale: string,
): string {
  switch (row.type) {
    case "hero":
      return t("summary.slides", { count: row.config.slides.length });
    case "categories":
      return row.config.categoryIds.length
        ? t("summary.someCategories", { count: row.config.categoryIds.length })
        : t("summary.allCategories");
    case "products":
      return row.config.source === "manual"
        ? t("summary.picked", { count: row.config.productIds.length })
        : `${t(`sources.${row.config.source}`)} · ${t("summary.upTo", { count: row.config.limit })}`;
    case "banner":
      return tl(row.config.title, locale) || t("types.banner.name");
    case "features":
      return t("summary.features", { count: row.config.items.length });
    case "text":
      return tl(row.config.body, locale).slice(0, 80) || t("types.text.name");
  }
}
