"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { BrandIcon, socialHref, type BrandIconName } from "@/components/store/brand-icon";
import { Field } from "@/components/ui/label";
import type { ImageDTO } from "@/server/services/media";
import type { SettingsMap } from "@/server/services/settings";
import { SingleImageField } from "../image-uploader";
import { AdminCard } from "../kit";
import {
  cleanText,
  LocalizedInput,
  sameJson,
  SettingsShell,
  TextSetting,
  type SaveSection,
} from "./shell";

type General = SettingsMap["general"];
type Social = General["social"];
const SOCIALS = Object.keys({
  instagram: 0,
  facebook: 0,
  tiktok: 0,
  x: 0,
  snapchat: 0,
  telegram: 0,
  youtube: 0,
} satisfies Record<keyof Social, 0>) as (keyof Social)[];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digitCount = (s: string) =>
  s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, "").length;

export function GeneralSettingsForm({
  initial,
  logo: initialLogo,
  region,
  save,
}: {
  initial: General;
  logo: ImageDTO | null;
  region: { country: string; currency: string; timeZone: string };
  save: SaveSection;
}) {
  const t = useTranslations("admin.settings");
  const locale = useLocale();
  const [v, setV] = useState(() => ({
    storeName: initial.storeName,
    tagline: initial.tagline,
    contact: initial.contact,
    social: initial.social,
  }));
  const [logo, setLogo] = useState<ImageDTO | null>(initialLogo);
  const setContact = (patch: Partial<General["contact"]>) =>
    setV((p) => ({ ...p, contact: { ...p.contact, ...patch } }));

  const value = (s: typeof v, logoId: string | null) => ({
    storeName: cleanText(s.storeName),
    tagline: cleanText(s.tagline),
    logoMediaId: logoId,
    contact: {
      phone: s.contact.phone.trim(),
      whatsapp: s.contact.whatsapp.trim(),
      email: s.contact.email.trim(),
      address: cleanText(s.contact.address),
      workingHours: cleanText(s.contact.workingHours),
    },
    social: Object.fromEntries(SOCIALS.map((k) => [k, s.social[k].trim()])) as Social,
  });
  const current = value(v, logo?.id ?? null);
  const dirty = !sameJson(current, value(initial, initial.logoMediaId));

  function collect() {
    const errors: Record<string, string> = {};
    if (!current.storeName.ar && !current.storeName.en) errors.storeName = t("errors.storeName");
    if (current.contact.email && !EMAIL.test(current.contact.email))
      errors["contact.email"] = t("errors.email");
    for (const key of ["phone", "whatsapp"] as const) {
      const n = digitCount(current.contact[key]);
      if (current.contact[key] && (n < 8 || n > 15)) errors[`contact.${key}`] = t("errors.phone");
    }
    for (const key of SOCIALS)
      if (current.social[key] && !socialHref(key, current.social[key]))
        errors[`social.${key}`] = t("errors.social");
    return Object.keys(errors).length ? { errors } : { value: current };
  }

  return (
    <SettingsShell
      section="general"
      title={t("sections.general.title")}
      description={t("sections.general.description")}
      save={save}
      collect={collect}
      dirty={dirty}
      hasEnglish={Boolean(initial.storeName.en || initial.tagline.en)}
    >
      <AdminCard title={t("general.identity")}>
        <LocalizedInput
          id="storeName"
          path="storeName"
          label={t("general.storeName")}
          value={v.storeName}
          onChange={(storeName) => setV((p) => ({ ...p, storeName }))}
          max={80}
        />
        <LocalizedInput
          id="tagline"
          path="tagline"
          label={t("general.tagline")}
          hint={t("general.taglineHint")}
          value={v.tagline}
          onChange={(tagline) => setV((p) => ({ ...p, tagline }))}
          max={160}
          optional
        />
        <Field label={t("general.logo")} htmlFor="logo" hint={t("general.logoHint")}>
          <SingleImageField image={logo} onChange={setLogo} locale={locale} />
        </Field>
      </AdminCard>

      <AdminCard title={t("general.contact")} description={t("general.contactHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextSetting
            id="phone"
            path="contact.phone"
            label={t("general.phone")}
            type="tel"
            dir="ltr"
            value={v.contact.phone}
            onChange={(phone) => setContact({ phone })}
            placeholder="+964 770 123 4567"
            max={30}
            optional
          />
          <TextSetting
            id="whatsapp"
            path="contact.whatsapp"
            label={t("general.whatsapp")}
            hint={t("general.whatsappHint")}
            type="tel"
            dir="ltr"
            value={v.contact.whatsapp}
            onChange={(whatsapp) => setContact({ whatsapp })}
            placeholder="+964 770 123 4567"
            max={30}
            optional
          />
        </div>
        <TextSetting
          id="email"
          path="contact.email"
          label={t("general.email")}
          type="email"
          dir="ltr"
          value={v.contact.email}
          onChange={(email) => setContact({ email })}
          optional
        />
        <LocalizedInput
          id="address"
          path="contact.address"
          label={t("general.address")}
          value={v.contact.address}
          onChange={(address) => setContact({ address })}
          max={300}
          rows={2}
          optional
        />
        <LocalizedInput
          id="hours"
          path="contact.workingHours"
          label={t("general.hours")}
          placeholder={t("general.hoursPlaceholder")}
          value={v.contact.workingHours}
          onChange={(workingHours) => setContact({ workingHours })}
          max={160}
          optional
        />
      </AdminCard>

      <AdminCard title={t("general.social")} description={t("general.socialHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map((key) => (
            <SocialField
              key={key}
              name={key}
              value={v.social[key]}
              onChange={(text) => setV((p) => ({ ...p, social: { ...p.social, [key]: text } }))}
            />
          ))}
        </div>
      </AdminCard>

      <AdminCard title={t("general.region")} description={t("general.regionHint")}>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          {(
            [
              ["country", region.country],
              ["currency", region.currency],
              ["timeZone", region.timeZone],
            ] as const
          ).map(([key, text]) => (
            <div key={key} className="rounded-xl bg-surface-muted px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{t(`general.${key}`)}</dt>
              <dd className="mt-0.5 font-medium">
                <bdi>{text}</bdi>
              </dd>
            </div>
          ))}
        </dl>
      </AdminCard>
    </SettingsShell>
  );
}

function SocialField({
  name,
  value,
  onChange,
}: {
  name: Exclude<BrandIconName, "whatsapp">;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("admin.settings");
  return (
    <div className="flex items-end gap-2.5">
      <span className="mb-3 flex size-6 shrink-0 items-center justify-center text-muted-foreground">
        <BrandIcon name={name} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <TextSetting
          id={`social-${name}`}
          path={`social.${name}`}
          label={t(`general.socials.${name}`)}
          dir="ltr"
          value={value}
          onChange={onChange}
          placeholder={t("general.socialPlaceholder")}
          optional
        />
      </div>
    </div>
  );
}
