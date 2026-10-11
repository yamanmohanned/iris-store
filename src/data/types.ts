/** معرّف القسم في الرابط (`/collections/:slug`). الأقسام يضيفها المالك من لوحة الإدارة. */
export type CategorySlug = string;

export type ProductBadge = 'new' | 'sale' | 'exclusive' | 'bestseller' | 'limited' | 'soldout';

export interface Category {
  slug: CategorySlug;
  /** اسم القسم (قلائد، أساور، محابس…) */
  name: string;
  /** عنوان صفحة القسم */
  title: string;
  description: string;
  /** وحدة العدّ في ترويسة القسم: قطعة فريدة / قطعة مصوغة… */
  unit?: string;
  image: string;
  /** مخفي عن الزوار (يبقى ظاهراً في لوحة الإدارة) */
  hidden?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  /** الاسم القصير المستخدم في الأرقام المرجعية (قلادة ذهبية رقم 102) */
  shortName: string;
  /** القسم الذي خصّصه المالك لهذا المنتج */
  category: CategorySlug;
  /** وصف مختصر في البطاقة */
  summary: string;
  /** المعدن والخام */
  metal: string;
  price: number;
  oldPrice?: number;
  badge?: ProductBadge;
  /** حالة التوفر؛ 0 = نفد مؤقتاً */
  stock: number;
  image: string;
  gallery: string[];
  /** ألوان المعدن المتاحة (للنقاط الملونة في البطاقة) */
  swatches?: Array<'gold' | 'white' | 'rose' | 'silver' | 'black'>;
  /** أطوال/مقاسات متاحة */
  sizes?: Array<{ label: string; note?: string; soldOut?: boolean }>;
  tags?: string[];
  /** مخفي عن الزوار (مسودة) */
  hidden?: boolean;
  /** محتوى تحريري مفصّل (القصة، المواصفات…) — اختياري */
  content?: ProductContent;
}

export interface ProductContent {
  /** فقرات الوصف الدقيق */
  description: string[];
  story?: { eyebrow: string; title: string; body: string; hallmarkTitle: string; hallmarkNumber: string };
  certificate?: { title: string; note: string; badge: string };
  /** مواصفات (التسمية: القيمة) */
  specs: Array<{ label: string; value: string }>;
}

/** إعدادات البيع التي يتحكم بها المالك. */
export interface StoreSettings {
  /** أجور التوصيل (د.ع) */
  shippingFee: number;
  /** التوصيل مجاني عند تجاوز هذا المبلغ (0 = لا يوجد توصيل مجاني) */
  freeShippingThreshold: number;
  /** القسائم: الرمز → النسبة والوصف */
  coupons: Record<string, { percent: number; label: string }>;
  /** رقم واتساب المتجر بالصيغة الدولية بلا + (9647xxxxxxxxx) */
  whatsapp?: string;
  /** اسم حساب إنستغرام بلا @ */
  instagram?: string;
  /** صورة غلاف الرئيسية على الهاتف */
  heroImage?: string;
}

export interface CatalogData {
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
  updatedAt?: string;
}

export interface CartLine {
  productId: string;
  qty: number;
  /** الاختيارات: المعدن، الطول/المقاس */
  options?: { metal?: string; size?: string };
}
