"use client";

import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Clock,
  Gift,
  Headset,
  Plus,
  RefreshCw,
  Shield,
  Star,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import type { LocalizedText } from "@/lib/localized";
import type { CurrencyConfig } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { HomeSectionDTO } from "@/server/services/content";
import type { ImageDTO } from "@/server/services/media";
import { SingleImageField } from "../image-uploader";
import { AdminCard, IconButton, ToggleRow, useConfirm } from "../kit";
import { ProductPicker, type PickerProduct } from "../product-picker";
import {
  cleanText,
  EditorShell,
  LocalizedInput,
  TextSetting,
  useFieldError,
  type SettingsResult,
} from "../settings/shell";
import type { BlockType } from "./block-thumb";

const FEATURE_ICONS = {
  truck: Truck,
  banknote: Banknote,
  refresh: RefreshCw,
  shield: Shield,
  gift: Gift,
  headset: Headset,
  clock: Clock,
  star: Star,
} satisfies Record<string, LucideIcon>;
type FeatureIcon = keyof typeof FEATURE_ICONS;
const SOURCES = ["newest", "featured", "best_sellers", "on_sale", "category", "manual"] as const;
type Source = (typeof SOURCES)[number];

const MAX_SLIDES = 6;
const MAX_FEATURES = 6;
const empty = (): LocalizedText => ({});

const validLink = (href: string) =>
  !href || /^\/(?!\/)\S*$/.test(href) || /^https?:\/\/[^\s/$.?#].\S*$/i.test(href);

type Slide = {
  key: string;
  image: ImageDTO | null;
  title: LocalizedText;
  subtitle: LocalizedText;
  ctaLabel: LocalizedText;
  ctaHref: string;
};
type Feature = { key: string; icon: FeatureIcon; title: LocalizedText; text: LocalizedText };

export type SectionEditorProps = {
  section: HomeSectionDTO | null;
  type: BlockType;
  categories: { id: string; label: string }[];
  picked: PickerProduct[];
  images: Record<string, ImageDTO>;
  currency: CurrencyConfig;
  save: (id: string | null, input: Record<string, unknown>) => Promise<SettingsResult>;
  remove: (id: string) => Promise<{ ok: boolean; message?: string }>;
  searchProducts: (q: string) => Promise<PickerProduct[]>;
};

/** Edit (or create) one home page block. Each block type has its own fields. */
export function SectionEditor(props: SectionEditorProps) {
  const { section, type, images } = props;
  const t = useTranslations("admin.home");
  const locale = useLocale();
  const router = useRouter();
  const c = section?.config as Record<string, unknown> | undefined;
  const cfg = <T,>(key: string, fallback: T): T => (c?.[key] as T | undefined) ?? fallback;
  const img = (id: unknown) => (typeof id === "string" ? (images[id] ?? null) : null);

  const [title, setTitle] = useState<LocalizedText>(section?.title ?? empty());
  const [isActive, setActive] = useState(section?.isActive ?? true);
  // Keys of items added in the browser; initial items use their index so SSR and hydration agree.
  const added = useRef(0);
  const newKey = () => `added-${++added.current}`;
  // hero
  const [slides, setSlides] = useState<Slide[]>(() =>
    cfg<Record<string, unknown>[]>("slides", [{}]).map((s, i) => ({
      key: `slide-${i}`,
      image: img(s.imageId),
      title: (s.title as LocalizedText) ?? empty(),
      subtitle: (s.subtitle as LocalizedText) ?? empty(),
      ctaLabel: (s.ctaLabel as LocalizedText) ?? empty(),
      ctaHref: (s.ctaHref as string) ?? "",
    })),
  );
  const [autoplay, setAutoplay] = useState(cfg("autoplay", true));
  // categories
  const [categoryIds, setCategoryIds] = useState<string[]>(cfg("categoryIds", []));
  const [pickCategories, setPickCategories] = useState(categoryIds.length > 0);
  const [style, setStyle] = useState<string>(cfg("style", "circles"));
  // products
  const [source, setSource] = useState<Source>(cfg("source", "newest"));
  const [categoryId, setCategoryId] = useState<string>(
    cfg<string | null>("categoryId", null) ?? "",
  );
  const [products, setProducts] = useState<PickerProduct[]>(props.picked);
  const [limit, setLimit] = useState(String(cfg("limit", 8)));
  const [layout, setLayout] = useState<string>(cfg("layout", "carousel"));
  // banner
  const [banner, setBanner] = useState(() => ({
    image: img(c?.imageId),
    title: cfg<LocalizedText>("title", empty()),
    subtitle: cfg<LocalizedText>("subtitle", empty()),
    ctaLabel: cfg<LocalizedText>("ctaLabel", empty()),
    ctaHref: cfg("ctaHref", ""),
    tone: cfg("tone", "dark"),
  }));
  // features
  const [features, setFeatures] = useState<Feature[]>(() => {
    const items = cfg<Record<string, unknown>[]>("items", []);
    return items.length
      ? items.map((f, i) => ({
          key: `item-${i}`,
          icon: (f.icon as FeatureIcon) ?? "star",
          title: (f.title as LocalizedText) ?? empty(),
          text: (f.text as LocalizedText) ?? empty(),
        }))
      : (["truck", "banknote", "refresh"] as const).map((icon, i) => ({
          key: `item-${i}`,
          icon,
          title: { ar: t(`defaults.${icon}.title`) },
          text: { ar: t(`defaults.${icon}.text`) },
        }));
  });
  // text
  const [body, setBody] = useState<LocalizedText>(cfg("body", empty()));
  const [align, setAlign] = useState<string>(cfg("align", "center"));

  function buildConfig(): Record<string, unknown> {
    switch (type) {
      case "hero":
        return {
          slides: slides.map((s) => ({
            imageId: s.image?.id ?? null,
            title: cleanText(s.title),
            subtitle: cleanText(s.subtitle),
            ctaLabel: cleanText(s.ctaLabel),
            ctaHref: s.ctaHref.trim(),
          })),
          autoplay,
        };
      case "categories":
        return { categoryIds: pickCategories ? categoryIds : [], style };
      case "products":
        return {
          source,
          categoryId: source === "category" ? categoryId || null : null,
          productIds: source === "manual" ? products.map((p) => p.id) : [],
          limit: Number(limit) || 0,
          layout,
        };
      case "banner":
        return {
          imageId: banner.image?.id ?? null,
          title: cleanText(banner.title),
          subtitle: cleanText(banner.subtitle),
          ctaLabel: cleanText(banner.ctaLabel),
          ctaHref: banner.ctaHref.trim(),
          tone: banner.tone,
        };
      case "features":
        return {
          items: features.map((f) => ({
            icon: f.icon,
            title: cleanText(f.title),
            text: cleanText(f.text),
          })),
        };
      case "text":
        return { body: cleanText(body), align };
    }
  }

  const usesTitle = type === "categories" || type === "products" || type === "text";
  const value = () => ({
    type,
    title: usesTitle ? cleanText(title) : undefined,
    config: buildConfig(),
    isActive,
  });
  const [initial] = useState(() => JSON.stringify(value()));
  const dirty = initial !== JSON.stringify(value());

  function collect() {
    const errors: Record<string, string> = {};
    const v = value();
    const hasText = (x: LocalizedText) => Boolean(x.ar || x.en);
    const checkCta = (prefix: string, label: LocalizedText, href: string) => {
      if (!validLink(href.trim())) errors[`${prefix}ctaHref`] = t("errors.link");
      else if (hasText(cleanText(label)) && !href.trim())
        errors[`${prefix}ctaHref`] = t("errors.ctaHref");
    };
    if (type === "hero") {
      if (!slides.length) errors.slides = t("errors.slides");
      slides.forEach((s, i) => checkCta(`slides.${i}.`, s.ctaLabel, s.ctaHref));
    }
    if (type === "banner") checkCta("", banner.ctaLabel, banner.ctaHref);
    if (type === "categories" && pickCategories && !categoryIds.length)
      errors.categoryIds = t("errors.categories");
    if (type === "products") {
      if (source === "category" && !categoryId) errors.categoryId = t("errors.category");
      if (source === "manual" && !products.length) errors.productIds = t("errors.products");
      const n = Number(limit);
      if (source !== "manual" && (!Number.isInteger(n) || n < 2 || n > 24))
        errors.limit = t("errors.limit");
    }
    if (type === "features") {
      if (!features.length) errors.items = t("errors.features");
      features.forEach((f, i) => {
        if (!hasText(cleanText(f.title))) errors[`items.${i}.title`] = t("errors.required");
      });
    }
    if (type === "text" && !hasText(cleanText(body))) errors.body = t("errors.required");
    return Object.keys(errors).length ? { errors } : { value: v };
  }

  return (
    <EditorShell
      backHref="/admin/storefront"
      backLabel={t("title")}
      title={t(`types.${type}.name`)}
      description={t(`types.${type}.description`)}
      actions={section ? <DeleteSection id={section.id} remove={props.remove} /> : null}
      save={(input) => props.save(section?.id ?? null, input)}
      onSaved={() => {
        if (!section) router.push("/admin/storefront");
      }}
      collect={collect}
      dirty={dirty}
      hasEnglish={JSON.stringify(section ?? {}).includes('"en":')}
      saveLabel={section ? undefined : t("add")}
    >
      {usesTitle ? (
        <AdminCard>
          <LocalizedInput
            id="section-title"
            path="title"
            label={t("sectionTitle")}
            hint={t("sectionTitleHint")}
            value={title}
            onChange={setTitle}
            max={80}
            optional
          />
        </AdminCard>
      ) : null}

      {type === "hero" ? (
        <>
          <SlidesError />
          {slides.map((slide, i) => (
            <SlideCard
              key={slide.key}
              index={i}
              slide={slide}
              count={slides.length}
              onChange={(patch) =>
                setSlides((list) => list.map((s) => (s.key === slide.key ? { ...s, ...patch } : s)))
              }
              onMove={(to) =>
                setSlides((list) => {
                  const next = [...list];
                  const [item] = next.splice(i, 1);
                  next.splice(to, 0, item!);
                  return next;
                })
              }
              onRemove={() => setSlides((list) => list.filter((s) => s.key !== slide.key))}
            />
          ))}
          {slides.length < MAX_SLIDES ? (
            <Button
              type="button"
              variant="outline"
              block
              onClick={() =>
                setSlides((list) => [
                  ...list,
                  {
                    key: newKey(),
                    image: null,
                    title: empty(),
                    subtitle: empty(),
                    ctaLabel: empty(),
                    ctaHref: "",
                  },
                ])
              }
            >
              <Plus />
              {t("hero.addSlide")}
            </Button>
          ) : null}
          <AdminCard>
            <ToggleRow
              label={t("hero.autoplay")}
              hint={t("hero.autoplayHint")}
              checked={autoplay}
              onChange={setAutoplay}
            />
          </AdminCard>
        </>
      ) : null}

      {type === "categories" ? (
        <AdminCard title={t("categories.which")}>
          <ChoiceCards
            name="cat-mode"
            value={pickCategories ? "pick" : "all"}
            onChange={(v) => setPickCategories(v === "pick")}
            options={[
              { value: "all", label: t("categories.all"), hint: t("categories.allHint") },
              { value: "pick", label: t("categories.pick"), hint: t("categories.pickHint") },
            ]}
          />
          {pickCategories ? (
            <CategoryChecklist
              options={props.categories}
              value={categoryIds}
              onChange={setCategoryIds}
            />
          ) : null}
          <ChoiceCards
            name="cat-style"
            legend={t("categories.style")}
            value={style}
            onChange={setStyle}
            options={[
              { value: "circles", label: t("categories.circles") },
              { value: "cards", label: t("categories.cards") },
            ]}
          />
        </AdminCard>
      ) : null}

      {type === "products" ? (
        <AdminCard title={t("products.which")}>
          <ChoiceCards
            name="source"
            value={source}
            onChange={(v) => setSource(v as Source)}
            columns={2}
            options={SOURCES.map((s) => ({
              value: s,
              label: t(`sources.${s}`),
              hint: t(`sourceHints.${s}`),
            }))}
          />
          {source === "category" ? (
            <CategorySelect
              options={props.categories}
              value={categoryId}
              onChange={setCategoryId}
            />
          ) : null}
          {source === "manual" ? (
            <PickedProducts>
              <ProductPicker
                value={products}
                onChange={setProducts}
                search={props.searchProducts}
                currency={props.currency}
              />
            </PickedProducts>
          ) : (
            <LimitField value={limit} onChange={setLimit} />
          )}
          <ChoiceCards
            name="layout"
            legend={t("products.layout")}
            value={layout}
            onChange={setLayout}
            options={[
              {
                value: "carousel",
                label: t("products.carousel"),
                hint: t("products.carouselHint"),
              },
              { value: "grid", label: t("products.grid"), hint: t("products.gridHint") },
            ]}
          />
        </AdminCard>
      ) : null}

      {type === "banner" ? (
        <AdminCard>
          <Field label={t("image")} htmlFor="banner-image" hint={t("banner.imageHint")}>
            <SingleImageField
              image={banner.image}
              onChange={(image) => setBanner((b) => ({ ...b, image }))}
              locale={locale}
            />
          </Field>
          <LocalizedInput
            id="banner-title"
            path="title"
            label={t("headline")}
            value={banner.title}
            onChange={(v) => setBanner((b) => ({ ...b, title: v }))}
            max={80}
            optional
          />
          <LocalizedInput
            id="banner-subtitle"
            path="subtitle"
            label={t("subtitle")}
            value={banner.subtitle}
            onChange={(v) => setBanner((b) => ({ ...b, subtitle: v }))}
            max={160}
            optional
          />
          <Cta
            prefix="banner"
            path=""
            label={banner.ctaLabel}
            href={banner.ctaHref}
            onLabel={(v) => setBanner((b) => ({ ...b, ctaLabel: v }))}
            onHref={(v) => setBanner((b) => ({ ...b, ctaHref: v }))}
          />
          <ChoiceCards
            name="tone"
            legend={t("banner.tone")}
            value={banner.tone}
            onChange={(v) => setBanner((b) => ({ ...b, tone: v }))}
            options={[
              { value: "dark", label: t("banner.dark"), hint: t("banner.darkHint") },
              { value: "light", label: t("banner.light"), hint: t("banner.lightHint") },
            ]}
          />
        </AdminCard>
      ) : null}

      {type === "features" ? (
        <>
          <ItemsError />
          {features.map((f, i) => (
            <FeatureCard
              key={f.key}
              index={i}
              feature={f}
              count={features.length}
              onChange={(patch) =>
                setFeatures((list) => list.map((x) => (x.key === f.key ? { ...x, ...patch } : x)))
              }
              onMove={(to) =>
                setFeatures((list) => {
                  const next = [...list];
                  const [item] = next.splice(i, 1);
                  next.splice(to, 0, item!);
                  return next;
                })
              }
              onRemove={() => setFeatures((list) => list.filter((x) => x.key !== f.key))}
            />
          ))}
          {features.length < MAX_FEATURES ? (
            <Button
              type="button"
              variant="outline"
              block
              onClick={() =>
                setFeatures((list) => [
                  ...list,
                  { key: newKey(), icon: "star", title: empty(), text: empty() },
                ])
              }
            >
              <Plus />
              {t("features.add")}
            </Button>
          ) : null}
        </>
      ) : null}

      {type === "text" ? (
        <AdminCard>
          <LocalizedInput
            id="text-body"
            path="body"
            label={t("text.body")}
            value={body}
            onChange={setBody}
            max={2000}
            rows={6}
          />
          <ChoiceCards
            name="align"
            legend={t("text.align")}
            value={align}
            onChange={setAlign}
            options={[
              { value: "center", label: t("text.center") },
              { value: "start", label: t("text.start") },
            ]}
          />
        </AdminCard>
      ) : null}

      <AdminCard>
        <ToggleRow
          label={t("visibleOnHome")}
          hint={t("visibleOnHomeHint")}
          checked={isActive}
          onChange={setActive}
        />
      </AdminCard>
    </EditorShell>
  );
}

function DeleteSection({ id, remove }: { id: string; remove: SectionEditorProps["remove"] }) {
  const t = useTranslations("admin.home");
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
          router.push("/admin/storefront");
        } else if (r.message) toast.error(r.message);
      }}
    >
      <Trash2 />
      {confirm.armed ? t("confirmDelete") : t("delete")}
    </Button>
  );
}

function ErrorLine({ path }: { path: string }) {
  const error = useFieldError(path);
  return error ? (
    <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {error}
    </p>
  ) : null;
}
const SlidesError = () => <ErrorLine path="slides" />;
const ItemsError = () => <ErrorLine path="items" />;

function ItemHeader({
  title,
  index,
  count,
  onMove,
  onRemove,
}: {
  title: string;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("admin.home");
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-semibold">{title}</h2>
      <span className="flex items-center gap-0.5">
        <IconButton label={t("moveUp")} disabled={index === 0} onClick={() => onMove(index - 1)}>
          <ArrowUp className="size-4" />
        </IconButton>
        <IconButton
          label={t("moveDown")}
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
        >
          <ArrowDown className="size-4" />
        </IconButton>
        <IconButton label={t("removeItem")} danger disabled={count === 1} onClick={onRemove}>
          <Trash2 className="size-4" />
        </IconButton>
      </span>
    </div>
  );
}

function SlideCard({
  index,
  slide,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  slide: Slide;
  count: number;
  onChange: (patch: Partial<Slide>) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("admin.home");
  const locale = useLocale();
  return (
    <AdminCard>
      <ItemHeader
        title={t("hero.slide", { n: index + 1 })}
        index={index}
        count={count}
        onMove={onMove}
        onRemove={onRemove}
      />
      <Field label={t("image")} htmlFor={`slide-${slide.key}`} hint={t("hero.imageHint")}>
        <SingleImageField
          image={slide.image}
          onChange={(image) => onChange({ image })}
          locale={locale}
        />
      </Field>
      <LocalizedInput
        id={`slide-${slide.key}-title`}
        path={`slides.${index}.title`}
        label={t("headline")}
        value={slide.title}
        onChange={(title) => onChange({ title })}
        max={80}
        optional
      />
      <LocalizedInput
        id={`slide-${slide.key}-subtitle`}
        path={`slides.${index}.subtitle`}
        label={t("subtitle")}
        value={slide.subtitle}
        onChange={(subtitle) => onChange({ subtitle })}
        max={160}
        optional
      />
      <Cta
        prefix={`slide-${slide.key}`}
        path={`slides.${index}.`}
        label={slide.ctaLabel}
        href={slide.ctaHref}
        onLabel={(ctaLabel) => onChange({ ctaLabel })}
        onHref={(ctaHref) => onChange({ ctaHref })}
      />
    </AdminCard>
  );
}

function Cta({
  prefix,
  path,
  label,
  href,
  onLabel,
  onHref,
}: {
  prefix: string;
  path: string;
  label: LocalizedText;
  href: string;
  onLabel: (v: LocalizedText) => void;
  onHref: (v: string) => void;
}) {
  const t = useTranslations("admin.home");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-4">
        <LocalizedInput
          id={`${prefix}-cta`}
          path={`${path}ctaLabel`}
          label={t("ctaLabel")}
          placeholder={t("ctaPlaceholder")}
          value={label}
          onChange={onLabel}
          max={30}
          optional
        />
      </div>
      <TextSetting
        id={`${prefix}-href`}
        path={`${path}ctaHref`}
        label={t("ctaHref")}
        hint={t("ctaHrefHint")}
        dir="ltr"
        value={href}
        onChange={onHref}
        placeholder="/c/new"
        max={500}
        optional
      />
    </div>
  );
}

function FeatureCard({
  index,
  feature,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  feature: Feature;
  count: number;
  onChange: (patch: Partial<Feature>) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("admin.home");
  return (
    <AdminCard>
      <ItemHeader
        title={t("features.item", { n: index + 1 })}
        index={index}
        count={count}
        onMove={onMove}
        onRemove={onRemove}
      />
      <fieldset>
        <legend className="text-sm font-medium">{t("features.icon")}</legend>
        <div
          className="mt-1.5 flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label={t("features.icon")}
        >
          {(Object.entries(FEATURE_ICONS) as [FeatureIcon, LucideIcon][]).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={feature.icon === name}
              aria-label={t(`icons.${name}`)}
              title={t(`icons.${name}`)}
              onClick={() => onChange({ icon: name })}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl border transition-colors",
                feature.icon === name
                  ? "border-primary bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-surface-muted",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>
      <LocalizedInput
        id={`feature-${feature.key}-title`}
        path={`items.${index}.title`}
        label={t("features.title")}
        value={feature.title}
        onChange={(title) => onChange({ title })}
        max={60}
      />
      <LocalizedInput
        id={`feature-${feature.key}-text`}
        path={`items.${index}.text`}
        label={t("features.text")}
        value={feature.text}
        onChange={(text) => onChange({ text })}
        max={140}
        optional
      />
    </AdminCard>
  );
}

/** Radio options as tappable cards. */
function ChoiceCards({
  name,
  legend,
  value,
  onChange,
  options,
  columns,
}: {
  name: string;
  legend?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
  columns?: 2;
}) {
  return (
    <fieldset>
      {legend ? <legend className="mb-1.5 text-sm font-medium">{legend}</legend> : null}
      <div className={cn("grid gap-2", columns === 2 ? "sm:grid-cols-2" : "grid-cols-2")}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
              value === o.value ? "border-primary bg-primary-soft/70" : "hover:bg-surface-muted",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className={cn("font-medium", value === o.value && "text-primary")}>
              {o.label}
            </span>
            {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CategoryChecklist({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("admin.home");
  const error = useFieldError("categoryIds");
  return (
    <fieldset>
      <legend className="sr-only">{t("categories.pick")}</legend>
      <div className="max-h-72 divide-y overflow-y-auto rounded-xl border">
        {options.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
            <Checkbox
              checked={value.includes(o.id)}
              onCheckedChange={(on) =>
                onChange(on ? [...value, o.id] : value.filter((id) => id !== o.id))
              }
            />
            {o.label}
          </label>
        ))}
      </div>
      <p className={cn("mt-1.5 text-sm", error ? "text-danger" : "text-muted-foreground")}>
        {error ?? t("categories.orderHint")}
      </p>
    </fieldset>
  );
}

function CategorySelect({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("admin.home");
  const error = useFieldError("categoryId");
  return (
    <Field label={t("products.category")} htmlFor="products-category" error={error}>
      <NativeSelect
        id="products-category"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      >
        <option value="">{t("products.chooseCategory")}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

function PickedProducts({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.home");
  const error = useFieldError("productIds");
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{t("products.picked")}</p>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function LimitField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("admin.home");
  const error = useFieldError("limit");
  return (
    <Field
      label={t("products.limit")}
      htmlFor="products-limit"
      error={error}
      hint={t("products.limitHint")}
    >
      <Input
        id="products-limit"
        inputMode="numeric"
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
              .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
              .replace(/\D/g, "")
              .slice(0, 2),
          )
        }
        className="sm:max-w-32"
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );
}
