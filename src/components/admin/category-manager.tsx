"use client";

import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert, Badge } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { LocalizedText } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { AdminCategoryRow } from "@/server/services/admin-catalog";
import type { CategoryInput } from "@/server/services/catalog-admin";
import type { ImageDTO } from "@/server/services/media";
import { MediaImage } from "../store/media-image";
import { SingleImageField } from "./image-uploader";

type Result = { ok: boolean; message?: string; field?: string };
type Actions = {
  save: (id: string | null, input: CategoryInput) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
  move: (id: string, direction: "up" | "down") => Promise<Result>;
};

const name = (n: LocalizedText, locale: string) =>
  (locale === "en" ? n.en || n.ar : n.ar || n.en) ?? "";

/** Category tree in display order: phones get the same list with large tap targets. */
export function CategoryManager({
  rows,
  actions,
  canWrite,
}: {
  rows: AdminCategoryRow[];
  actions: Actions;
  canWrite: boolean;
}) {
  const t = useTranslations("admin.categories");
  const locale = useLocale();
  const [editing, setEditing] = useState<AdminCategoryRow | "new" | null>(null);

  const byParent = new Map<string | null, AdminCategoryRow[]>();
  for (const r of rows) byParent.set(r.parentId, [...(byParent.get(r.parentId) ?? []), r]);
  const ordered: { row: AdminCategoryRow; depth: number; first: boolean; last: boolean }[] = [];
  const walk = (parent: string | null, depth: number) => {
    const list = byParent.get(parent) ?? [];
    list.forEach((row, i) => {
      ordered.push({ row, depth, first: i === 0, last: i === list.length - 1 });
      walk(row.id, depth + 1);
    });
  };
  walk(null, 0);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[1.8rem] leading-tight font-bold">{t("title")}</h1>
        {canWrite ? (
          <Button onClick={() => setEditing("new")}>
            <Plus />
            {t("new")}
          </Button>
        ) : null}
      </div>

      {ordered.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          <FolderTree className="mb-3 size-8 text-primary" aria-hidden="true" />
          {t("empty")}
        </div>
      ) : (
        <ul className="mt-5 divide-y overflow-hidden rounded-2xl border bg-surface shadow-card">
          {ordered.map(({ row, depth, first, last }) => (
            <CategoryRow
              key={row.id}
              row={row}
              depth={depth}
              first={first}
              last={last}
              actions={actions}
              canWrite={canWrite}
              onEdit={() => setEditing(row)}
              locale={locale}
            />
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null ? (
          <SheetContent
            side="bottom"
            title={editing === "new" ? t("new") : t("edit")}
            className="sm:mx-auto sm:max-w-lg"
          >
            <CategoryForm
              key={editing === "new" ? "new" : editing.id}
              row={editing === "new" ? null : editing}
              rows={rows}
              save={actions.save}
              onDone={() => setEditing(null)}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </>
  );
}

function CategoryRow({
  row,
  depth,
  first,
  last,
  actions,
  canWrite,
  onEdit,
  locale,
}: {
  row: AdminCategoryRow;
  depth: number;
  first: boolean;
  last: boolean;
  actions: Actions;
  canWrite: boolean;
  onEdit: () => void;
  locale: string;
}) {
  const t = useTranslations("admin.categories");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (r.ok && r.message) toast.success(r.message);
      else if (!r.ok && r.message) toast.error(r.message);
    });
  return (
    <li
      className={cn("flex items-center gap-3 px-3 py-2.5 sm:px-4", pending && "opacity-60")}
      style={{ paddingInlineStart: `${0.75 + depth * 1.5}rem` }}
    >
      <span className="block size-11 shrink-0 overflow-hidden petal-sm bg-surface-muted">
        <MediaImage image={row.image} sizes="44px" alt="" locale={locale} className="size-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{name(row.name, locale)}</span>
          {!row.isActive ? <Badge>{t("hidden")}</Badge> : null}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t("products", { count: row.productCount })}
        </span>
      </span>
      {canWrite ? (
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
          <IconButton label={tCommon("edit")} onClick={onEdit}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton
            label={confirming ? t("confirmDelete") : tCommon("delete")}
            danger
            active={confirming}
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                window.setTimeout(() => setConfirming(false), 4000);
                return;
              }
              setConfirming(false);
              run(() => actions.remove(row.id));
            }}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </span>
      ) : null}
    </li>
  );
}

function CategoryForm({
  row,
  rows,
  save,
  onDone,
}: {
  row: AdminCategoryRow | null;
  rows: AdminCategoryRow[];
  save: Actions["save"];
  onDone: () => void;
}) {
  const t = useTranslations("admin.categories");
  const tCommon = useTranslations("common");
  const tEditor = useTranslations("admin.productEditor");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [error, setError] = useState<Result | null>(null);
  const [v, setV] = useState({
    nameAr: row?.name.ar ?? "",
    nameEn: row?.name.en ?? "",
    descAr: row?.description?.ar ?? "",
    descEn: row?.description?.en ?? "",
    parentId: row?.parentId ?? "",
    isActive: row?.isActive ?? true,
    slug: row?.slug ?? "",
  });
  const [image, setImage] = useState<ImageDTO | null>(row?.image ?? null);

  // A category cannot move under itself or one of its descendants.
  const blocked = new Set<string>();
  if (row) {
    const stack = [row.id];
    while (stack.length) {
      const id = stack.pop()!;
      blocked.add(id);
      for (const r of rows) if (r.parentId === id) stack.push(r.id);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.nameAr.trim()) {
      setError({
        ok: false,
        field: "name",
        message: `${t("nameAr")}: ${tEditor("errors.required")}`,
      });
      return;
    }
    start(async () => {
      const r = await save(row?.id ?? null, {
        name: { ar: v.nameAr.trim(), ...(v.nameEn.trim() ? { en: v.nameEn.trim() } : {}) },
        description: {
          ...(v.descAr.trim() ? { ar: v.descAr.trim() } : {}),
          ...(v.descEn.trim() ? { en: v.descEn.trim() } : {}),
        },
        parentId: v.parentId || null,
        imageId: image?.id ?? null,
        isActive: v.isActive,
        slug: v.slug.trim() || undefined,
        sortOrder: row?.sortOrder ?? rows.filter((r) => r.parentId === (v.parentId || null)).length,
      });
      if (r.ok) {
        toast.success(r.message ?? t("saved"));
        onDone();
      } else setError(r);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-4 pt-1 pb-6" noValidate>
      {error?.message ? <Alert tone="danger">{error.message}</Alert> : null}
      <Field label={t("nameAr")} htmlFor="c-nameAr">
        <Input
          id="c-nameAr"
          value={v.nameAr}
          onChange={(e) => setV({ ...v, nameAr: e.target.value })}
          maxLength={80}
          aria-invalid={error?.field === "name"}
        />
      </Field>
      <Field label={t("nameEn")} htmlFor="c-nameEn" optionalText={tCommon("optional")}>
        <Input
          id="c-nameEn"
          dir="ltr"
          value={v.nameEn}
          onChange={(e) => setV({ ...v, nameEn: e.target.value })}
          maxLength={80}
        />
      </Field>
      <Field label={t("parent")} htmlFor="c-parent">
        <NativeSelect
          id="c-parent"
          value={v.parentId}
          onChange={(e) => setV({ ...v, parentId: e.target.value })}
        >
          <option value="">{t("noParent")}</option>
          {rows
            .filter((r) => !blocked.has(r.id))
            .map((r) => (
              <option key={r.id} value={r.id}>
                {name(r.name, locale)}
              </option>
            ))}
        </NativeSelect>
      </Field>
      <Field label={t("image")} htmlFor="c-image">
        <SingleImageField image={image} onChange={setImage} locale={locale} />
      </Field>
      <Field label={t("description")} htmlFor="c-desc" optionalText={tCommon("optional")}>
        <Textarea
          id="c-desc"
          rows={2}
          value={v.descAr}
          onChange={(e) => setV({ ...v, descAr: e.target.value })}
          maxLength={1000}
        />
      </Field>
      <Field
        label={`${t("description")} (EN)`}
        htmlFor="c-desc-en"
        optionalText={tCommon("optional")}
      >
        <Textarea
          id="c-desc-en"
          dir="ltr"
          rows={2}
          value={v.descEn}
          onChange={(e) => setV({ ...v, descEn: e.target.value })}
          maxLength={1000}
        />
      </Field>
      <Field
        label={t("slug")}
        htmlFor="c-slug"
        hint={tEditor("slugHint")}
        error={error?.field === "slug" ? error.message : undefined}
      >
        <Input
          id="c-slug"
          value={v.slug}
          onChange={(e) => setV({ ...v, slug: e.target.value })}
          maxLength={80}
        />
      </Field>
      <label className="flex items-center justify-between gap-3 text-sm font-medium">
        {t("active")}
        <Switch checked={v.isActive} onCheckedChange={(on) => setV({ ...v, isActive: on })} />
      </label>
      {row ? <p className="text-xs text-muted-foreground">{t("deleteHint")}</p> : null}
      <Button type="submit" block size="lg" loading={pending}>
        {tCommon("save")}
      </Button>
    </form>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-30",
        danger && "hover:bg-danger-soft hover:text-danger",
        active && "bg-danger text-white hover:bg-danger hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
