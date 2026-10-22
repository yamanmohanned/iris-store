/**
 * قراءة وصف منشور إنستغرام (عراقي غالباً) لاقتراح اسم المنتج وسعره ولونه وقسمه.
 * كلها اقتراحات تُعرض للمالك قبل الاستيراد ليعدّلها؛ لا يُعتمد عليها دون مراجعة.
 */
import type { Category, Product } from '@/data/types';

type Swatch = NonNullable<Product['swatches']>[number];

export interface ParsedCaption {
  name: string;
  /** أقل سعر مذكور (أو null إن لم يُذكر سعر) */
  price: number | null;
  /** أعلى سعر في نطاق مثل (6,000-8,000) */
  priceMax: number | null;
  swatches: Swatch[];
  /** «ستانلس ستيل بطلاء ثابت» إن ذُكر ذلك */
  material: string;
  /** فقرات الوصف بلا وسوم ولا رموز تعبيرية */
  paragraphs: string[];
}

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu;

/** أرقام عربية/فارسية ← إنجليزية، وحروف عراقية/فارسية ← عربية قياسية. */
export function normalizeCaption(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[گ]/g, 'ك')
    .replace(/[ک]/g, 'ك')
    .replace(/[ی]/g, 'ي');
}

const PRODUCT_WORDS = /(قلاد|كلاد|قلائد|سلسال|سلسل|عقد|سوار|اسوار|أسوار|انسيال|إنسيال|خاتم|خواتم|محبس|محابس|تطقيم|سيت|حلق|اقراط|أقراط|قرط|تراجي|ساعة|ساعات|ميدالي|بروش|خلخال)/;
/** كلمات تبدأ بعدها تفاصيل لا تدخل في الاسم */
const NAME_STOP = /\s(متوفر|متوفرة|متوفره|بطلاء|طلاء|طلاءها|باللون|بلون|السعر|سعر|بسعر|حسب|مع|ب\d)/;

function cleanLine(line: string): string {
  return line
    .replace(EMOJI, '')
    .replace(/[#@][\p{L}\p{N}_.]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(text: string): { price: number | null; priceMax: number | null } {
  const t = text.replace(/[٬،]/g, ',');
  // «8 آلاف» / «8 الاف» / «12 ألف»
  const thousands = [...t.matchAll(/(\d{1,3})\s*(?:الاف|آلاف|ألف|الف)/g)].map((m) => Number(m[1]) * 1000);
  const numbers = [...t.matchAll(/(?<![\d:])(\d{1,3}(?:,\d{3})+|\d{4,7})(?![\d:])/g)]
    .map((m) => Number(m[1].replace(/,/g, '')))
    .filter((n) => n >= 1000 && n <= 5_000_000);
  // الأرقام القريبة من كلمة السعر أولاً
  const near = /(سعر|السعر|بسعر)([^\n]{0,40})/.exec(t);
  const preferred = near ? [...near[2].matchAll(/(\d{1,3}(?:,\d{3})+|\d{4,7})/g)].map((m) => Number(m[1].replace(/,/g, ''))) : [];
  const all = (preferred.length ? preferred : [...numbers, ...thousands]).filter((n) => n >= 1000);
  if (!all.length) return { price: null, priceMax: null };
  const range = /(\d{1,3}(?:,\d{3})+|\d{4,7})\s*[-–—]\s*(\d{1,3}(?:,\d{3})+|\d{4,7})/.exec(t);
  if (range) {
    const a = Number(range[1].replace(/,/g, ''));
    const b = Number(range[2].replace(/,/g, ''));
    if (a >= 1000 && b > a) return { price: a, priceMax: b };
  }
  return { price: all[0], priceMax: null };
}

export function parseCaption(raw: string): ParsedCaption {
  const text = normalizeCaption(raw);
  const lines = text.split(/\n+/).map(cleanLine).filter(Boolean);
  const paragraphs = lines.filter((l) => !/توصيل|للطلب|دايركت|الطلب/.test(l) || PRODUCT_WORDS.test(l));

  let name = lines.find((l) => PRODUCT_WORDS.test(l)) ?? lines[0] ?? '';
  const stop = NAME_STOP.exec(` ${name}`);
  if (stop && stop.index > 0) name = ` ${name}`.slice(0, stop.index).trim();
  name = name
    .replace(/^(كلادة|كلاده|قلاده)/, 'قلادة')
    .replace(/[.,:،!؟?]+$/, '')
    .slice(0, 60)
    .trim();

  const swatches: Swatch[] = [];
  if (/ذهبي|الذهبي|ذهب/.test(text)) swatches.push('gold');
  if (/فضي|الفضي|فضة/.test(text)) swatches.push('silver');
  if (/روز|وردي/.test(text)) swatches.push('rose');
  if (/اسود|أسود|الاسود/.test(text)) swatches.push('black');

  const material = /ستانلس|ستيل/.test(text)
    ? 'ستانلس ستيل بطلاء ثابت'
    : /طلاء\s*ثابت|طلاءها\s*ثابت/.test(text)
      ? 'معدن بطلاء ثابت'
      : '';

  return { name, ...parsePrice(text), swatches, material, paragraphs };
}

/** كلمات ترجّح كل قسم (بالمعرّف أو بالاسم). */
const CATEGORY_HINTS: Array<{ words: RegExp; slugs: string[]; names: RegExp }> = [
  { words: /كبلز|كوبلز|كابلز|ثنائي|couple/i, slugs: ['couple-sets'], names: /ثنائ|كبلز/ },
  { words: /صديقات|صديقتين/, slugs: ['friends-sets'], names: /صديق/ },
  { words: /رجالي|للرجال/, slugs: ['men'], names: /رجال/ },
  { words: /قلاد|كلاد|قلائد|سلسال|سلسل|عقد/, slugs: ['necklaces'], names: /قلائد|قلادة|كلايد/ },
  { words: /سوار|اسوار|أسوار|انسيال|إنسيال/, slugs: ['bracelets'], names: /أساور|اسوار|سوار/ },
  { words: /خاتم|خواتم|محبس|محابس/, slugs: ['rings'], names: /خواتم|محابس/ },
  { words: /حلق|اقراط|أقراط|قرط|تراجي/, slugs: ['earrings'], names: /أقراط|اقراط|حلق/ },
  { words: /ساعة|ساعات/, slugs: ['watches'], names: /ساعات/ },
  { words: /ميدالي/, slugs: ['keychains'], names: /ميدالي/ },
  { words: /تطقيم|سيت/, slugs: ['couple-sets', 'sets', 'gifts'], names: /تطقيم|مجموع/ },
  { words: /هدية|بوكس/, slugs: ['gifts'], names: /هدايا|هدية/ },
];

/** يقترح قسماً موجوداً للمنشور، أو null إن لم يتضح. */
export function suggestCategory(raw: string, categories: Category[]): string | null {
  const text = normalizeCaption(raw);
  for (const hint of CATEGORY_HINTS) {
    if (!hint.words.test(text)) continue;
    const bySlug = hint.slugs.map((s) => categories.find((c) => c.slug === s)).find(Boolean);
    const byName = categories.find((c) => hint.names.test(c.name));
    const found = bySlug ?? byName;
    if (found) return found.slug;
  }
  return null;
}
