"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/label";
import { tl, type LocalizedText } from "@/lib/localized";
import type { ImageDTO } from "@/server/services/media";
import type { SettingsMap } from "@/server/services/settings";
import { SingleImageField } from "../image-uploader";
import { AdminCard } from "../kit";
import { cleanText, LocalizedInput, sameJson, SettingsShell, type SaveSection } from "./shell";

type Seo = SettingsMap["seo"];
const TITLE_MAX = 70;
const DESCRIPTION_MAX = 170;

export function SeoSettingsForm({
  initial,
  shareImage: initialImage,
  storeName,
  tagline,
  siteUrl,
  save,
}: {
  initial: Seo;
  shareImage: ImageDTO | null;
  storeName: string;
  tagline: string;
  siteUrl: string;
  save: SaveSection;
}) {
  const t = useTranslations("admin.settings");
  const locale = useLocale();
  const [title, setTitle] = useState<LocalizedText>(initial.title);
  const [description, setDescription] = useState<LocalizedText>(initial.description);
  const [image, setImage] = useState<ImageDTO | null>(initialImage);

  const current = {
    title: cleanText(title),
    description: cleanText(description),
    ogImageMediaId: image?.id ?? null,
  };
  const dirty = !sameJson(current, {
    title: cleanText(initial.title),
    description: cleanText(initial.description),
    ogImageMediaId: initial.ogImageMediaId,
  });

  return (
    <SettingsShell
      section="seo"
      title={t("sections.seo.title")}
      description={t("sections.seo.description")}
      save={save}
      collect={() => ({ value: current })}
      dirty={dirty}
      hasEnglish={Boolean(initial.title.en || initial.description.en)}
    >
      <AdminCard title={t("seo.search")} description={t("seo.searchHint")}>
        <LocalizedInput
          id="seo-title"
          path="title"
          label={t("seo.title")}
          hint={<Counter text={title.ar} max={TITLE_MAX} />}
          placeholder={storeName}
          value={title}
          onChange={setTitle}
          max={TITLE_MAX}
          optional
        />
        <LocalizedInput
          id="seo-description"
          path="description"
          label={t("seo.descriptionLabel")}
          hint={<Counter text={description.ar} max={DESCRIPTION_MAX} />}
          placeholder={tagline}
          value={description}
          onChange={setDescription}
          max={DESCRIPTION_MAX}
          rows={3}
          optional
        />
        <SearchPreview
          url={siteUrl}
          title={tl(current.title, locale) || storeName}
          description={tl(current.description, locale) || tagline}
        />
      </AdminCard>

      <AdminCard title={t("seo.share")} description={t("seo.shareHint")}>
        <Field label={t("seo.shareImage")} htmlFor="share-image">
          <SingleImageField image={image} onChange={setImage} locale={locale} />
        </Field>
      </AdminCard>
    </SettingsShell>
  );
}

function Counter({ text, max }: { text: string | undefined; max: number }) {
  const t = useTranslations("admin.settings");
  const n = text?.length ?? 0;
  return (
    <span className={n > max * 0.9 ? "text-warning" : undefined}>
      {t("seo.counter", { n, max })}
    </span>
  );
}

/** Roughly how the home page looks in search results. */
function SearchPreview({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  const t = useTranslations("admin.settings");
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <figure className="rounded-xl border bg-background p-4">
      <figcaption className="mb-2 text-xs font-medium text-muted-foreground">
        {t("seo.preview")}
      </figcaption>
      <p dir="ltr" className="truncate text-start text-xs text-muted-foreground">
        {host}
      </p>
      <p className="mt-0.5 line-clamp-1 text-lg leading-snug text-[#1a0dab]">{title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
    </figure>
  );
}
