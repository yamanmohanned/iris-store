/**
 * هوية المتجر (الشعار والخطوط) — ملف مشترك بين الواجهة والخادم.
 * الخطوط المرفقة مستضافة محلياً في public/fonts وتُعرّف في src/styles/fonts.css،
 * والمتصفح لا يحمّل ملف الخط إلا إذا اختير فعلاً.
 */

export const FONT_PRESETS = [
  { id: 'plex', label: 'IBM Plex Sans Arabic', family: 'IBM Plex Sans Arabic', note: 'الخط الأصلي للنصوص' },
  { id: 'messiri', label: 'المسيري', family: 'El Messiri', note: 'الخط الأصلي للعناوين' },
  { id: 'cairo', label: 'القاهرة', family: 'Cairo', note: 'عصري وواضح' },
  { id: 'tajawal', label: 'تجوّل', family: 'Tajawal', note: 'خفيف وأنيق' },
  { id: 'almarai', label: 'المراعي', family: 'Almarai', note: 'هادئ ومقروء' },
] as const;

export type FontPresetId = (typeof FONT_PRESETS)[number]['id'];

/** خط مرفوع من المالك: ملف عادي، وملف عريض اختياري للعناوين والأزرار. */
export interface CustomFont {
  name: string;
  regular: string;
  bold?: string;
}

export type FontRef = { preset: FontPresetId } | CustomFont;

export interface Branding {
  /** شعار مرفوع (PNG/JPG/WEBP). فارغ = شعار آيريس الأصلي */
  logo?: string;
  /** نسخة للخلفيات الداكنة (اختيارية) */
  logoDark?: string;
  /** تلوين الشعار بألوان الموقع (للشعارات الشفافة بلون واحد) */
  logoTint?: boolean;
  /** إظهار كلمة IRIS بجانب الشعار */
  showWordmark?: boolean;
  bodyFont?: FontRef;
  headingFont?: FontRef;
}

export const DEFAULT_BODY_FONT: FontRef = { preset: 'plex' };
export const DEFAULT_HEADING_FONT: FontRef = { preset: 'messiri' };

/** الخطوط البديلة خلف أي خط مختار (تبقى العربية مقروءة لو تأخر تحميل الملف). */
export const FALLBACK_STACK = `'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif`;

export const FONT_FILE_PATTERN = /^\/uploads\/fonts\/[a-f0-9]{20}\.(woff2|woff|ttf|otf)$/;

export function isPresetFont(f: FontRef | undefined): f is { preset: FontPresetId } {
  return !!f && 'preset' in f;
}

export function presetFamily(id: string): string | null {
  return FONT_PRESETS.find((p) => p.id === id)?.family ?? null;
}

const FORMATS: Record<string, string> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };

function fontFace(family: string, url: string, weight: string): string {
  // نفس نمط الخادم: روابط الخطوط المرفوعة فقط، حتى لا يدخل أي نص آخر إلى CSS
  if (!FONT_FILE_PATTERN.test(url)) return '';
  const format = FORMATS[url.split('.').pop() ?? ''] ?? 'woff2';
  return `@font-face{font-family:'${family}';src:url('${url}') format('${format}');font-weight:${weight};font-style:normal;font-display:swap}`;
}

/** اسم العائلة لخط مختار + قواعد @font-face إن كان مرفوعاً. */
function resolveFont(f: FontRef, role: 'Body' | 'Heading'): { family: string; faces: string } {
  if (isPresetFont(f)) return { family: `'${presetFamily(f.preset) ?? 'IBM Plex Sans Arabic'}'`, faces: '' };
  const family = `IrisCustom${role}`;
  const faces = f.bold
    ? fontFace(family, f.regular, '100 500') + fontFace(family, f.bold, '600 900')
    : fontFace(family, f.regular, '100 900');
  return faces ? { family: `'${family}'`, faces } : { family: `'IBM Plex Sans Arabic'`, faces: '' };
}

/**
 * CSS هوية المتجر: قواعد الخطوط المرفوعة + متغيرا --font-text و --font-heading.
 * فارغ عند عدم تخصيص الخطوط (تبقى القيم الافتراضية في index.css).
 */
export function brandingCss(b: Branding | undefined): string {
  if (!b?.bodyFont && !b?.headingFont) return '';
  const body = resolveFont(b.bodyFont ?? DEFAULT_BODY_FONT, 'Body');
  const heading = resolveFont(b.headingFont ?? DEFAULT_HEADING_FONT, 'Heading');
  return `${body.faces}${heading.faces}:root{--font-text:${body.family}, ${FALLBACK_STACK};--font-heading:${heading.family}, ${FALLBACK_STACK}}`;
}

/** نسخة صغيرة يقرؤها index.html قبل تشغيل الواجهة حتى لا يظهر الشعار والخط الافتراضيان لحظة. */
export const BRANDING_BOOT_KEY = 'iris.branding.boot';
