import "server-only";
import { count, eq, inArray } from "drizzle-orm";
import { countryPreset, DEFAULT_COUNTRY, type CountryPreset } from "@/lib/countries";
import { toMinor } from "@/lib/money";
import { db } from "@/server/db/client";
import {
  categories,
  coupons,
  homeSections,
  pages,
  products,
  shippingZones,
} from "@/server/db/schema";
import { newOptionValueId, saveCategory, saveProduct } from "@/server/services/catalog-admin";
import {
  getAllHomeSections,
  reorderHomeSections,
  savePage,
  saveHomeSection,
} from "@/server/services/content";
import { storeImage } from "@/server/services/media";
import { ensureDefaultSettings, getSetting } from "@/server/services/settings";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "./catalog-data";
import { demoImage } from "./demo-images";
import { DEFAULT_PAGES } from "./pages";

type Log = (msg: string) => void;

/** Approximate IQD → currency factors, only used to make demo prices look realistic. */
const IQD_RATE: Record<string, number> = {
  IQD: 1,
  SAR: 1 / 350,
  AED: 1 / 357,
  KWD: 1 / 4280,
  QAR: 1 / 360,
  BHD: 1 / 3480,
  OMR: 1 / 3400,
  JOD: 1 / 1850,
  EGP: 1 / 26,
};

function demoPrice(iqd: number, currency: string, decimals: number): number {
  if (currency === "IQD") return Math.round(iqd / 250) * 250;
  const major = iqd * (IQD_RATE[currency] ?? 1 / 1300);
  const nice = major >= 20 ? Math.round(major) : Math.round(major * 2) / 2;
  return toMinor(nice, decimals);
}

/**
 * Everything a brand-new store needs (idempotent): settings for the chosen country, delivery zones,
 * standard pages and a sensible home page layout.
 */
export async function seedBase(
  opts: { country?: string; storeName?: { ar?: string; en?: string } } = {},
  log: Log = () => {},
) {
  const preset: CountryPreset =
    countryPreset(opts.country ?? DEFAULT_COUNTRY) ?? countryPreset(DEFAULT_COUNTRY)!;

  await ensureDefaultSettings({
    general: {
      country: preset.code,
      currency: preset.currency,
      currencyDecimals: preset.currencyDecimals,
      phoneCode: preset.phoneCode,
      timeZone: preset.timeZone,
      ...(opts.storeName ? { storeName: opts.storeName } : {}),
    },
  });
  log(`✓ settings (${preset.code}, ${preset.currency})`);

  const [{ value: zoneCount }] = (await db.select({ value: count() }).from(shippingZones)) as [
    { value: number },
  ];
  if (zoneCount === 0) {
    await db.insert(shippingZones).values(
      preset.regions.map((name, i) => ({
        name,
        fee: i === 0 ? preset.defaultFee.capital : preset.defaultFee.other,
        minDays: i === 0 ? 1 : 2,
        maxDays: i === 0 ? 2 : 4,
        sortOrder: i,
      })),
    );
    log(`✓ ${preset.regions.length} delivery zones`);
  }

  const general = await getSetting("general");
  const storeName = {
    ar: general.storeName.ar ?? "",
    en: general.storeName.en ?? general.storeName.ar ?? "",
  };
  const existingPages = await db
    .select({ systemKey: pages.systemKey })
    .from(pages)
    .where(
      inArray(
        pages.systemKey,
        DEFAULT_PAGES.map((p) => p.systemKey),
      ),
    );
  const have = new Set(existingPages.map((p) => p.systemKey));
  for (const page of DEFAULT_PAGES) {
    if (have.has(page.systemKey)) continue;
    await savePage(
      {
        title: page.title,
        slug: page.slug,
        sortOrder: page.sortOrder,
        content: {
          ar: page.content.ar.replaceAll("{{storeName}}", storeName.ar),
          en: page.content.en.replaceAll("{{storeName}}", storeName.en),
        },
      },
      null,
      undefined,
      page.systemKey,
    );
  }
  log(`✓ standard pages`);

  const [{ value: sectionCount }] = (await db.select({ value: count() }).from(homeSections)) as [
    { value: number },
  ];
  if (sectionCount === 0) {
    await saveHomeSection(
      {
        type: "hero",
        config: {
          slides: [
            {
              title: { ar: `أهلاً بك في ${storeName.ar}`, en: `Welcome to ${storeName.en}` },
              subtitle: {
                ar: "تسوّق بسهولة وأمان مع توصيل سريع والدفع عند الاستلام.",
                en: "Shop easily and securely with fast delivery and cash on delivery.",
              },
              ctaLabel: { ar: "تسوّق الآن", en: "Shop now" },
              ctaHref: "/search",
            },
          ],
        },
      },
      null,
    );
    await saveHomeSection(
      {
        type: "categories",
        title: { ar: "تسوّق حسب القسم", en: "Shop by category" },
        config: { style: "circles" },
      },
      null,
    );
    await saveHomeSection(
      {
        type: "products",
        title: { ar: "وصل حديثاً", en: "New arrivals" },
        config: { source: "newest", limit: 8, layout: "carousel" },
      },
      null,
    );
    await saveHomeSection(
      {
        type: "products",
        title: { ar: "عروض وتخفيضات", en: "Deals" },
        config: { source: "on_sale", limit: 8, layout: "carousel" },
      },
      null,
    );
    await saveHomeSection(
      {
        type: "features",
        config: {
          items: [
            {
              icon: "truck",
              title: { ar: "توصيل لكل المناطق", en: "Delivery everywhere" },
              text: { ar: "نوصل طلبك أينما كنت.", en: "We deliver wherever you are." },
            },
            {
              icon: "banknote",
              title: { ar: "الدفع عند الاستلام", en: "Cash on delivery" },
              text: { ar: "ادفع عند وصول طلبك.", en: "Pay when your order arrives." },
            },
            {
              icon: "refresh",
              title: { ar: "استبدال سهل", en: "Easy exchanges" },
              text: { ar: "خلال 7 أيام من الاستلام.", en: "Within 7 days of delivery." },
            },
            {
              icon: "shield",
              title: { ar: "تسوّق آمن", en: "Secure shopping" },
              text: { ar: "بياناتك محمية بالكامل.", en: "Your data is fully protected." },
            },
          ],
        },
      },
      null,
    );
    log("✓ home page sections");
  }
}

/** Demo catalog with generated images (development & first impressions). Skips if products exist. */
export async function seedDemo(log: Log = () => {}) {
  const [{ value: productCount }] = (await db.select({ value: count() }).from(products)) as [
    { value: number },
  ];
  if (productCount > 0) {
    log("• demo catalog skipped (products already exist)");
    return;
  }
  const general = await getSetting("general");
  const price = (iqd: number) => demoPrice(iqd, general.currency, general.currencyDecimals);

  const categoryIds = new Map<string, string>();
  for (const [i, c] of DEMO_CATEGORIES.entries()) {
    const image = await storeImage(
      await demoImage({ icon: c.icon, hue: c.hue, width: 800, height: 800 }),
      {
        originalName: `${c.key}.jpg`,
        alt: c.name,
      },
    );
    const saved = await saveCategory(
      { name: c.name, description: c.description, imageId: image.id, sortOrder: i, slug: c.key },
      null,
    );
    categoryIds.set(c.key, saved.id);
  }
  log(`✓ ${DEMO_CATEGORIES.length} categories`);

  for (const p of DEMO_PRODUCTS) {
    const imageIds: string[] = [];
    for (let n = 0; n < (p.images ?? 1); n++) {
      const img = await storeImage(await demoImage({ icon: p.icon, hue: p.hue, shift: n * 40 }), {
        alt: p.name,
      });
      imageIds.push(img.id);
    }
    const options = (p.options ?? []).map((o) => ({
      name: o.name,
      values: o.values.map((v) => ({
        id: newOptionValueId(),
        label: { ar: v.ar, en: v.en },
        ...(v.color ? { color: v.color } : {}),
      })),
    }));
    const combos: string[][] =
      options.length === 0
        ? [[]]
        : options.reduce<string[][]>(
            (acc, o) => acc.flatMap((prefix) => o.values.map((v) => [...prefix, v.id])),
            [[]],
          );
    const stock = p.stock ?? [5];
    await saveProduct(
      {
        name: p.name,
        shortDescription: p.short,
        description: p.description,
        status: "active",
        primaryCategoryId: categoryIds.get(p.category),
        brand: p.brand ?? null,
        tags: p.tags ?? [],
        isFeatured: p.featured ?? false,
        imageIds,
        options,
        variants: combos.map((optionValueIds, i) => ({
          optionValueIds,
          price: price(p.price),
          compareAtPrice: p.compareAt ? price(p.compareAt) : null,
          stockQuantity: stock[i % stock.length]!,
          sku: `IR-${String(DEMO_PRODUCTS.indexOf(p) + 1).padStart(3, "0")}-${i + 1}`,
        })),
      },
      null,
    );
  }
  log(`✓ ${DEMO_PRODUCTS.length} products`);

  // Give the hero real imagery and add a promotional banner.
  const heroImage = await storeImage(
    await demoImage({ icon: "shopping-bag", hue: 285, width: 1920, height: 1080 }),
  );
  const heroImage2 = await storeImage(
    await demoImage({ icon: "sparkles", hue: 330, width: 1920, height: 1080 }),
  );
  const [hero] = await db.select().from(homeSections).where(eq(homeSections.type, "hero")).limit(1);
  if (hero) {
    await saveHomeSection(
      {
        type: "hero",
        config: {
          slides: [
            {
              imageId: heroImage.id,
              title: { ar: "تشكيلة الموسم الجديد", en: "The new season collection" },
              subtitle: {
                ar: "قطع مختارة بعناية بأسعار تناسبك.",
                en: "Hand-picked pieces at prices you'll love.",
              },
              ctaLabel: { ar: "تسوّق الآن", en: "Shop now" },
              ctaHref: "/c/women",
            },
            {
              imageId: heroImage2.id,
              title: { ar: "خصم 10% على طلبك الأول", en: "10% off your first order" },
              subtitle: {
                ar: "استخدم الكود WELCOME10 عند إتمام الطلب.",
                en: "Use code WELCOME10 at checkout.",
              },
              ctaLabel: { ar: "اكتشف العروض", en: "See deals" },
              ctaHref: "/search?sort=discount",
            },
          ],
        },
      },
      null,
      hero.id,
    );
  }
  const bannerImage = await storeImage(
    await demoImage({ icon: "gem", hue: 175, width: 1600, height: 700 }),
  );
  await saveHomeSection(
    {
      type: "banner",
      config: {
        imageId: bannerImage.id,
        title: { ar: "إكسسوارات تكمّل إطلالتك", en: "Accessories that complete your look" },
        subtitle: { ar: "ساعات ونظارات وقلادات مختارة.", en: "Watches, sunglasses and necklaces." },
        ctaLabel: { ar: "تصفّح الإكسسوارات", en: "Browse accessories" },
        ctaHref: "/c/accessories",
        tone: "light",
      },
    },
    null,
  );
  await saveHomeSection(
    {
      type: "products",
      title: { ar: "منتجات مميزة", en: "Featured" },
      config: { source: "featured", limit: 8, layout: "grid" },
    },
    null,
  );

  // Final layout: hero → categories → new → banner → deals → featured → trust badges.
  const sections = await getAllHomeSections();
  const rank = (s: (typeof sections)[number]) => {
    if (s.type === "products")
      return { newest: 2, on_sale: 4, featured: 5 }[s.config.source as string] ?? 6;
    return { hero: 0, categories: 1, banner: 3, features: 7, text: 8 }[s.type] ?? 9;
  };
  await reorderHomeSections(
    [...sections].sort((a, b) => rank(a) - rank(b)).map((s) => s.id),
    null,
  );

  await db
    .insert(coupons)
    .values({
      code: "WELCOME10",
      description: "Demo: 10% off first order",
      type: "percentage",
      value: 10,
      minSubtotal: price(50_000),
      maxDiscount: price(20_000),
      usageLimitPerCustomer: 1,
    })
    .onConflictDoNothing();
  log("✓ hero imagery, banner and coupon WELCOME10");

  const [{ value: catCount }] = (await db.select({ value: count() }).from(categories)) as [
    { value: number },
  ];
  log(`✓ demo ready (${catCount} categories)`);
}
