"use client";

import { ArrowDown, ArrowUp, FileText, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { AdminPageRow } from "@/server/services/content";
import { DeleteIconButton, IconButton, PageTitle } from "./kit";

type Result = { ok: boolean; message?: string };
type Actions = {
  move: (id: string, direction: "up" | "down") => Promise<Result>;
  remove: (id: string) => Promise<Result>;
};

/** Static pages (about, policies…) in footer order. */
export function PageList({ rows, actions }: { rows: AdminPageRow[]; actions: Actions }) {
  const t = useTranslations("admin.pages");
  return (
    <>
      <PageTitle
        title={t("title")}
        description={t("intro")}
        action={
          <Link href="/admin/pages/new" className={buttonVariants()}>
            <Plus />
            {t("new")}
          </Link>
        }
      />
      {rows.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          <FileText className="mb-3 size-8 text-primary" aria-hidden="true" />
          {t("empty")}
        </div>
      ) : (
        <ul className="mt-5 divide-y overflow-hidden rounded-2xl border bg-surface shadow-card">
          {rows.map((row, i) => (
            <PageRow
              key={row.id}
              row={row}
              first={i === 0}
              last={i === rows.length - 1}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function PageRow({
  row,
  first,
  last,
  actions,
}: {
  row: AdminPageRow;
  first: boolean;
  last: boolean;
  actions: Actions;
}) {
  const t = useTranslations("admin.pages");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (r.ok && r.message) toast.success(r.message);
      else if (!r.ok && r.message) toast.error(r.message);
    });
  return (
    <li className={cn("flex items-center gap-3 px-3 py-2.5 sm:px-4", pending && "opacity-60")}>
      <Link href={`/admin/pages/${row.id}`} className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{tl(row.title, locale)}</span>
          {!row.isPublished ? <Badge tone="warning">{t("draft")}</Badge> : null}
          {row.isPublished && !row.showInFooter ? <Badge>{t("notInFooter")}</Badge> : null}
          {row.systemKey ? <Badge tone="info">{t("system")}</Badge> : null}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          <bdi dir="ltr">/pages/{row.slug}</bdi>
        </span>
      </Link>
      <span className="flex items-center gap-0.5">
        <IconButton
          label={t("moveUp")}
          disabled={first || pending}
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
          href={`/admin/pages/${row.id}`}
          aria-label={tCommon("edit")}
          title={tCommon("edit")}
          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </Link>
        {row.systemKey ? null : (
          <DeleteIconButton
            label={tCommon("delete")}
            confirmLabel={t("confirmDelete")}
            disabled={pending}
            onConfirm={() => run(() => actions.remove(row.id))}
          />
        )}
      </span>
    </li>
  );
}
