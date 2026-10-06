"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { LocalizedText } from "@/lib/localized";
import { editableToHtml, htmlToEditable } from "@/lib/rich-text";
import { isValidSlug } from "@/lib/slug";
import type { PageEditDTO } from "@/server/services/content";
import { AdminCard, ToggleRow, useConfirm } from "./kit";
import {
  cleanText,
  EditorShell,
  LocalizedInput,
  TextSetting,
  type SettingsResult,
} from "./settings/shell";

/** Static page editor: plain text with light formatting, stored as sanitized HTML. */
export function PageEditor({
  page,
  viewHref,
  save,
  remove,
}: {
  page: PageEditDTO | null;
  viewHref: string | null;
  save: (id: string | null, input: Record<string, unknown>) => Promise<SettingsResult>;
  remove: (id: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const t = useTranslations("admin.pages");
  const router = useRouter();
  const [title, setTitle] = useState<LocalizedText>(page?.title ?? {});
  const [content, setContent] = useState<LocalizedText>(() => ({
    ar: htmlToEditable(page?.content.ar),
    en: htmlToEditable(page?.content.en),
  }));
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [isPublished, setPublished] = useState(page?.isPublished ?? true);
  const [showInFooter, setFooter] = useState(page?.showInFooter ?? true);
  const [seoTitle, setSeoTitle] = useState<LocalizedText>(page?.seo?.title ?? {});
  const [seoDescription, setSeoDescription] = useState<LocalizedText>(page?.seo?.description ?? {});

  const value = () => {
    const seo = { title: cleanText(seoTitle), description: cleanText(seoDescription) };
    return {
      title: cleanText(title),
      content: {
        ...(content.ar?.trim() ? { ar: editableToHtml(content.ar) } : {}),
        ...(content.en?.trim() ? { en: editableToHtml(content.en) } : {}),
      },
      slug: slug.trim() || undefined,
      isPublished,
      showInFooter,
      seo: Object.keys(seo.title).length || Object.keys(seo.description).length ? seo : undefined,
    };
  };
  const [initial] = useState(() => JSON.stringify(value()));
  const dirty = initial !== JSON.stringify(value());

  function collect() {
    const v = value();
    const errors: Record<string, string> = {};
    if (!v.title.ar && !v.title.en) errors.title = t("errors.title");
    if (v.slug && !isValidSlug(v.slug)) errors.slug = t("errors.slug");
    return Object.keys(errors).length ? { errors } : { value: v };
  }

  return (
    <EditorShell
      backHref="/admin/pages"
      backLabel={t("title")}
      title={page ? t("edit") : t("new")}
      actions={
        <>
          {viewHref ? (
            <a
              href={viewHref}
              target="_blank"
              rel="noopener"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-surface px-3 text-sm font-medium hover:bg-surface-muted"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              {t("view")}
            </a>
          ) : null}
          {page && !page.systemKey ? <DeletePage id={page.id} remove={remove} /> : null}
        </>
      }
      save={(input) => save(page?.id ?? null, input)}
      onSaved={(r) => {
        if (!page && r.id) router.replace(`/admin/pages/${r.id}`);
      }}
      collect={collect}
      dirty={dirty}
      hasEnglish={Boolean(page?.title.en || page?.content.en)}
    >
      {page?.systemKey ? (
        <p className="rounded-2xl bg-info-soft px-4 py-3 text-sm">{t("systemHint")}</p>
      ) : null}
      <AdminCard>
        <LocalizedInput
          id="page-title"
          path="title"
          label={t("pageTitle")}
          value={title}
          onChange={setTitle}
          max={120}
        />
        <LocalizedInput
          id="page-content"
          path="content"
          label={t("content")}
          value={content}
          onChange={setContent}
          max={50_000}
          rows={14}
          hint={<FormatHelp />}
        />
      </AdminCard>

      <AdminCard title={t("publishing")}>
        <ToggleRow
          label={t("published")}
          hint={t("publishedHint")}
          checked={isPublished}
          onChange={setPublished}
        />
        <ToggleRow
          label={t("inFooter")}
          hint={t("inFooterHint")}
          checked={showInFooter}
          onChange={setFooter}
        />
        <TextSetting
          id="page-slug"
          path="slug"
          label={t("slug")}
          hint={t("slugHint")}
          dir="ltr"
          value={slug}
          onChange={(v) => setSlug(v.toLowerCase().replace(/\s+/g, "-"))}
          placeholder="about-us"
          max={80}
          optional
        />
      </AdminCard>

      <details
        className="group rounded-2xl border bg-surface shadow-card"
        open={Boolean(page?.seo)}
      >
        <summary className="cursor-pointer list-none px-4 py-3.5 font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
          {t("seo")}
          <span className="block text-sm font-normal text-muted-foreground">{t("seoHint")}</span>
        </summary>
        <div className="space-y-4 border-t px-4 py-4 sm:px-5">
          <LocalizedInput
            id="page-seo-title"
            path="seo.title"
            label={t("seoTitle")}
            value={seoTitle}
            onChange={setSeoTitle}
            max={70}
            optional
          />
          <LocalizedInput
            id="page-seo-description"
            path="seo.description"
            label={t("seoDescription")}
            value={seoDescription}
            onChange={setSeoDescription}
            max={170}
            rows={3}
            optional
          />
        </div>
      </details>
    </EditorShell>
  );
}

function FormatHelp() {
  const t = useTranslations("admin.pages.format");
  return (
    <span className="mt-1 grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
      {(["heading", "list", "numbered", "bold"] as const).map((k) => (
        <span key={k}>
          <code dir="auto" className="rounded bg-surface-muted px-1 font-sans">
            {t(`${k}.syntax`)}
          </code>{" "}
          {t(`${k}.result`)}
        </span>
      ))}
      <span className="sm:col-span-2">{t("paragraph")}</span>
    </span>
  );
}

function DeletePage({
  id,
  remove,
}: {
  id: string;
  remove: (id: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const t = useTranslations("admin.pages");
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant={confirm.armed ? "danger" : "outline"}
      size="sm"
      loading={busy}
      onClick={async () => {
        if (!confirm.tap()) return;
        setBusy(true);
        const r = await remove(id);
        setBusy(false);
        if (r.ok) {
          toast.success(r.message ?? t("deleted"));
          router.push("/admin/pages");
        } else if (r.message) toast.error(r.message);
      }}
    >
      <Trash2 />
      {confirm.armed ? t("confirmDelete") : t("delete")}
    </Button>
  );
}
