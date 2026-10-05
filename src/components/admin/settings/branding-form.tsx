"use client";

import { Check, Megaphone, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { BRAND_COLOR_PRESETS, brandVariables, type RadiusStyle } from "@/lib/branding";
import { contrastRatio } from "@/lib/color";
import { tl } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { SettingsMap } from "@/server/services/settings";
import { Input } from "@/components/ui/input";
import { AdminCard, ToggleRow } from "../kit";
import {
  cleanText,
  LocalizedInput,
  sameJson,
  SettingsShell,
  TextSetting,
  useFieldError,
  type SaveSection,
} from "./shell";

type Branding = SettingsMap["branding"];
const HEX = /^#[0-9a-f]{6}$/i;
const RADII: RadiusStyle[] = ["sharp", "soft", "round"];

export function BrandingSettingsForm({
  initial,
  storeName,
  save,
}: {
  initial: Branding;
  storeName: string;
  save: SaveSection;
}) {
  const t = useTranslations("admin.settings");
  const [color, setColor] = useState(initial.primaryColor);
  const [hexText, setHexText] = useState(initial.primaryColor);
  const [radius, setRadius] = useState<RadiusStyle>(initial.radius);
  const [announcement, setAnnouncement] = useState(initial.announcement);

  const snapshot = (c: string, r: RadiusStyle, a: Branding["announcement"]) => ({
    primaryColor: c.toLowerCase(),
    radius: r,
    announcement: { enabled: a.enabled, text: cleanText(a.text), link: a.link.trim() },
  });
  const current = snapshot(color, radius, announcement);
  const dirty = !sameJson(
    current,
    snapshot(initial.primaryColor, initial.radius, initial.announcement),
  );

  function pick(hex: string) {
    setColor(hex);
    setHexText(hex);
  }

  function collect() {
    const errors: Record<string, string> = {};
    if (!HEX.test(hexText.trim())) errors.primaryColor = t("errors.color");
    const link = current.announcement.link;
    if (link && !(/^\/(?!\/)/.test(link) || /^https?:\/\/\S+$/i.test(link)))
      errors["announcement.link"] = t("errors.link");
    if (
      current.announcement.enabled &&
      !current.announcement.text.ar &&
      !current.announcement.text.en
    )
      errors["announcement.text"] = t("errors.announcement");
    return Object.keys(errors).length ? { errors } : { value: current };
  }

  return (
    <SettingsShell
      section="branding"
      title={t("sections.branding.title")}
      description={t("sections.branding.description")}
      save={save}
      collect={collect}
      dirty={dirty}
      hasEnglish={Boolean(initial.announcement.text.en)}
    >
      <AdminCard title={t("branding.color")} description={t("branding.colorHint")}>
        <ColorPicker color={color} hexText={hexText} onPick={pick} onHexText={setHexText} />
      </AdminCard>

      <AdminCard title={t("branding.corners")}>
        <div
          className="grid grid-cols-3 gap-2.5"
          role="radiogroup"
          aria-label={t("branding.corners")}
        >
          {RADII.map((r) => (
            <label
              key={r}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                radius === r
                  ? "border-primary bg-primary-soft text-primary"
                  : "hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name="radius"
                value={r}
                checked={radius === r}
                onChange={() => setRadius(r)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="h-9 w-14 border-2 border-current bg-surface"
                style={{ borderRadius: { sharp: "0.25rem", soft: "0.6rem", round: "1.1rem" }[r] }}
              />
              {t(`branding.radius.${r}`)}
            </label>
          ))}
        </div>
      </AdminCard>

      <AdminCard title={t("branding.preview")}>
        <BrandPreview
          color={HEX.test(color) ? color : initial.primaryColor}
          radius={radius}
          storeName={storeName}
        />
      </AdminCard>

      <AdminCard title={t("branding.announcement")} description={t("branding.announcementHint")}>
        <ToggleRow
          label={t("branding.announcementOn")}
          checked={announcement.enabled}
          onChange={(enabled) => setAnnouncement((a) => ({ ...a, enabled }))}
        />
        <LocalizedInput
          id="announcement"
          path="announcement.text"
          label={t("branding.announcementText")}
          placeholder={t("branding.announcementPlaceholder")}
          value={announcement.text}
          onChange={(text) => setAnnouncement((a) => ({ ...a, text }))}
          max={160}
        />
        <TextSetting
          id="announcement-link"
          path="announcement.link"
          label={t("branding.announcementLink")}
          hint={t("branding.announcementLinkHint")}
          dir="ltr"
          value={announcement.link}
          onChange={(link) => setAnnouncement((a) => ({ ...a, link }))}
          placeholder="/c/sale"
          max={500}
          optional
        />
        {announcement.enabled && (announcement.text.ar || announcement.text.en) ? (
          <AnnouncementPreview
            color={HEX.test(color) ? color : initial.primaryColor}
            text={announcement.text}
          />
        ) : null}
      </AdminCard>
    </SettingsShell>
  );
}

function ColorPicker({
  color,
  hexText,
  onPick,
  onHexText,
}: {
  color: string;
  hexText: string;
  onPick: (hex: string) => void;
  onHexText: (text: string) => void;
}) {
  const t = useTranslations("admin.settings");
  const error = useFieldError("primaryColor");
  const valid = HEX.test(color);
  const contrast = valid ? contrastRatio(color, "#ffffff") : 21;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t("branding.presets")}>
        {BRAND_COLOR_PRESETS.map((hex) => {
          const selected = color.toLowerCase() === hex;
          return (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={hex}
              onClick={() => onPick(hex)}
              className={cn(
                "flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                selected ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border",
              )}
              style={{ backgroundColor: hex }}
            >
              {selected ? <Check className="size-5 text-white" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-end gap-3">
        <label className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border shadow-xs">
          <span className="sr-only">{t("branding.custom")}</span>
          <input
            type="color"
            value={valid ? color : "#3d2c8d"}
            onChange={(e) => onPick(e.target.value)}
            className="absolute -inset-2 size-16 cursor-pointer"
          />
        </label>
        <div className="min-w-0 flex-1">
          <label htmlFor="primary-hex" className="text-sm font-medium">
            {t("branding.custom")}
          </label>
          <Input
            id="primary-hex"
            dir="ltr"
            value={hexText}
            onChange={(e) => {
              const text = e.target.value.trim();
              onHexText(text);
              const hex = text.startsWith("#") ? text : `#${text}`;
              if (HEX.test(hex)) onPick(hex.toLowerCase());
            }}
            maxLength={7}
            className="mt-1.5 font-mono uppercase"
            aria-invalid={error ? true : undefined}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : contrast < 3 ? (
        <p role="status" className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm">
          {t("branding.tooLight")}
        </p>
      ) : contrast < 4.5 ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("branding.lowContrast")}
        </p>
      ) : null}
    </div>
  );
}

/** A miniature product card painted with the chosen brand (CSS variables scoped to it). */
function BrandPreview({
  color,
  radius,
  storeName,
}: {
  color: string;
  radius: RadiusStyle;
  storeName: string;
}) {
  const t = useTranslations("admin.settings.branding");
  return (
    <div
      style={brandVariables(color, radius) as React.CSSProperties}
      className="rounded-2xl bg-background p-4"
      aria-hidden="true"
    >
      <p className="font-display text-lg font-bold text-primary">{storeName}</p>
      <div className="mt-3 flex gap-3 rounded-xl border bg-surface p-3 shadow-card">
        <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-lg bg-[linear-gradient(135deg,var(--primary-soft),var(--surface-muted))]">
          <span className="absolute start-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold text-primary-foreground">
            {t("sampleBadge")}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-sm font-medium">{t("sampleProduct")}</p>
          <p className="mt-1 font-bold text-primary">{t("samplePrice")}</p>
          <span className="mt-1 w-fit rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
            {t("sampleChip")}
          </span>
          <span className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            <ShoppingBag className="size-4" />
            {t("sampleButton")}
          </span>
        </div>
      </div>
    </div>
  );
}

function AnnouncementPreview({
  color,
  text,
}: {
  color: string;
  text: { ar?: string; en?: string };
}) {
  const locale = useLocale();
  return (
    <div
      style={brandVariables(color, "soft") as React.CSSProperties}
      className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
      aria-hidden="true"
    >
      <Megaphone className="size-4 shrink-0" />
      {tl(text, locale)}
    </div>
  );
}
