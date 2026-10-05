"use client";

import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Switch } from "@/components/ui/checkbox";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { Link, useRouter } from "@/i18n/navigation";
import type { LocalizedText } from "@/lib/localized";
import { moneyInputValue, parseMoneyInput, type CurrencyConfig } from "@/lib/money";
import { editableToHtml, htmlToEditable } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import type { ProductEditDTO } from "@/server/services/admin-catalog";
import type { ProductInput } from "@/server/services/catalog-admin";
import type { ImageDTO } from "@/server/services/media";
import { ImageGallery } from "./image-uploader";

type SaveResult =
  { ok: true; id: string; slug: string } | { ok: false; message: string; field?: string };

type OptionState = {
  key: string;
  nameAr: string;
  nameEn: string;
  isColor: boolean;
  values: { id: string; ar: string; en: string; color: string }[];
};
type VariantState = {
  key: string;
  id?: string;
  optionValueIds: string[];
  price: string;
  compareAt: string;
  cost: string;
  stock: string;
  baseline?: number;
  sku: string;
  track: boolean;
  active: boolean;
  imageId: string | null;
};

const STATUSES = ["active", "draft", "archived"] as const;

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const comboKey = (ids: string[]) => (ids.length ? ids.join("|") : "default");

function combinations(options: OptionState[]): string[][] {
  return options.reduce<string[][]>(
    (acc, o) => acc.flatMap((prefix) => o.values.map((v) => [...prefix, v.id])),
    [[]],
  );
}

function blankVariant(optionValueIds: string[], template?: VariantState): VariantState {
  return {
    key: comboKey(optionValueIds),
    optionValueIds,
    price: template?.price ?? "",
    compareAt: template?.compareAt ?? "",
    cost: template?.cost ?? "",
    stock: "0",
    sku: "",
    track: template?.track ?? true,
    active: true,
    imageId: null,
  };
}

const lt = (ar: string, en: string): LocalizedText => {
  const value: LocalizedText = {};
  if (ar.trim()) value.ar = ar.trim();
  if (en.trim()) value.en = en.trim();
  return value;
};

export function ProductEditor({
  product,
  categories,
  currency,
  saveAction,
  deleteAction,
}: {
  product: ProductEditDTO | null;
  categories: { id: string; label: string }[];
  currency: CurrencyConfig;
  saveAction: (id: string | null, input: ProductInput) => Promise<SaveResult>;
  deleteAction: (id: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const t = useTranslations("admin.productEditor");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startSave] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const d = currency.decimals;

  const [f, setF] = useState(() => ({
    nameAr: product?.name.ar ?? "",
    nameEn: product?.name.en ?? "",
    shortAr: product?.shortDescription?.ar ?? "",
    shortEn: product?.shortDescription?.en ?? "",
    descAr: htmlToEditable(product?.description?.ar),
    descEn: htmlToEditable(product?.description?.en),
    brand: product?.brand ?? "",
    tags: (product?.tags ?? []).join("، "),
    status: product?.status ?? ("draft" as (typeof STATUSES)[number]),
    primaryCategoryId: product?.primaryCategoryId ?? "",
    categoryIds: (product?.categoryIds ?? []).filter((id) => id !== product?.primaryCategoryId),
    isFeatured: product?.isFeatured ?? false,
    slug: product?.slug ?? "",
    seoTitleAr: product?.seo?.title?.ar ?? "",
    seoTitleEn: product?.seo?.title?.en ?? "",
    seoDescAr: product?.seo?.description?.ar ?? "",
    seoDescEn: product?.seo?.description?.en ?? "",
  }));
  const [showEnglish, setShowEnglish] = useState(Boolean(product?.name.en));
  const [images, setImages] = useState<ImageDTO[]>(product?.images ?? []);
  const [options, setOptions] = useState<OptionState[]>(() =>
    (product?.options ?? []).map((o) => ({
      key: randomId(),
      nameAr: o.name.ar ?? "",
      nameEn: o.name.en ?? "",
      isColor: o.values.some((v) => v.color),
      values: o.values.map((v) => ({
        id: v.id,
        ar: v.label.ar ?? "",
        en: v.label.en ?? "",
        color: v.color ?? "#000000",
      })),
    })),
  );
  const [variants, setVariants] = useState<VariantState[]>(() =>
    product?.variants.length
      ? product.variants.map((v) => ({
          key: comboKey(v.optionValueIds),
          id: v.id,
          optionValueIds: v.optionValueIds,
          price: moneyInputValue(v.price, d),
          compareAt: moneyInputValue(v.compareAtPrice, d),
          cost: moneyInputValue(v.costPrice, d),
          stock: String(v.stockQuantity),
          baseline: v.stockQuantity,
          sku: v.sku ?? "",
          track: v.trackInventory,
          active: v.isActive,
          imageId: v.imageId,
        }))
      : [blankVariant([])],
  );
  const hasOptions = options.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setError(null);
  };
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    touch();
  };

  /** Rebuild the variant list from the options, keeping what was typed for surviving combinations. */
  function applyOptions(next: OptionState[]) {
    setOptions(next);
    touch();
    setVariants((prev) => {
      const byKey = new Map(prev.map((v) => [v.key, v]));
      const template = prev[0];
      const usable = next.filter((o) => o.values.length > 0);
      if (usable.length === 0) {
        const single = prev.find((v) => v.optionValueIds.length === 0);
        return [
          single ?? {
            ...blankVariant([], template),
            price: template?.price ?? "",
            stock: template?.stock ?? "0",
          },
        ];
      }
      return combinations(usable)
        .slice(0, 150)
        .map((ids) => byKey.get(comboKey(ids)) ?? blankVariant(ids, template));
    });
  }

  const updateVariant = (key: string, patch: Partial<VariantState>) => {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
    touch();
  };

  const labelOf = useMemo(() => {
    const names = new Map<string, string>();
    for (const o of options) for (const v of o.values) names.set(v.id, v.ar || v.en);
    return (ids: string[]) => ids.map((id) => names.get(id) ?? "?").join(" / ");
  }, [options]);

  function validate(): string | null {
    if (!f.nameAr.trim()) return `${t("nameAr")}: ${t("errors.required")}`;
    if (
      hasOptions &&
      options.some(
        (o) => !o.nameAr.trim() || o.values.length === 0 || o.values.some((v) => !v.ar.trim()),
      )
    )
      return t("errors.options");
    for (const v of variants) {
      const price = parseMoneyInput(v.price, d);
      if (price === null) return t("errors.price");
      if (v.compareAt.trim()) {
        const compare = parseMoneyInput(v.compareAt, d);
        if (compare === null || compare <= price) return t("errors.compareAt");
      }
      if (!/^\d+$/.test(v.stock.trim() || "0")) return t("errors.generic");
    }
    return null;
  }

  function buildInput(): ProductInput {
    const seoTitle = lt(f.seoTitleAr, f.seoTitleEn);
    const seoDescription = lt(f.seoDescAr, f.seoDescEn);
    return {
      name: lt(f.nameAr, f.nameEn),
      slug: f.slug.trim() || undefined,
      shortDescription: lt(f.shortAr, f.shortEn),
      description: {
        ar: editableToHtml(f.descAr) || undefined,
        en: editableToHtml(f.descEn) || undefined,
      },
      status: f.status,
      primaryCategoryId: f.primaryCategoryId || null,
      categoryIds: f.categoryIds,
      brand: f.brand.trim() || null,
      tags: f.tags
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30),
      isFeatured: f.isFeatured,
      imageIds: images.map((i) => i.id),
      options: options.map((o) => ({
        name: lt(o.nameAr, o.nameEn),
        values: o.values.map((v) => ({
          id: v.id,
          label: lt(v.ar, v.en),
          ...(o.isColor ? { color: v.color } : {}),
        })),
      })),
      variants: variants.map((v) => ({
        id: v.id,
        optionValueIds: hasOptions ? v.optionValueIds : [],
        sku: v.sku.trim() || null,
        price: parseMoneyInput(v.price, d) ?? 0,
        compareAtPrice: v.compareAt.trim() ? parseMoneyInput(v.compareAt, d) : null,
        costPrice: v.cost.trim() ? parseMoneyInput(v.cost, d) : null,
        stockQuantity: Number.parseInt(v.stock || "0", 10),
        stockBaseline: v.baseline,
        trackInventory: v.track,
        imageId: v.imageId,
        isActive: v.active,
      })),
      seo:
        Object.keys(seoTitle).length || Object.keys(seoDescription).length
          ? { title: seoTitle, description: seoDescription }
          : undefined,
      expectedUpdatedAt: product?.updatedAt,
    };
  }

  function save(e?: React.FormEvent) {
    e?.preventDefault();
    const problem = validate();
    if (problem) {
      setError({ message: problem });
      toast.error(problem);
      return;
    }
    startSave(async () => {
      const result = await saveAction(product?.id ?? null, buildInput());
      if (!result.ok) {
        setError(result);
        toast.error(result.message);
        return;
      }
      setDirty(false);
      toast.success(product ? t("saved") : t("created"));
      if (!product) router.replace(`/admin/products/${result.id}`);
    });
  }

  const bilingual = (ar: React.ReactNode, en: React.ReactNode) => (
    <>
      {ar}
      {showEnglish ? en : null}
    </>
  );

  return (
    <form onSubmit={save} className="space-y-5 pb-24 lg:pb-0" noValidate>
      <div className="sticky top-14 z-20 -mx-4 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="min-w-0 flex-1">
          <Link
            href="/admin/products"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("back")}
          </Link>
          <h1 className="truncate text-xl font-bold">{f.nameAr || t("titleNew")}</h1>
        </div>
        {product && product.status === "active" ? (
          <a
            href={`/p/${product.slug}`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "hidden sm:inline-flex",
            })}
          >
            <ExternalLink />
            {t("view")}
          </a>
        ) : null}
        <Button type="submit" loading={pending} className="hidden lg:inline-flex">
          {t("save")}
        </Button>
      </div>

      {error ? <Alert tone="danger">{error.message}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Card title={t("sections.basic")}>
            <label className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5 text-sm">
              <span>
                <span className="block font-medium">{t("english")}</span>
                <span className="block text-xs text-muted-foreground">{t("englishHint")}</span>
              </span>
              <Switch checked={showEnglish} onCheckedChange={setShowEnglish} />
            </label>
            {bilingual(
              <Field
                label={t("nameAr")}
                htmlFor="nameAr"
                error={error?.field === "name" ? t("errors.required") : undefined}
              >
                <Input
                  id="nameAr"
                  value={f.nameAr}
                  onChange={(e) => set("nameAr", e.target.value)}
                  maxLength={150}
                  aria-invalid={error?.field === "name"}
                />
              </Field>,
              <Field label={t("nameEn")} htmlFor="nameEn" optionalText={tCommon("optional")}>
                <Input
                  id="nameEn"
                  dir="ltr"
                  value={f.nameEn}
                  onChange={(e) => set("nameEn", e.target.value)}
                  maxLength={150}
                />
              </Field>,
            )}
            {bilingual(
              <Field label={t("shortAr")} htmlFor="shortAr" optionalText={tCommon("optional")}>
                <Input
                  id="shortAr"
                  value={f.shortAr}
                  onChange={(e) => set("shortAr", e.target.value)}
                  maxLength={300}
                />
              </Field>,
              <Field label={t("shortEn")} htmlFor="shortEn" optionalText={tCommon("optional")}>
                <Input
                  id="shortEn"
                  dir="ltr"
                  value={f.shortEn}
                  onChange={(e) => set("shortEn", e.target.value)}
                  maxLength={300}
                />
              </Field>,
            )}
            {bilingual(
              <Field
                label={t("descAr")}
                htmlFor="descAr"
                hint={t("descHint")}
                optionalText={tCommon("optional")}
              >
                <Textarea
                  id="descAr"
                  rows={6}
                  value={f.descAr}
                  onChange={(e) => set("descAr", e.target.value)}
                  maxLength={15000}
                />
              </Field>,
              <Field label={t("descEn")} htmlFor="descEn" optionalText={tCommon("optional")}>
                <Textarea
                  id="descEn"
                  dir="ltr"
                  rows={6}
                  value={f.descEn}
                  onChange={(e) => set("descEn", e.target.value)}
                  maxLength={15000}
                />
              </Field>,
            )}
          </Card>

          <Card title={t("sections.media")}>
            <ImageGallery
              images={images}
              onChange={(next) => {
                setImages(next);
                touch();
              }}
              locale={locale}
            />
          </Card>

          <Card title={hasOptions ? t("sections.variants") : t("sections.pricing")}>
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              {t("hasOptions")}
              <Switch
                checked={hasOptions}
                onCheckedChange={(on) =>
                  applyOptions(
                    on
                      ? [{ key: randomId(), nameAr: "", nameEn: "", isColor: false, values: [] }]
                      : [],
                  )
                }
              />
            </label>

            {hasOptions ? (
              <OptionsEditor options={options} onChange={applyOptions} showEnglish={showEnglish} />
            ) : (
              <SimplePricing
                variant={variants[0]!}
                onChange={(patch) => updateVariant(variants[0]!.key, patch)}
              />
            )}

            {hasOptions && variants.length ? (
              <VariantsGrid
                variants={variants}
                labelOf={labelOf}
                onChange={updateVariant}
                onApplyAll={(patch) => {
                  setVariants((prev) => prev.map((v) => ({ ...v, ...patch })));
                  touch();
                }}
              />
            ) : null}
          </Card>

          <details className="group rounded-2xl border bg-surface shadow-card">
            <summary className="cursor-pointer list-none px-4 py-3.5 font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
              {t("sections.seo")}
            </summary>
            <div className="space-y-4 border-t px-4 py-4 sm:px-5">
              <Field
                label={t("slug")}
                htmlFor="slug"
                hint={t("slugHint")}
                error={error?.field === "slug" ? error.message : undefined}
              >
                <Input
                  id="slug"
                  value={f.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  maxLength={80}
                  aria-invalid={error?.field === "slug"}
                />
              </Field>
              <p className="text-xs text-muted-foreground">{t("seoHint")}</p>
              {bilingual(
                <Field label={t("seoTitle")} htmlFor="seoTitleAr">
                  <Input
                    id="seoTitleAr"
                    value={f.seoTitleAr}
                    onChange={(e) => set("seoTitleAr", e.target.value)}
                    maxLength={70}
                  />
                </Field>,
                <Field label={`${t("seoTitle")} (EN)`} htmlFor="seoTitleEn">
                  <Input
                    id="seoTitleEn"
                    dir="ltr"
                    value={f.seoTitleEn}
                    onChange={(e) => set("seoTitleEn", e.target.value)}
                    maxLength={70}
                  />
                </Field>,
              )}
              {bilingual(
                <Field label={t("seoDescription")} htmlFor="seoDescAr">
                  <Textarea
                    id="seoDescAr"
                    rows={2}
                    value={f.seoDescAr}
                    onChange={(e) => set("seoDescAr", e.target.value)}
                    maxLength={170}
                  />
                </Field>,
                <Field label={`${t("seoDescription")} (EN)`} htmlFor="seoDescEn">
                  <Textarea
                    id="seoDescEn"
                    dir="ltr"
                    rows={2}
                    value={f.seoDescEn}
                    onChange={(e) => set("seoDescEn", e.target.value)}
                    maxLength={170}
                  />
                </Field>,
              )}
            </div>
          </details>
        </div>

        <aside className="space-y-5">
          <Card title={t("status")}>
            <div className="grid gap-2" role="radiogroup" aria-label={t("status")}>
              {STATUSES.map((s) => (
                <label
                  key={s}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                    f.status === s
                      ? "border-primary bg-primary-soft/50"
                      : "hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={f.status === s}
                    onChange={() => set("status", s)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{t(`statuses.${s}`)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t(`statusHints.${s}`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card title={t("sections.organize")}>
            <Field label={t("category")} htmlFor="primaryCategoryId">
              <NativeSelect
                id="primaryCategoryId"
                value={f.primaryCategoryId}
                onChange={(e) => set("primaryCategoryId", e.target.value)}
              >
                <option value="">{t("noCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {categories.length > 1 ? (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">{t("otherCategories")}</legend>
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border p-2.5">
                  {categories
                    .filter((c) => c.id !== f.primaryCategoryId)
                    .map((c) => (
                      <label key={c.id} className="flex items-center gap-2.5 text-sm">
                        <Checkbox
                          checked={f.categoryIds.includes(c.id)}
                          onCheckedChange={(on) =>
                            set(
                              "categoryIds",
                              on
                                ? [...f.categoryIds, c.id]
                                : f.categoryIds.filter((x) => x !== c.id),
                            )
                          }
                        />
                        {c.label}
                      </label>
                    ))}
                </div>
              </fieldset>
            ) : null}
            <label className="flex items-start justify-between gap-3 text-sm">
              <span>
                <span className="block font-medium">{t("featured")}</span>
                <span className="block text-xs text-muted-foreground">{t("featuredHint")}</span>
              </span>
              <Switch checked={f.isFeatured} onCheckedChange={(on) => set("isFeatured", on)} />
            </label>
            <Field label={t("brand")} htmlFor="brand" optionalText={tCommon("optional")}>
              <Input
                id="brand"
                value={f.brand}
                onChange={(e) => set("brand", e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field
              label={t("tags")}
              htmlFor="tags"
              hint={t("tagsHint")}
              optionalText={tCommon("optional")}
            >
              <Input id="tags" value={f.tags} onChange={(e) => set("tags", e.target.value)} />
            </Field>
          </Card>

          {product ? (
            <section className="rounded-2xl border border-danger/30 bg-surface p-4 shadow-card">
              <h2 className="font-semibold text-danger">{t("sections.danger")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {product.orderCount ? t("deleteSold") : t("deleteHint")}
              </p>
              <Button
                type="button"
                variant={confirmDelete ? "danger" : "outline"}
                size="sm"
                className="mt-3"
                onClick={async () => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    window.setTimeout(() => setConfirmDelete(false), 4000);
                    return;
                  }
                  const r = await deleteAction(product.id);
                  if (r.ok) {
                    setDirty(false);
                    toast.success(t("deleted"));
                    router.replace("/admin/products");
                  } else toast.error(r.message ?? "");
                }}
              >
                <Trash2 />
                {confirmDelete ? t("confirmDelete") : t("delete")}
              </Button>
            </section>
          ) : null}
        </aside>
      </div>

      {/* Phones: save pinned to the bottom. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md lg:hidden">
        <Button type="submit" size="lg" block loading={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-surface p-4 shadow-card sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SimplePricing({
  variant: v,
  onChange,
}: {
  variant: VariantState;
  onChange: (patch: Partial<VariantState>) => void;
}) {
  const t = useTranslations("admin.productEditor");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("price")} htmlFor="price">
          <Input
            id="price"
            inputMode="decimal"
            dir="ltr"
            value={v.price}
            onChange={(e) => onChange({ price: e.target.value })}
          />
        </Field>
        <Field
          label={t("compareAt")}
          htmlFor="compareAt"
          hint={t("compareAtHint")}
          optionalText={tCommon("optional")}
        >
          <Input
            id="compareAt"
            inputMode="decimal"
            dir="ltr"
            value={v.compareAt}
            onChange={(e) => onChange({ compareAt: e.target.value })}
          />
        </Field>
        <Field label={t("stock")} htmlFor="stock">
          <Input
            id="stock"
            inputMode="numeric"
            dir="ltr"
            value={v.stock}
            onChange={(e) => onChange({ stock: e.target.value.replace(/\D/g, "") })}
            disabled={!v.track}
          />
        </Field>
        <Field label={t("sku")} htmlFor="sku" optionalText={tCommon("optional")}>
          <Input
            id="sku"
            dir="ltr"
            value={v.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            maxLength={64}
          />
        </Field>
        <Field
          label={t("cost")}
          htmlFor="cost"
          hint={t("costHint")}
          optionalText={tCommon("optional")}
        >
          <Input
            id="cost"
            inputMode="decimal"
            dir="ltr"
            value={v.cost}
            onChange={(e) => onChange({ cost: e.target.value })}
          />
        </Field>
      </div>
      <label className="flex items-start justify-between gap-3 text-sm">
        <span>
          <span className="block font-medium">{t("track")}</span>
          <span className="block text-xs text-muted-foreground">{t("trackHint")}</span>
        </span>
        <Switch checked={v.track} onCheckedChange={(on) => onChange({ track: on })} />
      </label>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
  showEnglish,
}: {
  options: OptionState[];
  onChange: (next: OptionState[]) => void;
  showEnglish: boolean;
}) {
  const t = useTranslations("admin.productEditor");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const update = (key: string, patch: Partial<OptionState>) =>
    onChange(options.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const addValue = (o: OptionState) => {
    const parts = (drafts[o.key] ?? "")
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const fresh = parts.filter((p) => !o.values.some((v) => v.ar === p));
    if (!fresh.length) return;
    update(o.key, {
      values: [
        ...o.values,
        ...fresh.map((ar) => ({ id: randomId(), ar, en: "", color: "#000000" })),
      ],
    });
    setDrafts((prev) => ({ ...prev, [o.key]: "" }));
  };

  return (
    <div className="space-y-3">
      {options.map((o, oi) => (
        <div key={o.key} className="space-y-3 rounded-xl border p-3">
          <div className="flex items-end gap-2">
            <Field label={t("optionName")} htmlFor={`on-${o.key}`} className="flex-1">
              <Input
                id={`on-${o.key}`}
                value={o.nameAr}
                placeholder={t("optionNamePlaceholder")}
                onChange={(e) => update(o.key, { nameAr: e.target.value })}
                maxLength={40}
              />
            </Field>
            {showEnglish ? (
              <Field label={t("optionNameEn")} htmlFor={`one-${o.key}`} className="flex-1">
                <Input
                  id={`one-${o.key}`}
                  dir="ltr"
                  value={o.nameEn}
                  onChange={(e) => update(o.key, { nameEn: e.target.value })}
                  maxLength={40}
                />
              </Field>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("removeOption")}
              onClick={() => onChange(options.filter((x) => x.key !== o.key))}
            >
              <Trash2 />
            </Button>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("values")}</p>
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {o.values.map((v) => (
                <li
                  key={v.id}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-surface-muted py-1 ps-1.5 pe-1 text-sm"
                >
                  {o.isColor ? (
                    <input
                      type="color"
                      value={v.color}
                      onChange={(e) =>
                        update(o.key, {
                          values: o.values.map((x) =>
                            x.id === v.id ? { ...x, color: e.target.value } : x,
                          ),
                        })
                      }
                      className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                      aria-label={v.ar}
                    />
                  ) : null}
                  <span className="px-1">{v.ar}</span>
                  {showEnglish ? (
                    <input
                      dir="ltr"
                      value={v.en}
                      placeholder="EN"
                      onChange={(e) =>
                        update(o.key, {
                          values: o.values.map((x) =>
                            x.id === v.id ? { ...x, en: e.target.value } : x,
                          ),
                        })
                      }
                      className="w-16 rounded-md border bg-surface px-1.5 text-xs"
                      aria-label={`${t("valueEn")} ${v.ar}`}
                      maxLength={40}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => update(o.key, { values: o.values.filter((x) => x.id !== v.id) })}
                    className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    aria-label={t("removeValue", { value: v.ar })}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={drafts[o.key] ?? ""}
                placeholder={t("valuePlaceholder")}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [o.key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addValue(o);
                  }
                }}
                className="h-10"
                aria-label={`${t("values")} ${oi + 1}`}
                maxLength={120}
              />
              <Button
                type="button"
                variant="secondary"
                className="h-10"
                onClick={() => addValue(o)}
              >
                {t("addValue")}
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={o.isColor}
              onCheckedChange={(on) => update(o.key, { isColor: on === true })}
            />
            {t("colors")}
          </label>
        </div>
      ))}
      {options.length < 3 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...options,
              { key: randomId(), nameAr: "", nameEn: "", isColor: false, values: [] },
            ])
          }
        >
          <Plus />
          {t("addOption")}
        </Button>
      ) : null}
    </div>
  );
}

function VariantsGrid({
  variants,
  labelOf,
  onChange,
  onApplyAll,
}: {
  variants: VariantState[];
  labelOf: (ids: string[]) => string;
  onChange: (key: string, patch: Partial<VariantState>) => void;
  onApplyAll: (patch: Partial<VariantState>) => void;
}) {
  const t = useTranslations("admin.productEditor");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t("variantsTable", { count: variants.length })}</p>
      <div className="flex flex-wrap gap-2 rounded-xl bg-surface-muted p-2.5">
        <div className="flex flex-1 gap-1.5">
          <Input
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            placeholder={t("price")}
            inputMode="decimal"
            dir="ltr"
            className="h-9 min-w-0"
            aria-label={t("price")}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => bulkPrice && onApplyAll({ price: bulkPrice })}
          >
            {t("applyToAll")}
          </Button>
        </div>
        <div className="flex flex-1 gap-1.5">
          <Input
            value={bulkStock}
            onChange={(e) => setBulkStock(e.target.value.replace(/\D/g, ""))}
            placeholder={t("stock")}
            inputMode="numeric"
            dir="ltr"
            className="h-9 min-w-0"
            aria-label={t("stock")}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => bulkStock && onApplyAll({ stock: bulkStock })}
          >
            {t("applyToAll")}
          </Button>
        </div>
      </div>
      <ul className="divide-y rounded-xl border">
        {variants.map((v) => (
          <li
            key={v.key}
            className={cn(
              "grid grid-cols-2 gap-2 p-3 sm:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))_auto] sm:items-center",
              !v.active && "opacity-60",
            )}
          >
            <p className="col-span-2 text-sm font-semibold sm:col-span-1">
              {labelOf(v.optionValueIds)}
            </p>
            <Input
              value={v.price}
              onChange={(e) => onChange(v.key, { price: e.target.value })}
              inputMode="decimal"
              dir="ltr"
              placeholder={t("price")}
              aria-label={`${t("price")} — ${labelOf(v.optionValueIds)}`}
              className="h-9"
            />
            <Input
              value={v.compareAt}
              onChange={(e) => onChange(v.key, { compareAt: e.target.value })}
              inputMode="decimal"
              dir="ltr"
              placeholder={t("compareAt")}
              aria-label={`${t("compareAt")} — ${labelOf(v.optionValueIds)}`}
              className="h-9"
            />
            <Input
              value={v.stock}
              onChange={(e) => onChange(v.key, { stock: e.target.value.replace(/\D/g, "") })}
              inputMode="numeric"
              dir="ltr"
              placeholder={t("stock")}
              aria-label={`${t("stock")} — ${labelOf(v.optionValueIds)}`}
              className="h-9"
            />
            <Input
              value={v.sku}
              onChange={(e) => onChange(v.key, { sku: e.target.value })}
              dir="ltr"
              placeholder="SKU"
              aria-label={`${t("sku")} — ${labelOf(v.optionValueIds)}`}
              className="h-9"
              maxLength={64}
            />
            <label className="col-span-2 flex items-center gap-2 text-xs sm:col-span-1">
              <Switch
                checked={v.active}
                onCheckedChange={(on) => onChange(v.key, { active: on })}
                aria-label={`${t("active")} — ${labelOf(v.optionValueIds)}`}
              />
              <span className="sm:sr-only">{t("active")}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
