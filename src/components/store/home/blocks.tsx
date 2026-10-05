import {
  Banknote,
  Clock,
  Gift,
  Headset,
  RefreshCcw,
  ShieldCheck,
  Star,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import type { CurrencyConfig } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { HomeBlock } from "@/server/services/storefront";
import { MediaImage } from "../media-image";
import { ProductCard } from "../product-card";
import { ProductGrid, ProductRail, SectionHeading } from "../section";
import { HeroSlider } from "./hero-slider";

type Ctx = { locale: string; currency: CurrencyConfig };

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

function Cta({
  href,
  label,
  tone = "primary",
}: {
  href: string;
  label: string;
  tone?: "primary" | "light";
}) {
  const className = buttonVariants({
    size: "lg",
    className: tone === "light" ? "bg-white text-primary shadow-none hover:bg-white/90" : undefined,
  });
  return isExternal(href) ? (
    <a href={href} className={className} rel="noopener noreferrer">
      {label}
    </a>
  ) : (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function HeroBlock({
  block,
  locale,
}: { block: Extract<HomeBlock, { type: "hero" }> } & Ctx) {
  const slides = block.slides.map((s, i) => {
    const title = tl(s.title, locale);
    const subtitle = tl(s.subtitle, locale);
    const cta = tl(s.ctaLabel, locale);
    return (
      <div key={i} className="grid items-stretch gap-0 lg:grid-cols-[1fr_1.25fr] lg:gap-10">
        {/* Phones: the photo carries the slide, text sits on a soft scrim. Desktop: text beside it. */}
        <div className="relative aspect-[4/5] overflow-hidden petal bg-primary-soft sm:aspect-[16/10] lg:order-last lg:aspect-[16/11]">
          <MediaImage
            image={s.image}
            sizes="(min-width: 1024px) 55vw, 100vw"
            alt={title}
            locale={locale}
            priority={i === 0}
            className="absolute inset-0 size-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#140f2e]/80 via-[#140f2e]/20 to-transparent lg:hidden" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7 lg:hidden">
            {title ? (
              <h2 className="font-display text-[2rem] leading-[1.15] font-bold text-balance">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mt-2 max-w-md text-[0.95rem] text-white/85">{subtitle}</p>
            ) : null}
            {cta && s.ctaHref ? (
              <div className="mt-4">
                <Cta href={s.ctaHref} label={cta} tone="light" />
              </div>
            ) : null}
          </div>
        </div>
        <div className="hidden flex-col justify-center lg:flex">
          {title ? (
            <h2 className="font-display text-5xl leading-[1.15] font-bold text-balance text-foreground">
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className="mt-4 max-w-md text-lg text-muted-foreground">{subtitle}</p>
          ) : null}
          {cta && s.ctaHref ? (
            <div className="mt-8">
              <Cta href={s.ctaHref} label={cta} />
            </div>
          ) : null}
        </div>
      </div>
    );
  });
  return (
    <section className="container-page pt-4 lg:pt-8">
      <HeroSlider slides={slides} autoplay={block.autoplay} />
    </section>
  );
}

export function CategoriesBlock({
  block,
  locale,
}: { block: Extract<HomeBlock, { type: "categories" }> } & Ctx) {
  const title = tl(block.title, locale);
  if (block.style === "cards") {
    return (
      <section className="container-page">
        {title ? <SectionHeading title={title} /> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {block.categories.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="group relative aspect-square overflow-hidden petal bg-surface-muted"
            >
              <MediaImage
                image={c.image}
                sizes="(min-width:1024px) 16vw, 46vw"
                alt=""
                locale={locale}
                className="absolute inset-0 size-full transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 text-sm font-semibold text-white">
                {tl(c.name, locale)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="container-page">
      {title ? <SectionHeading title={title} /> : null}
      {/* Phones: a swipeable rail. Desktop: tracks stretch to share the row (tiles capped and centred),
          and only overflow into a scroller when there are many categories. */}
      <ul className="-mx-4 rail scroll-px-4 auto-cols-[5.5rem] gap-3 px-4 md:-mx-6 md:px-6 lg:mx-0 lg:auto-cols-[minmax(7.5rem,1fr)] lg:gap-5 lg:px-0">
        {block.categories.map((c) => (
          <li key={c.id} className="lg:mx-auto lg:w-full lg:max-w-[10.5rem]">
            <Link
              href={`/c/${c.slug}`}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <span className="block aspect-square w-full overflow-hidden petal-sm bg-surface-muted ring-1 ring-border/60 transition group-hover:ring-2 group-hover:ring-primary/40">
                <MediaImage
                  image={c.image}
                  sizes="120px"
                  alt=""
                  locale={locale}
                  className="size-full transition duration-500 group-hover:scale-105"
                />
              </span>
              <span className="line-clamp-2 text-[0.8rem] leading-tight font-medium">
                {tl(c.name, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function ProductsBlock({
  block,
  locale,
  currency,
}: { block: Extract<HomeBlock, { type: "products" }> } & Ctx) {
  const t = await getTranslations("store");
  const title = tl(block.title, locale);
  const cards = block.products.map((p) => (
    <ProductCard key={p.id} product={p} currency={currency} locale={locale} />
  ));
  return (
    <section className="container-page">
      {title ? (
        <SectionHeading title={title} href={block.viewAllHref} linkLabel={t("viewAll")} />
      ) : null}
      {block.layout === "grid" ? (
        <ProductGrid>{cards}</ProductGrid>
      ) : (
        <ProductRail>{cards}</ProductRail>
      )}
    </section>
  );
}

export function BannerBlock({
  block,
  locale,
}: { block: Extract<HomeBlock, { type: "banner" }> } & Ctx) {
  const title = tl(block.title, locale);
  const subtitle = tl(block.subtitle, locale);
  const cta = tl(block.ctaLabel, locale);
  const dark = block.tone === "dark";
  return (
    <section className="container-page">
      <div
        className={cn(
          "relative grid overflow-hidden petal md:grid-cols-2",
          dark ? "bg-primary text-primary-foreground" : "bg-primary-soft text-foreground",
        )}
      >
        <div className="relative z-10 flex flex-col justify-center gap-3 p-6 sm:p-10">
          {title ? (
            <h2 className="font-display text-[1.7rem] leading-tight font-bold text-balance sm:text-4xl">
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p
              className={cn(
                "max-w-md",
                dark ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </p>
          ) : null}
          {cta && block.ctaHref ? (
            <div className="mt-2">
              <Cta href={block.ctaHref} label={cta} tone={dark ? "light" : "primary"} />
            </div>
          ) : null}
        </div>
        <div className="relative aspect-[16/9] md:aspect-auto">
          <MediaImage
            image={block.image}
            sizes="(min-width:768px) 50vw, 100vw"
            alt=""
            locale={locale}
            className="absolute inset-0 size-full"
          />
        </div>
      </div>
    </section>
  );
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  banknote: Banknote,
  refresh: RefreshCcw,
  shield: ShieldCheck,
  gift: Gift,
  headset: Headset,
  clock: Clock,
  star: Star,
};

export function FeaturesBlock({
  block,
  locale,
}: { block: Extract<HomeBlock, { type: "features" }> } & Ctx) {
  return (
    <section className="container-page">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {block.items.map((item, i) => {
          const Icon = FEATURE_ICONS[item.icon] ?? Star;
          return (
            <li
              key={i}
              className="flex flex-col gap-2 rounded-2xl border bg-surface p-4 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{tl(item.title, locale)}</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {tl(item.text, locale)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TextBlock({
  block,
  locale,
}: { block: Extract<HomeBlock, { type: "text" }> } & Ctx) {
  const title = tl(block.title, locale);
  return (
    <section className={cn("container-page max-w-3xl", block.align === "center" && "text-center")}>
      {title ? <h2 className="mb-3 font-display text-2xl font-semibold">{title}</h2> : null}
      <p className="whitespace-pre-line text-muted-foreground">{tl(block.body, locale)}</p>
    </section>
  );
}
