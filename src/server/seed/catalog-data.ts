/**
 * Demo catalog (prices in IQD; converted for other currencies at seed time).
 * Option values are given as labels; ids are generated when seeding.
 */
type L = { ar: string; en: string };

export type DemoCategory = { key: string; name: L; description: L; icon: string; hue: number };

export type DemoProduct = {
  category: string;
  name: L;
  short: L;
  description: L;
  price: number;
  compareAt?: number;
  icon: string;
  hue: number;
  images?: number;
  featured?: boolean;
  brand?: string;
  tags?: string[];
  /** Up to two options; every combination becomes a variant. */
  options?: { name: L; values: (L & { color?: string })[] }[];
  /** Stock per variant (cycled); 0 makes it sold out. */
  stock?: number[];
};

const sizes = (list: string[]): L[] => list.map((s) => ({ ar: s, en: s }));

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    key: "women",
    name: { ar: "ملابس نسائية", en: "Women" },
    description: {
      ar: "أحدث صيحات الأزياء النسائية لكل المناسبات.",
      en: "The latest women's fashion for every occasion.",
    },
    icon: "shirt",
    hue: 280,
  },
  {
    key: "men",
    name: { ar: "ملابس رجالية", en: "Men" },
    description: {
      ar: "قطع أساسية بجودة عالية وتصاميم عصرية.",
      en: "High-quality essentials with modern cuts.",
    },
    icon: "shirt",
    hue: 215,
  },
  {
    key: "shoes",
    name: { ar: "أحذية", en: "Shoes" },
    description: { ar: "راحة وأناقة في كل خطوة.", en: "Comfort and style in every step." },
    icon: "footprints",
    hue: 30,
  },
  {
    key: "bags",
    name: { ar: "حقائب", en: "Bags" },
    description: {
      ar: "حقائب عملية وأنيقة لكل يوم.",
      en: "Practical, elegant bags for every day.",
    },
    icon: "handbag",
    hue: 335,
  },
  {
    key: "accessories",
    name: { ar: "إكسسوارات", en: "Accessories" },
    description: { ar: "لمسات تكمّل إطلالتك.", en: "Finishing touches for your look." },
    icon: "watch",
    hue: 175,
  },
  {
    key: "beauty",
    name: { ar: "العناية والجمال", en: "Beauty & care" },
    description: {
      ar: "منتجات عناية مختارة بعناية.",
      en: "Carefully chosen beauty and care products.",
    },
    icon: "sparkles",
    hue: 350,
  },
];

const colors = {
  black: { ar: "أسود", en: "Black", color: "#1f1f24" },
  white: { ar: "أبيض", en: "White", color: "#f7f7f5" },
  beige: { ar: "بيج", en: "Beige", color: "#d9c4a5" },
  navy: { ar: "كحلي", en: "Navy", color: "#1e2a4a" },
  brown: { ar: "بني", en: "Brown", color: "#6b4430" },
  pink: { ar: "وردي", en: "Pink", color: "#f2b8c6" },
  blue: { ar: "أزرق", en: "Blue", color: "#7aa6d8" },
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    category: "women",
    name: { ar: "فستان صيفي بأكمام قصيرة", en: "Short-sleeve summer dress" },
    short: {
      ar: "قماش خفيف ومريح يناسب الأيام الحارة.",
      en: "Light, breathable fabric for hot days.",
    },
    description: {
      ar: "<p>فستان صيفي أنيق بقصّة مريحة وقماش خفيف يسمح بمرور الهواء.</p><ul><li>قطن 100%</li><li>قصّة واسعة مريحة</li><li>يُغسل بالغسالة على حرارة 30°</li></ul>",
      en: "<p>An elegant summer dress with a relaxed fit and breathable fabric.</p><ul><li>100% cotton</li><li>Relaxed fit</li><li>Machine wash at 30°</li></ul>",
    },
    price: 35_000,
    compareAt: 45_000,
    icon: "shirt",
    hue: 290,
    images: 3,
    featured: true,
    tags: ["صيفي", "قطن"],
    options: [{ name: { ar: "المقاس", en: "Size" }, values: sizes(["S", "M", "L", "XL"]) }],
    stock: [6, 10, 8, 3],
  },
  {
    category: "women",
    name: { ar: "عباية كلاسيكية سوداء", en: "Classic black abaya" },
    short: { ar: "تصميم ناعم بخامة كريب فاخرة.", en: "Soft design in premium crepe." },
    description: {
      ar: "<p>عباية سوداء كلاسيكية بخامة كريب ناعمة لا تتجعد بسهولة، مناسبة للاستخدام اليومي والمناسبات.</p>",
      en: "<p>A classic black abaya in soft, crease-resistant crepe — for everyday wear and occasions.</p>",
    },
    price: 55_000,
    icon: "shirt",
    hue: 265,
    images: 2,
    featured: true,
    options: [{ name: { ar: "الطول", en: "Length" }, values: sizes(["52", "54", "56", "58"]) }],
    stock: [4, 7, 7, 2],
  },
  {
    category: "women",
    name: { ar: "بلوزة قطنية ناعمة", en: "Soft cotton blouse" },
    short: {
      ar: "ثلاثة ألوان هادئة تناسب كل الإطلالات.",
      en: "Three calm colours that go with everything.",
    },
    description: {
      ar: "<p>بلوزة يومية من القطن الناعم بياقة دائرية.</p>",
      en: "<p>An everyday soft-cotton blouse with a round neck.</p>",
    },
    price: 22_000,
    icon: "shirt",
    hue: 320,
    images: 2,
    options: [
      { name: { ar: "اللون", en: "Color" }, values: [colors.white, colors.beige, colors.pink] },
      { name: { ar: "المقاس", en: "Size" }, values: sizes(["S", "M", "L"]) },
    ],
    stock: [5, 8, 4, 3, 0, 6],
  },
  {
    category: "men",
    name: { ar: "قميص أكسفورد رجالي", en: "Men's Oxford shirt" },
    short: { ar: "قميص كلاسيكي للعمل والمناسبات.", en: "A classic shirt for work and occasions." },
    description: {
      ar: "<p>قميص أكسفورد بقصّة منتظمة وأزرار عالية الجودة.</p>",
      en: "<p>A regular-fit Oxford shirt with quality buttons.</p>",
    },
    price: 28_000,
    icon: "shirt",
    hue: 210,
    images: 2,
    featured: true,
    options: [
      { name: { ar: "اللون", en: "Color" }, values: [colors.white, colors.blue] },
      { name: { ar: "المقاس", en: "Size" }, values: sizes(["M", "L", "XL", "XXL"]) },
    ],
    stock: [5, 9, 6, 2, 4, 7, 5, 1],
  },
  {
    category: "men",
    name: { ar: "دشداشة صيفية", en: "Summer dishdasha" },
    short: { ar: "خامة باردة ومريحة للصيف.", en: "Cool, comfortable fabric for summer." },
    description: {
      ar: "<p>دشداشة صيفية بخامة خفيفة وخياطة متقنة.</p>",
      en: "<p>A lightweight summer dishdasha with fine stitching.</p>",
    },
    price: 40_000,
    icon: "shirt",
    hue: 195,
    images: 2,
    options: [{ name: { ar: "المقاس", en: "Size" }, values: sizes(["54", "56", "58", "60"]) }],
    stock: [3, 6, 6, 3],
  },
  {
    category: "men",
    name: { ar: "بنطال تشينو", en: "Chino trousers" },
    short: { ar: "مرونة وراحة طوال اليوم.", en: "Stretch comfort all day long." },
    description: {
      ar: "<p>بنطال تشينو بقماش مرن وقصّة مستقيمة.</p>",
      en: "<p>Straight-cut chinos in stretch fabric.</p>",
    },
    price: 30_000,
    compareAt: 38_000,
    icon: "shirt",
    hue: 35,
    images: 2,
    options: [{ name: { ar: "المقاس", en: "Size" }, values: sizes(["30", "32", "34", "36"]) }],
    stock: [4, 8, 8, 4],
  },
  {
    category: "shoes",
    name: { ar: "حذاء رياضي خفيف", en: "Lightweight sneakers" },
    short: { ar: "نعل مريح ومناسب للمشي الطويل.", en: "Cushioned sole for long walks." },
    description: {
      ar: "<p>حذاء رياضي خفيف الوزن بنعل يمتص الصدمات.</p>",
      en: "<p>Lightweight sneakers with a shock-absorbing sole.</p>",
    },
    price: 45_000,
    icon: "footprints",
    hue: 25,
    images: 3,
    featured: true,
    options: [
      { name: { ar: "المقاس", en: "Size" }, values: sizes(["39", "40", "41", "42", "43", "44"]) },
    ],
    stock: [2, 5, 7, 7, 4, 2],
  },
  {
    category: "shoes",
    name: { ar: "صندل جلدي", en: "Leather sandals" },
    short: { ar: "جلد طبيعي بتصميم بسيط.", en: "Genuine leather, simple design." },
    description: {
      ar: "<p>صندل من الجلد الطبيعي مناسب للصيف.</p>",
      en: "<p>Genuine leather sandals for summer.</p>",
    },
    price: 32_000,
    icon: "footprints",
    hue: 15,
    images: 2,
    options: [
      { name: { ar: "المقاس", en: "Size" }, values: sizes(["40", "41", "42", "43", "44"]) },
    ],
    stock: [3, 4, 5, 3, 2],
  },
  {
    category: "shoes",
    name: { ar: "حذاء كعب أنيق", en: "Elegant heels" },
    short: { ar: "ارتفاع مريح بإطلالة راقية.", en: "Comfortable height, refined look." },
    description: {
      ar: "<p>حذاء بكعب متوسط مريح للمناسبات.</p>",
      en: "<p>Mid-height heels for special occasions.</p>",
    },
    price: 38_000,
    icon: "footprints",
    hue: 340,
    images: 2,
    options: [
      { name: { ar: "المقاس", en: "Size" }, values: sizes(["36", "37", "38", "39", "40"]) },
    ],
    stock: [2, 4, 4, 3, 1],
  },
  {
    category: "bags",
    name: { ar: "حقيبة يد جلدية", en: "Leather handbag" },
    short: { ar: "مساحة واسعة وتنظيم داخلي ذكي.", en: "Roomy, with smart inner pockets." },
    description: {
      ar: "<p>حقيبة يد من الجلد بثلاث جيوب داخلية وحزام كتف قابل للفصل.</p>",
      en: "<p>A leather handbag with three inner pockets and a detachable strap.</p>",
    },
    price: 60_000,
    compareAt: 75_000,
    icon: "handbag",
    hue: 330,
    images: 3,
    featured: true,
    options: [
      { name: { ar: "اللون", en: "Color" }, values: [colors.black, colors.brown, colors.beige] },
    ],
    stock: [5, 3, 4],
  },
  {
    category: "bags",
    name: { ar: "حقيبة ظهر عملية", en: "Everyday backpack" },
    short: { ar: "مقاومة للماء ومناسبة للابتوب.", en: "Water-resistant, fits a laptop." },
    description: {
      ar: "<p>حقيبة ظهر مقاومة للماء بجيب مبطّن للابتوب حتى 15 بوصة.</p>",
      en: "<p>Water-resistant backpack with a padded sleeve for laptops up to 15 inches.</p>",
    },
    price: 35_000,
    icon: "backpack",
    hue: 200,
    images: 2,
    options: [{ name: { ar: "اللون", en: "Color" }, values: [colors.black, colors.navy] }],
    stock: [8, 5],
  },
  {
    category: "bags",
    name: { ar: "محفظة صغيرة", en: "Mini wallet" },
    short: { ar: "تصميم نحيف يتسع لبطاقاتك.", en: "Slim design that fits your cards." },
    description: {
      ar: "<p>محفظة جلدية صغيرة بستّ خانات للبطاقات.</p>",
      en: "<p>A small leather wallet with six card slots.</p>",
    },
    price: 15_000,
    icon: "briefcase",
    hue: 25,
    images: 1,
    stock: [12],
  },
  {
    category: "accessories",
    name: { ar: "ساعة يد كلاسيكية", en: "Classic wristwatch" },
    short: { ar: "تصميم خالد مقاوم للماء.", en: "Timeless, water-resistant design." },
    description: {
      ar: "<p>ساعة بحركة كوارتز يابانية وزجاج مقاوم للخدش.</p>",
      en: "<p>Japanese quartz movement with scratch-resistant glass.</p>",
    },
    price: 85_000,
    icon: "watch",
    hue: 180,
    images: 3,
    featured: true,
    brand: "Iris",
    stock: [6],
  },
  {
    category: "accessories",
    name: { ar: "نظارة شمسية", en: "Sunglasses" },
    short: { ar: "حماية كاملة من الأشعة فوق البنفسجية.", en: "Full UV protection." },
    description: {
      ar: "<p>نظارة شمسية بعدسات مستقطبة وحماية UV400.</p>",
      en: "<p>Polarised lenses with UV400 protection.</p>",
    },
    price: 25_000,
    compareAt: 30_000,
    icon: "glasses",
    hue: 160,
    images: 2,
    stock: [9],
  },
  {
    category: "accessories",
    name: { ar: "قلادة فضية", en: "Silver necklace" },
    short: { ar: "فضة عيار 925 بلمسة ناعمة.", en: "925 sterling silver, delicate finish." },
    description: {
      ar: "<p>قلادة من الفضة الإسترلينية عيار 925 مع علبة هدية.</p>",
      en: "<p>A 925 sterling silver necklace with a gift box.</p>",
    },
    price: 48_000,
    icon: "gem",
    hue: 250,
    images: 2,
    stock: [0],
  },
  {
    category: "beauty",
    name: { ar: "عطر زهري فاخر 100 مل", en: "Floral eau de parfum 100ml" },
    short: {
      ar: "مزيج الورد والياسمين بثبات طويل.",
      en: "Rose and jasmine with long-lasting wear.",
    },
    description: {
      ar: "<p>عطر بنفحات الورد والياسمين وقاعدة من المسك.</p>",
      en: "<p>Notes of rose and jasmine on a musk base.</p>",
    },
    price: 70_000,
    icon: "spray-can",
    hue: 345,
    images: 2,
    featured: true,
    stock: [10],
  },
  {
    category: "beauty",
    name: { ar: "سيروم للعناية بالبشرة", en: "Skin care serum" },
    short: { ar: "ترطيب عميق ونضارة يومية.", en: "Deep hydration and daily glow." },
    description: {
      ar: "<p>سيروم بحمض الهيالورونيك وفيتامين C.</p>",
      en: "<p>A serum with hyaluronic acid and vitamin C.</p>",
    },
    price: 27_000,
    icon: "droplet",
    hue: 30,
    images: 2,
    stock: [15],
  },
  {
    category: "beauty",
    name: { ar: "مجموعة العناية اليومية", en: "Daily care set" },
    short: { ar: "كل ما تحتاجه في علبة واحدة.", en: "Everything you need in one box." },
    description: {
      ar: "<p>غسول ومرطب وواقي شمس في مجموعة مميزة.</p>",
      en: "<p>Cleanser, moisturiser and sunscreen in one set.</p>",
    },
    price: 42_000,
    compareAt: 50_000,
    icon: "sparkles",
    hue: 300,
    images: 2,
    stock: [7],
  },
];
