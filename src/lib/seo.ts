import seoPages from '@/data/seoPages.json';
import type { CatalogSnapshot } from '@/data/catalog';
import type { Product } from '@/data/types';
import { contactLinks } from '@/lib/contact';

/**
 * عنوان الصفحة ووصفها وبطاقة المشاركة والبيانات المنظمة لكل مسار — للمتصفح بعد التحميل.
 * الخادم (server/api/inc/seo.php) يكتب القيم نفسها في HTML قبل وصوله، لأن واتساب وفيسبوك وتيليغرام وبعض الزواحف
 * لا تشغّل JavaScript؛ وهذا الملف يبقيها صحيحة عند التنقل داخل المتجر. أي تعديل هنا يقابله تعديل في seo.php
 * (يفحص التطابقَ scripts/qa/seo-check.mjs).
 */

export interface Seo {
  title: string;
  description: string;
  /** مسار الصورة (نسبي أو مطلق) */
  image: string;
  /** المسار المعتمد (canonical) بلا نطاق */
  path: string;
  type: 'website' | 'product';
  noindex: boolean;
  jsonLd: Array<Record<string, unknown>>;
}

const SITE = seoPages.siteName;

/** وصف مناسب لنتيجة البحث: يقتطع عند حد كلمة. */
export function clip(text: string, max = 200): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s،,.؛:-]+$/, '') + '…';
}

export function absoluteUrl(origin: string, pathOrUrl: string): string {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : origin + (pathOrUrl.startsWith('/') ? '' : '/') + pathOrUrl;
}

function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/{2,}/g, '/');
  return p.length > 1 ? p.replace(/\/+$/, '') : p || '/';
}

function productDescription(p: Product): string {
  const base = p.summary || p.content?.description?.[0] || `${p.name} من ${SITE}`;
  return clip(`${base} السعر ${Math.round(p.price).toLocaleString('en-US')} د.ع.`);
}

function productJsonLd(p: Product, origin: string, url: string, categoryName: string, categoryUrl: string): Array<Record<string, unknown>> {
  const images = [p.image, ...(p.gallery ?? [])].filter(Boolean);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: productDescription(p),
      sku: p.sku || p.id,
      image: [...new Set(images)].slice(0, 6).map((i) => absoluteUrl(origin, i)),
      brand: { '@type': 'Brand', name: SITE },
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'IQD',
        price: String(Math.round(p.price)),
        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE, item: origin + '/' },
        { '@type': 'ListItem', position: 2, name: categoryName, item: categoryUrl },
        { '@type': 'ListItem', position: 3, name: p.name, item: url },
      ],
    },
  ];
}

function homeJsonLd(catalog: CatalogSnapshot, origin: string): Array<Record<string, unknown>> {
  const c = contactLinks(catalog.settings);
  const logo = catalog.settings.branding?.logo || '/brand/icon-512.png';
  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE,
    url: origin + '/',
    logo: absoluteUrl(origin, logo),
  };
  if (c.instagram) org.sameAs = [c.instagram];
  const digits = (catalog.settings.whatsapp ?? '').replace(/\D/g, '');
  if (digits) org.contactPoint = { '@type': 'ContactPoint', telephone: '+' + digits, contactType: 'customer service', availableLanguage: 'Arabic' };
  return [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, url: origin + '/', inLanguage: 'ar' }];
}

const NOT_FOUND = { title: `الصفحة غير موجودة | ${SITE}`, description: seoPages.defaultDescription };

/** المعلومات المناسبة لمسار المتجر الحالي. */
export function buildSeo(pathname: string, catalog: CatalogSnapshot, origin: string): Seo {
  const path = normalizePath(pathname);
  const base = { image: seoPages.defaultImage, path, type: 'website' as const, jsonLd: [] as Array<Record<string, unknown>> };

  const hidden = seoPages.noindexPrefixes.find((p) => path === p || path.startsWith(p + '/'));
  if (hidden) {
    const name = (seoPages.noindexTitles as Record<string, string>)[hidden];
    return { ...base, title: name ? `${name} | ${SITE}` : SITE, description: seoPages.defaultDescription, noindex: true };
  }

  if (path === '/') {
    return { ...base, title: seoPages.defaultTitle, description: seoPages.defaultDescription, noindex: false, jsonLd: homeJsonLd(catalog, origin) };
  }

  const page = (seoPages.pages as Record<string, { title: string; description: string }>)[path];
  if (page) return { ...base, title: `${page.title} | ${SITE}`, description: page.description, noindex: false };

  const collection = /^\/collections\/([^/]+)$/.exec(path);
  if (collection) {
    const slug = safeDecode(collection[1]);
    const cat = catalog.visibleCategories.find((c) => c.slug === slug);
    if (cat) {
      const title = cat.title || cat.name;
      return {
        ...base,
        title: `${title} | ${SITE}`,
        description: clip(cat.description || `تسوّقي ${cat.name} من ${SITE}: توصيل لجميع محافظات العراق والدفع عند الاستلام.`),
        image: cat.image || base.image,
        noindex: false,
      };
    }
  }

  const product = /^\/products\/([^/]+)$/.exec(path);
  if (product) {
    const slug = safeDecode(product[1]);
    const p = catalog.visibleProducts.find((x) => x.slug === slug);
    if (p) {
      const cat = catalog.visibleCategories.find((c) => c.slug === p.category);
      const categoryName = cat?.name ?? SITE;
      return {
        ...base,
        title: `${p.name} | ${SITE}`,
        description: productDescription(p),
        image: p.image || base.image,
        type: 'product',
        noindex: false,
        jsonLd: productJsonLd(p, origin, origin + path, categoryName, origin + (cat ? `/collections/${cat.slug}` : '/')),
      };
    }
  }

  return { ...base, ...NOT_FOUND, noindex: true };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/* ───────── كتابة الوسوم في <head> ───────── */

const MARK = 'data-seo';
const LOCK = 'data-seo-lock';

let serverLock: boolean | null = null;
/** هل كتب الخادم noindex عاماً في الصفحة الأولى؟ (يُقرأ مرة واحدة قبل أن نعدّل الوسوم) */
function lockedByServer(): boolean {
  if (serverLock === null) serverLock = document.head.querySelector(`meta[name=robots][${LOCK}]`) !== null;
  return serverLock;
}

function head(): HTMLHeadElement {
  return document.head;
}

function upsert(selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void): void {
  let el = head().querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    head().appendChild(el);
  }
  set(el);
}

function meta(attr: 'name' | 'property', key: string, content: string): void {
  upsert(
    `meta[${attr}="${key}"]`,
    () => {
      const m = document.createElement('meta');
      m.setAttribute(attr, key);
      return m;
    },
    (el) => el.setAttribute('content', content),
  );
}

/** النطاق الذي يعتمده الخادم (من canonical الذي كتبه) وإلا نطاق الصفحة الحالية. */
export function siteOrigin(): string {
  const canonical = head().querySelector<HTMLLinkElement>(`link[rel="canonical"][${MARK}]`);
  if (canonical?.href) {
    try {
      return new URL(canonical.href).origin;
    } catch {
      /* يُستعمل نطاق الصفحة */
    }
  }
  return window.location.origin;
}

/**
 * يكتب وسوم الصفحة. يضيف وسم noindex ويزيله بنفسه فقط (data-seo)، فلا يمسّ وسم noindex ثابتاً في الصفحة
 * (نسخة Netlify التجريبية).
 */
export function applySeo(seo: Seo, origin: string): void {
  // الخادم يمنع الفهرسة كلها ما دام site_url غير مضبوط (data-seo-lock): لا نرفعه عند التنقل داخل المتجر
  const locked = lockedByServer();
  document.title = seo.title;
  meta('name', 'description', seo.description);
  const url = origin + (seo.path === '/' ? '/' : seo.path);
  const image = absoluteUrl(origin, seo.image);
  meta('property', 'og:type', seo.type === 'product' ? 'product' : 'website');
  meta('property', 'og:title', seo.title);
  meta('property', 'og:description', seo.description);
  meta('property', 'og:url', url);
  meta('property', 'og:image', image);
  meta('name', 'twitter:card', 'summary_large_image');
  meta('name', 'twitter:title', seo.title);
  meta('name', 'twitter:description', seo.description);
  meta('name', 'twitter:image', image);

  head()
    .querySelectorAll(`link[rel="canonical"][${MARK}], meta[name=robots][${MARK}], script[type="application/ld+json"][${MARK}]`)
    .forEach((el) => el.remove());
  if (seo.noindex || locked) {
    const m = document.createElement('meta');
    m.setAttribute('name', 'robots');
    m.setAttribute('content', 'noindex, nofollow');
    m.setAttribute(MARK, '');
    if (locked) m.setAttribute(LOCK, '');
    head().appendChild(m);
  } else {
    const l = document.createElement('link');
    l.rel = 'canonical';
    l.href = url;
    l.setAttribute(MARK, '');
    head().appendChild(l);
  }
  for (const data of seo.jsonLd) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute(MARK, '');
    s.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    head().appendChild(s);
  }
}
