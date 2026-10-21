/**
 * الكتالوج: تنظيف البيانات قبل الحفظ (نفس قواعد iris_clean_catalog في PHP حرفياً حتى يتصرف
 * خادم التطوير وNetlify مثل الاستضافة)، وقاعدة الدمج حسب صلاحيات الموظف.
 */
import seed from '../../src/data/seed.json' with { type: 'json' };
import { FONT_FILE_PATTERN, FONT_PRESETS } from '../../src/lib/branding.ts';
import { allows, type Permissions } from '../../src/lib/permissions.ts';
import { fail, type Json, type Kv } from './base.ts';

const BADGES = ['new', 'sale', 'exclusive', 'bestseller', 'limited', 'soldout'];
const SWATCHES = ['gold', 'white', 'rose', 'silver', 'black'];

/* ───────────── أدوات التحقق (مطابقة لـ lib.php) ───────────── */

function str(value: unknown, max: number, required = false, label = 'الحقل'): string {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  // eslint-disable-next-line no-control-regex
  const v = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (required && v === '') fail(`${label} مطلوب.`);
  if ([...v].length > max) fail(`${label} أطول من المسموح (${max} حرفاً).`);
  return v;
}

function int(value: unknown, min: number, max: number, label = 'الرقم'): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n)) fail(`${label} يجب أن يكون رقماً.`);
  const r = Math.round(n);
  if (r < min || r > max) fail(`${label} خارج النطاق المسموح.`);
  return r;
}

/** رابط صورة أو ملف: مسار داخلي يبدأ بـ / أو رابط https. */
export function mediaUrl(value: unknown, label = 'رابط الصورة'): string {
  const url = str(value, 500, false, label);
  if (url === '') return '';
  if (url.includes('..')) fail(`${label}: الرابط غير صالح.`);
  if (url[0] === '/' && url[1] !== '/') return url;
  if (/^https:\/\/[^\s"'<>]+$/i.test(url)) return url;
  return fail(`${label}: الرابط غير صالح.`);
}

function slug(value: unknown, label = 'المعرّف'): string {
  const s = str(value, 120, true, label);
  if (!/^[\p{L}\p{N}][\p{L}\p{N}-]*$/u.test(s)) fail(`${label} يجب أن يحتوي حروفاً وأرقاماً وشرطات فقط.`);
  return s;
}

/* ───────────── التنظيف ───────────── */

function cleanCategories(input: unknown): Json[] {
  const list = Array.isArray(input) ? input : [];
  if (list.length > 200) fail('عدد الأقسام أكبر من المسموح (200).');
  const seen = new Set<string>();
  return list.map((c: Json, i) => {
    if (!c || typeof c !== 'object') fail('بيانات قسم غير صالحة.');
    const label = `القسم رقم ${i + 1}`;
    const s = slug(c.slug, `معرّف ${label}`);
    if (seen.has(s)) fail(`معرّف القسم «${s}» مكرر.`);
    seen.add(s);
    const name = str(c.name, 80, true, `اسم ${label}`);
    const cat: Json = {
      slug: s,
      name,
      title: str(c.title !== '' && c.title != null ? c.title : name, 120, true, `عنوان ${label}`),
      description: str(c.description, 1500, false, `وصف ${label}`),
      image: mediaUrl(c.image, `صورة ${label}`),
    };
    const unit = str(c.unit, 40);
    if (unit) cat.unit = unit;
    if (c.hidden) cat.hidden = true;
    return cat;
  });
}

function cleanContent(c: Json, label: string): Json {
  const out: Json = { description: [], specs: [] };
  if (Array.isArray(c.description)) {
    for (const para of c.description.slice(0, 10)) {
      const p = str(para, 3000, false, `وصف ${label}`);
      if (p) out.description.push(p);
    }
  }
  if (Array.isArray(c.specs)) {
    for (const spec of c.specs.slice(0, 40)) {
      if (!spec || typeof spec !== 'object') continue;
      const l = str(spec.label, 120);
      const v = str(spec.value, 300);
      if (l && v) out.specs.push({ label: l, value: v });
    }
  }
  if (c.story && typeof c.story === 'object') {
    const limits: Record<string, number> = { eyebrow: 120, title: 200, body: 3000, hallmarkTitle: 120, hallmarkNumber: 60 };
    out.story = Object.fromEntries(Object.entries(limits).map(([k, max]) => [k, str(c.story[k], max)]));
  }
  if (c.certificate && typeof c.certificate === 'object') {
    const limits: Record<string, number> = { title: 120, note: 300, badge: 60 };
    out.certificate = Object.fromEntries(Object.entries(limits).map(([k, max]) => [k, str(c.certificate[k], max)]));
  }
  return out;
}

function cleanProducts(input: unknown, categorySlugs: Set<string>): Json[] {
  const list = Array.isArray(input) ? input : [];
  if (list.length > 3000) fail('عدد المنتجات أكبر من المسموح (3000).');
  const ids = new Set<string>();
  const slugs = new Set<string>();
  return list.map((p: Json, i) => {
    if (!p || typeof p !== 'object') fail('بيانات منتج غير صالحة.');
    const name = str(p.name, 200, true, `اسم المنتج رقم ${i + 1}`);
    const label = `المنتج «${name}»`;
    const id = str(p.id, 64, true, `معرّف ${label}`);
    if (!/^[A-Za-z0-9_-]+$/.test(id) || ids.has(id)) fail(`معرّف ${label} غير صالح أو مكرر.`);
    ids.add(id);
    const s = slug(p.slug, `رابط ${label}`);
    if (slugs.has(s)) fail(`رابط ${label} مكرر مع منتج آخر.`);
    slugs.add(s);
    const category = str(p.category, 120, true, `قسم ${label}`);
    if (!categorySlugs.has(category)) fail(`قسم ${label} غير موجود.`);
    const image = mediaUrl(p.image, `صورة ${label}`);
    const gallery = (Array.isArray(p.gallery) ? p.gallery.slice(0, 12) : []).map((g: unknown) => mediaUrl(g, `صورة ${label}`)).filter(Boolean);
    if (!gallery.length && image) gallery.push(image);

    const out: Json = {
      id,
      slug: s,
      sku: str(p.sku, 40, false, `رمز ${label}`),
      name,
      shortName: str(p.shortName !== '' && p.shortName != null ? p.shortName : name, 120, true, `الاسم المختصر لـ${label}`),
      category,
      summary: str(p.summary, 500, false, `وصف ${label}`),
      metal: str(p.metal, 120, false, `خامة ${label}`),
      price: int(p.price ?? 0, 0, 1_000_000_000, `سعر ${label}`),
      stock: int(p.stock ?? 0, 0, 1_000_000, `كمية ${label}`),
      image,
      gallery,
    };
    if (p.oldPrice != null && p.oldPrice !== '' && Number(p.oldPrice) > 0) out.oldPrice = int(p.oldPrice, 0, 1_000_000_000, `السعر القديم لـ${label}`);
    if (BADGES.includes(p.badge)) out.badge = p.badge;
    if (Array.isArray(p.swatches)) {
      const sw = [...new Set(p.swatches.filter((x: unknown) => SWATCHES.includes(String(x))))];
      if (sw.length) out.swatches = sw;
    }
    if (Array.isArray(p.sizes)) {
      const sizes = p.sizes
        .slice(0, 30)
        .filter((x: unknown) => x && typeof x === 'object')
        .map((x: Json) => {
          const size: Json = { label: str(x.label, 40, true, `مقاس ${label}`) };
          const note = str(x.note, 80);
          if (note) size.note = note;
          if (x.soldOut) size.soldOut = true;
          return size;
        });
      if (sizes.length) out.sizes = sizes;
    }
    if (Array.isArray(p.tags)) {
      const tags = p.tags
        .slice(0, 20)
        .map((t: unknown) => str(t, 40))
        .filter(Boolean);
      if (tags.length) out.tags = tags;
    }
    if (Array.isArray(p.videos)) {
      const videos = p.videos
        .slice(0, 3)
        .map((v: unknown) => mediaUrl(v, `فيديو ${label}`))
        .filter(Boolean);
      if (videos.length) out.videos = videos;
    }
    const source = str(p.source, 80);
    if (source) {
      if (!/^ig:[A-Za-z0-9_]+$/.test(source)) fail(`مصدر ${label} غير صالح.`);
      out.source = source;
      const sourceUrl = mediaUrl(p.sourceUrl, `رابط مصدر ${label}`);
      if (sourceUrl) out.sourceUrl = sourceUrl;
    }
    if (p.hidden) out.hidden = true;
    if (p.content && typeof p.content === 'object') out.content = cleanContent(p.content, label);
    return out;
  });
}

function cleanFont(f: unknown, label: string): Json | undefined {
  if (!f || typeof f !== 'object') return undefined;
  const v = f as Json;
  if ('preset' in v) {
    if (!FONT_PRESETS.some((p) => p.id === v.preset)) fail(`${label}: الخط غير معروف.`);
    return { preset: v.preset };
  }
  const name = str(v.name, 60, true, `اسم ${label}`);
  const regular = str(v.regular, 200, true, `ملف ${label}`);
  if (!FONT_FILE_PATTERN.test(regular)) fail(`${label}: ملف الخط غير صالح. ارفعه من صفحة الهوية.`);
  const out: Json = { name, regular };
  const bold = str(v.bold, 200);
  if (bold) {
    if (!FONT_FILE_PATTERN.test(bold)) fail(`${label}: ملف الخط العريض غير صالح.`);
    out.bold = bold;
  }
  return out;
}

function cleanBranding(b: unknown): Json | undefined {
  if (!b || typeof b !== 'object') return undefined;
  const v = b as Json;
  const out: Json = {};
  const logo = mediaUrl(v.logo, 'الشعار');
  if (logo) out.logo = logo;
  const logoDark = mediaUrl(v.logoDark, 'شعار الخلفيات الداكنة');
  if (logoDark) out.logoDark = logoDark;
  if (v.logoTint) out.logoTint = true;
  if (v.showWordmark === false) out.showWordmark = false;
  const body = cleanFont(v.bodyFont, 'خط النصوص');
  if (body) out.bodyFont = body;
  const heading = cleanFont(v.headingFont, 'خط العناوين');
  if (heading) out.headingFont = heading;
  return Object.keys(out).length ? out : undefined;
}

export function cleanSettings(s: Json): Json {
  const coupons: Json = {};
  if (s.coupons && typeof s.coupons === 'object') {
    for (const [rawCode, c] of Object.entries(s.coupons as Json).slice(0, 100)) {
      const code = rawCode.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{2,24}$/.test(code) || !c || typeof c !== 'object') fail(`رمز القسيمة «${code}» غير صالح (حروف إنجليزية وأرقام فقط).`);
      coupons[code] = { percent: int((c as Json).percent ?? 0, 1, 90, `نسبة القسيمة ${code}`), label: str((c as Json).label, 80, false, 'وصف القسيمة') };
    }
  }
  const whatsapp = String(s.whatsapp ?? '').replace(/\D+/g, '');
  if (whatsapp.length > 15) fail('رقم واتساب غير صالح.');
  const instagram = String(s.instagram ?? '')
    .trim()
    .replace(/^@+/, '');
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) fail('اسم حساب إنستغرام غير صالح.');
  const out: Json = {
    shippingFee: int(s.shippingFee ?? seed.settings.shippingFee, 0, 10_000_000, 'أجور التوصيل'),
    freeShippingThreshold: int(s.freeShippingThreshold ?? seed.settings.freeShippingThreshold, 0, 1_000_000_000, 'حد التوصيل المجاني'),
    coupons,
    whatsapp,
    instagram,
    heroImage: mediaUrl(s.heroImage, 'صورة الغلاف'),
  };
  const branding = cleanBranding(s.branding);
  if (branding) out.branding = branding;
  return out;
}

export function cleanCatalog(input: Json): Json {
  const categories = cleanCategories(input.categories);
  const products = cleanProducts(input.products, new Set(categories.map((c) => c.slug)));
  const settings = cleanSettings(input.settings && typeof input.settings === 'object' ? input.settings : {});
  return { categories, products, settings };
}

/**
 * الموظف يرسل الكتالوج كاملاً، لكن الأجزاء التي لا يملك تعديلها تؤخذ من النسخة المحفوظة على الخادم
 * قبل التحقق — فلا يستطيع تغييرها حتى لو أرسلها (أو كانت نسخته قديمة).
 */
export function mergeForPermissions(incoming: Json, stored: Json, perms: Permissions): Json {
  const merged = {
    categories: allows(perms, 'categories', 'edit') ? incoming.categories : stored.categories,
    products: allows(perms, 'products', 'edit') ? incoming.products : stored.products,
    settings: allows(perms, 'settings', 'edit') ? incoming.settings : stored.settings,
  };
  if (!allows(perms, 'products', 'edit')) {
    const slugs = new Set((Array.isArray(merged.categories) ? merged.categories : []).map((c: Json) => c?.slug));
    if ((merged.products ?? []).some((p: Json) => !slugs.has(p.category)))
      fail('لا يمكن حذف قسم فيه منتجات دون صلاحية تعديل المنتجات. انقل منتجاته أولاً أو اطلب ذلك من المالك.', 403);
  }
  return merged;
}

/** متجر فارغ تماماً جاهز لإدخال البيانات (وضع «متجر فارغ» في إعادة الضبط). */
export function blankCatalog(): Json {
  return {
    categories: [],
    products: [],
    settings: {
      shippingFee: seed.settings.shippingFee,
      freeShippingThreshold: seed.settings.freeShippingThreshold,
      coupons: {},
      whatsapp: '',
      instagram: '',
      heroImage: '',
    },
  };
}

export const loadCatalog = async (kv: Kv): Promise<Json> => (await kv.getJSON('catalog')) ?? structuredClone(seed as Json);
