"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useContext, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import type { LocalizedText } from "@/lib/localized";
import { MoneyField } from "../kit";

export type SettingsResult =
  { ok: true; message: string } | { ok: false; message: string; fields?: Record<string, string> };

export type SaveSection = (
  section: string,
  input: Record<string, unknown>,
) => Promise<SettingsResult>;

type ShellState = { showEnglish: boolean; errors: Record<string, string> };
const ShellContext = createContext<ShellState>({ showEnglish: false, errors: {} });

/** Field-level error for a dotted path ("contact.email"), from the last save attempt. */
export function useFieldError(path: string): string | undefined {
  return useContext(ShellContext).errors[path];
}

/**
 * One settings section: title, optional English fields, the section's cards and a save bar that
 * stays in reach on phones. `collect` returns the section value to save, or a map of field errors.
 */
export function SettingsShell({
  section,
  title,
  description,
  save,
  collect,
  dirty,
  hasEnglish,
  bilingual = true,
  children,
}: {
  section: string;
  title: string;
  description?: string;
  save: SaveSection;
  collect: () => { value: Record<string, unknown> } | { errors: Record<string, string> };
  dirty: boolean;
  hasEnglish: boolean;
  bilingual?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("admin.settings");
  const [showEnglish, setShowEnglish] = useState(hasEnglish);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const collected = collect();
    if ("errors" in collected) {
      setErrors(collected.errors);
      setBanner(t("fixErrors"));
      focusFirstError();
      return;
    }
    start(async () => {
      const result = await save(section, collected.value);
      if (result.ok) {
        setErrors({});
        setBanner(null);
        toast.success(result.message);
      } else {
        setErrors(result.fields ?? {});
        setBanner(result.message);
        focusFirstError();
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4 ltr:rotate-180" aria-hidden="true" />
        {t("title")}
      </Link>
      <h1 className="mt-1 font-display text-[1.8rem] leading-tight font-bold">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}

      <div className="mt-5 space-y-5">
        {banner ? (
          <Alert tone="danger" role="alert">
            {banner}
          </Alert>
        ) : null}
        {bilingual ? (
          <label className="flex items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-3 text-sm shadow-card">
            <span>
              <span className="block font-medium">{t("english")}</span>
              <span className="block text-xs text-muted-foreground">{t("englishHint")}</span>
            </span>
            <Switch checked={showEnglish} onCheckedChange={setShowEnglish} />
          </label>
        ) : null}
        <ShellContext.Provider value={{ showEnglish, errors }}>{children}</ShellContext.Provider>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-end gap-3 border-t bg-background/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {dirty ? (
          <span className="me-auto text-xs text-muted-foreground" aria-live="polite">
            {t("unsaved")}
          </span>
        ) : null}
        <Button type="submit" size="lg" loading={pending} className="max-sm:flex-1">
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

function focusFirstError() {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (el?.matches("input, textarea, select")) el.focus({ preventScroll: true });
  });
}

/**
 * A text that has an Arabic value and, when English fields are shown, an English one.
 * Error keys: `${path}` for the Arabic field (the one owners must fill).
 */
export function LocalizedInput({
  id,
  path,
  label,
  value,
  onChange,
  max,
  rows,
  hint,
  optional,
  placeholder,
}: {
  id: string;
  path: string;
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  max: number;
  rows?: number;
  hint?: React.ReactNode;
  optional?: boolean;
  placeholder?: string;
}) {
  const { showEnglish } = useContext(ShellContext);
  const tCommon = useTranslations("common");
  const error = useFieldError(path);
  const control = (lang: "ar" | "en") => {
    const props = {
      id: lang === "ar" ? id : `${id}-en`,
      dir: lang === "en" ? ("ltr" as const) : undefined,
      value: value[lang] ?? "",
      maxLength: max,
      placeholder: lang === "ar" ? placeholder : undefined,
      "aria-invalid": lang === "ar" && error ? true : undefined,
    };
    const update = (text: string) => onChange({ ...value, [lang]: text });
    return rows ? (
      <Textarea {...props} rows={rows} onChange={(e) => update(e.target.value)} />
    ) : (
      <Input {...props} onChange={(e) => update(e.target.value)} />
    );
  };
  return (
    <>
      <Field
        label={label}
        htmlFor={id}
        hint={hint}
        error={error}
        optionalText={optional ? tCommon("optional") : undefined}
      >
        {control("ar")}
      </Field>
      {showEnglish ? (
        <Field label={`${label} (English)`} htmlFor={`${id}-en`} optionalText={tCommon("optional")}>
          {control("en")}
        </Field>
      ) : null}
    </>
  );
}

/** Plain text/email/url field wired to the shell's error map. */
export function TextSetting({
  id,
  path,
  label,
  value,
  onChange,
  hint,
  optional,
  type = "text",
  dir,
  max = 200,
  placeholder,
  inputMode,
}: {
  id: string;
  path: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: React.ReactNode;
  optional?: boolean;
  type?: string;
  dir?: "ltr" | "rtl";
  max?: number;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const tCommon = useTranslations("common");
  const error = useFieldError(path);
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      optionalText={optional ? tCommon("optional") : undefined}
    >
      <Input
        id={id}
        type={type}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={max}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    </Field>
  );
}

/** Amount field (major units as text) wired to the shell's error map. */
export function MoneySetting({
  path,
  optional,
  ...props
}: Omit<React.ComponentProps<typeof MoneyField>, "error" | "optionalText"> & {
  path: string;
  optional?: boolean;
}) {
  const tCommon = useTranslations("common");
  const error = useFieldError(path);
  return (
    <MoneyField
      {...props}
      error={error}
      optionalText={optional ? tCommon("optional") : undefined}
    />
  );
}

/** Trimmed copy of a localized value without blank languages. */
export function cleanText(v: LocalizedText): LocalizedText {
  return {
    ...(v.ar?.trim() ? { ar: v.ar.trim() } : {}),
    ...(v.en?.trim() ? { en: v.en.trim() } : {}),
  };
}

export const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
