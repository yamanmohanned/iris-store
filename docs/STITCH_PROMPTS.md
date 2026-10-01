# برومبتات Stitch لتصميم واجهات منصة متجر الإكسسوارات
## موقع إلكتروني (Desktop) + تطبيق هاتف (Mobile) — ثيم العنابي والذهبي

> **الغرض:** ملف جاهز للنسخ واللصق في **Google Stitch** لتوليد كل شاشات المشروع (متجر العميل + لوحة الإدارة + تطبيق العميل + تطبيق الموظفة/المالك) بهوية بصرية موحدة: **عنابي غامق (Burgundy) مع لمسات ذهبية فاخرة**.
>
> **مصدر الشاشات والبيانات:** ملف الخطة `accessories_store_management_platform_plan.md` (الأقسام مُشار إليها بالرمز §).
>
> **الاسم المؤقت:** `IRIS | آيريس` (من اسم المستودع — يُستبدل باسم المتجر الفعلي في البرومبتات).

---

## 0. كيف تستخدم هذا الملف (5 خطوات)

| # | الخطوة | التفاصيل |
|:--:|---|---|
| 1 | **اختر نوع التصميم** | في Stitch اختر **Web** لشاشات الحاسوب، و**App (Mobile)** لشاشات الهاتف. لا تخلط النوعين في نفس المحادثة |
| 2 | **ابدأ بـ Master Prompt** | انسخ كتلة **القسم 2 (Master DESIGN.md)** والصقها كأول رسالة في كل مشروع/محادثة جديدة. هي التي تثبّت الألوان والخطوط والأسلوب |
| 3 | **ابدأ بالصفحة الرئيسية** | ولّد `W-01` (للموقع) و`M-02` (للتطبيق) أولاً لأنهما يحددان الهوية؛ راجعهما وعدّلهما حتى ترضيك، ثم كمّل الباقي |
| 4 | **شاشة = برومبت** | الصق برومبت **شاشة واحدة** في كل مرة. كل برومبت يحمل سطر `Style:` يذكّر Stitch بالهوية. الصفحات الطويلة (الرئيسية) مقسّمة إلى **أجزاء** عمداً لأن Stitch يعطي نتائج أدق مع الصفحات القصيرة |
| 5 | **حسّن بالمتابعة** | استخدم **القسم 8 (برومبتات التحسين)** للتعديل (أفخم، أخف ذهباً، إصلاح RTL، حالات فارغة/تحميل…) بدل إعادة التوليد من الصفر |

### ملاحظات مهمة

1. **لغة البرومبتات إنجليزية** لأن Stitch يعطي أفضل نتائج بها، **والنصوص العربية الفعلية للواجهة مكتوبة داخل البرومبت** (عناوين، أزرار، بيانات). إن أردت نسخة عربية من البرومبتات أخبرني.
2. **Stitch يولّد تصاميم ثابتة (HTML/CSS + صور)** وقد يضيف تأثيرات بسيطة (Hover/انتقالات). **الحركات المعقّدة وتأثيرات التمرير** (Parallax، Pin، Reveal…) توصف في **القسم 3** وتُنفَّذ فعلياً لاحقاً في الكود. ما يمكن لـ Stitch تصويره (حالات Hover، الهيدر بعد التمرير، الشريط اللاصق…) له برومبتات "حالة" مخصصة.
3. كل شاشة تذكر **رموز الحركات `FX-xx`** المناسبة لها من القسم 3، لتلصقها لاحقاً مع أداة البرمجة عند التنفيذ.
4. ميزات Stitch (النماذج، أدوات التصدير، الخطوط المتاحة) **تتغير مع الإصدارات**. إن لم يتوفر خط عربي مذكور في البرومبت فاستخدم البديل المكتوب بجانبه.
5. البرومبتات تستخدم **بيانات واقعية** من الخطة (حالات الطلب، أرقام الطلبات، دينار عراقي `د.ع`، محافظات العراق) بدل نصوص عشوائية، لتبدو الشاشات أقرب للتطبيق الحقيقي.

---

## 1. الهوية البصرية: العنابي والذهبي

### 1.1 الفكرة

> **"بوتيك مجوهرات في المساء":** خلفيات عاجية دافئة تتخللها أقسام عنابية عميقة كقطيفة صندوق المجوهرات، وخطوط ذهبية رفيعة (Hairlines) وزخارف دقيقة تعطي إحساس الصياغة اليدوية — **فخامة هادئة وليست استعراضية**.

**قاعدة الألوان:** العنابي هو **لون الهوية الأساسي**، والذهبي هو **اللون المميِّز الوحيد (Accent)**. لا ألوان ثالثة في الواجهة التسويقية؛ الألوان الدلالية (نجاح/تحذير/خطأ) تظهر في لوحة الإدارة فقط.

### 1.2 لوحة الألوان (تم حساب التباين فعلياً — WCAG)

| الاسم | HEX | الدور | تباين / ملاحظة |
|---|---|---|---|
| **Wine Night** (عنابي ليلي) | `#1E070D` | أعمق خلفية (تذييل، أقسام داكنة، شريط جانبي في الإدارة) | الأبيض العاجي عليه 17.89 |
| **Deep Oxblood** | `#3A0A16` | شريط الإعلان، أقسام داكنة ثانوية | الذهبي الفاتح عليه 11.63 |
| **Burgundy 800** | `#5A0F22` | أسطح عنابية قوية، Hero داكن | العاجي عليه 12.80 · الذهبي عليه 5.74 |
| **Imperial Burgundy 700** | `#721328` | **اللون الأساسي**: الأزرار، الروابط، العناصر النشطة | العاجي عليه 10.62 · الذهبي عليه 4.76 |
| **Burgundy 600** | `#8A1B34` | Hover/Pressed للأزرار | — |
| **Rose Mist** | `#EED9DB` | حدود ناعمة وخلفيات شارات | زخرفي |
| **Blush Surface** | `#F7ECEC` | أسطح ثانوية فاتحة | النص الثانوي عليه 5.68 |
| **Ivory Canvas** | `#FBF6EF` | خلفية الصفحات الرئيسية | الحبر عليه 16.33 |
| **Parchment** | `#F3EADB` | أقسام بديلة دافئة | — |
| **Warm Ink** | `#2A1215` | النص الأساسي (لا أسود صرف أبداً) | 17.56 على الأبيض |
| **Muted Rosewood** | `#6D585B` | النص الثانوي والوصف | 6.11 على العاجي |
| **Royal Gold** | `#C9A24B` | **الذهبي الأساسي**: خطوط رفيعة، أيقونات، أزرار الذهب | على Wine Night = 8.02 · **على العاجي = 2.23 (زخرفة فقط، ممنوع للنص)** |
| **Champagne Gold** | `#E9D49C` | نص/أيقونات ذهبية على الخلفيات العنابية | على العنابي 700 = 7.81 |
| **Antique Gold** | `#8A6620` | **نص** ذهبي على الخلفيات الفاتحة | على العاجي 4.88 · على الأبيض 5.25 |
| **Gold Foil Gradient** | `#8F6B1F → #E6C871 → #C9A24B → #F3E2A9 → #A67C2E` (135°) | بريق معدني للأزرار المميزة والخطوط الكبيرة | للتزيين، ليس لنص طويل |
| **Hairline Gold** | `rgba(201,162,75,0.45)` | فواصل وحدود رفيعة 1px | — |
| **Hairline Burgundy** | `rgba(114,19,40,0.14)` | حدود البطاقات على الفاتح | — |

**ألوان الحالات (لوحة الإدارة فقط — أنيقة وغير عنابية لتفادي الخلط مع هوية الأحمر):**

| الحالة | النص / الخلفية | تباين |
|---|---|:--:|
| نجاح (Emerald) | `#1F6B4A` / `#E2F2EA` | 5.56 |
| تحذير (Amber) | `#8A4B08` / `#FCEBD0` | 5.80 |
| خطأ (Alert Red) | `#B42318` / `#FDE7E4` | 5.55 |
| معلومة (Slate Blue) | `#2F5A8A` / `#E4EDF8` | 6.02 |
| محايد | `#4D3C3F` / `#EFE7E4` | 8.47 |
| شارة الهوية (Burgundy) | `#5A0F22` / `#F3DCE0` | 10.57 |
| شارة ذهبية (Premium) | `#6E4F12` / `#F6E8C3` | 6.18 |

> كل حالة = **لون + أيقونة + نص** ولا يُكتفى باللون.

### 1.3 الخطوط (عربي أولاً)

| الاستخدام | الخط | البديل | ملاحظات |
|---|---|---|---|
| **عناوين المتجر والـ Hero** | **El Messiri** | Noto Naskh Arabic | عربي أنيق بروح زخرفية خفيفة يناسب المجوهرات |
| **النص والواجهات** | **IBM Plex Sans Arabic** | Tajawal · Cairo | مقروء ومستقر، أرقام جيدة |
| **شعار IRIS اللاتيني** (Wordmark فقط) | **Instrument Serif** | Fraunces | يُستخدم للشعار فقط |
| **لوحة الإدارة** | IBM Plex Sans Arabic + **IBM Plex Mono** للأرقام/SKU/أرقام الطلبات | Tajawal + JetBrains Mono | **Sans فقط** في اللوحات؛ أرقام Tabular |

**قواعد الخط العربي:** لا تباعد أحرف (`letter-spacing`) على النص العربي أبداً (يكسر اتصال الحروف) · ارتفاع السطر 1.7 للنص و1.35 للعناوين · لا مائل (Italic) ولا Uppercase في العربية · أرقام لاتينية `0-9` للأسعار والهواتف · أقصى عرض سطر ≈ 60 حرفاً · ممنوع `Inter` وخطوط النظام العامة.

### 1.4 اللغة الشكلية (Shape & Surface)

| العنصر | الوصف |
|---|---|
| **الزوايا** | حقول وأزرار 12px · بطاقات 20px · صور المنتجات 16px · **إطارات مقوّسة الرأس (Arch)** للصور المميزة (مثل محراب عرض المجوهرات) |
| **الخطوط الذهبية** | Hairline 1px، **خطّان متوازيان** (Double Rule) تحت العناوين الكبرى، **زوايا مقوّسة ذهبية صغيرة** على الإطارات المميزة |
| **الأسطح** | بطاقات بيضاء/عاجية بحدود عنابية شفافة، **ظلال مُلوَّنة بدرجة العنابي** (`rgba(58,10,22,0.12)`) وليست رمادية |
| **النسيج (Texture)** | **حبيبات فيلم خفيفة (Grain 3–4%)** + نقش هندسي إسلامي رفيع جداً (شبكة معينات) بشفافية 4% في خلفيات الأقسام الكبيرة |
| **الأيقونات** | خطية رفيعة (Stroke 1.5px) بزوايا ناعمة، لون العنابي أو الذهبي، **شعار زهرة السوسن (Iris)** مبسّط كخط أحادي |
| **الصور** | مجوهرات مصوّرة Macro على **قطيفة عنابية** أو رخام عاجي، إضاءة جانبية ناعمة، عمق ميدان ضيق، بلا خلفيات بيضاء قاسية |
| **الفواصل بين الأقسام** | ألوان متناوبة عاجي ← عنابي عميق ← عاجي مع **حدود منحنية (Curved SVG Dividers)** أو خط مزدوج ذهبي |

### 1.5 المحظورات (Anti-Patterns) — تُذكر في Master Prompt

بلا إيموجي · بلا أسود صرف `#000` · بلا توهج نيون أو Glow · بلا بنفسجي/أزرق نيون · بلا تدرجات نصية كبيرة · بلا مؤشرات ماوس مخصصة · **بلا عناصر متراكبة تغطي النص** · بلا صف "3 بطاقات متساوية" نمطي · بلا أسماء وهمية (John Doe) · بلا أرقام مستديرة مزيفة (99.99%) · بلا عبارات تسويقية مبتذلة (Elevate / Seamless / Next-Gen) · بلا نصوص حشو مثل "اسحب للأسفل" أو أسهم تمرير نابضة · بلا Hero متمركز في المنتصف.

---

## 2. Master Prompt — الصقه أولاً في كل مشروع (DESIGN.md)

> انسخ الكتلة كاملة. تتبع صيغة `DESIGN.md` الخاصة بـ Stitch: أجواء، ألوان، خطوط، مكوّنات، تخطيط، حركة، محظورات.

```text
# Design System: IRIS (آيريس) — Luxury Accessories Boutique & Management Platform

Language & direction: Arabic first. ALL UI copy in Arabic. Full RTL mirroring (navigation, grids, icons, progress direction, carousels start from the right). Latin digits 0-9 for prices, phones, order numbers. Currency format: "25,000 د.ع" (number then Iraqi Dinar symbol), no decimals.

## 1. Visual Theme & Atmosphere
A jewelry boutique after dark: warm ivory pages punctuated by deep burgundy "velvet" sections, finished with hairline gold details like hand-engraved metalwork. Calm, confident, editorial and expensive-feeling — never flashy. Storefront: Density 4 (airy), Variance 7 (asymmetric, offset layouts), Motion 6 (fluid, spring-based). Admin & staff app: Density 6 (efficient but breathable), Variance 3 (orderly), Motion 4 (restrained).

## 2. Color Palette & Roles
- Wine Night (#1E070D) — deepest surface: footer, dark sections, admin sidebar
- Deep Oxblood (#3A0A16) — announcement bar, secondary dark surfaces
- Burgundy 800 (#5A0F22) — strong burgundy panels, dark hero
- Imperial Burgundy (#721328) — PRIMARY brand color: primary buttons, links, active states
- Burgundy 600 (#8A1B34) — hover / pressed state of primary
- Rose Mist (#EED9DB) — soft borders, tag backgrounds
- Blush Surface (#F7ECEC) — light secondary surface
- Ivory Canvas (#FBF6EF) — main page background
- Parchment (#F3EADB) — alternate warm section background
- Warm Ink (#2A1215) — primary text (never pure black)
- Muted Rosewood (#6D585B) — secondary text
- Royal Gold (#C9A24B) — the SINGLE accent: hairlines, icons, premium buttons, ornaments. NEVER use for body text on light backgrounds.
- Champagne Gold (#E9D49C) — gold text/icons on burgundy or dark surfaces
- Antique Gold (#8A6620) — gold TEXT on light surfaces
- Gold Foil Gradient (135deg: #8F6B1F, #E6C871, #C9A24B, #F3E2A9, #A67C2E) — metallic sheen on key buttons and large rules only
- Hairline Gold rgba(201,162,75,0.45) and Hairline Burgundy rgba(114,19,40,0.14) — 1px borders
Semantic colors (admin only): success #1F6B4A on #E2F2EA, warning #8A4B08 on #FCEBD0, error #B42318 on #FDE7E4, info #2F5A8A on #E4EDF8, neutral #4D3C3F on #EFE7E4. Every status = color + icon + text.

## 3. Typography Rules
- Display (storefront headlines): El Messiri (fallback Noto Naskh Arabic) — weight 600-700, line-height 1.35, controlled scale, hierarchy through weight and color not just size.
- Body / UI: IBM Plex Sans Arabic (fallback Tajawal, Cairo) — line-height 1.7, max 60 characters per line, Muted Rosewood for secondary text.
- Brand wordmark "IRIS" only: Instrument Serif.
- Admin & dashboards: sans-serif only (IBM Plex Sans Arabic + IBM Plex Mono for SKUs, order numbers and dense numbers), tabular numerals.
- Arabic rules: NEVER apply letter-spacing to Arabic text, no italics, no uppercase transforms.
- Banned: Inter, Times New Roman, Georgia, generic system fonts.

## 4. Component Stylings
- Buttons: radius 12px. Primary = Imperial Burgundy fill, ivory text, 1px inner Hairline Gold, on hover shifts to Burgundy 600 with a one-time diagonal gold light sweep; Premium = Gold Foil Gradient fill with Wine Night text; Secondary = transparent with 1px burgundy border; Ghost = text only. Tactile 1px downward translate on press. No outer glow.
- Cards: radius 20px, white or ivory fill, 1px Hairline Burgundy border, soft burgundy-tinted shadow (rgba(58,10,22,0.12)), used only where elevation communicates hierarchy. Dense areas use top-border dividers instead of cards.
- Feature image frames: arch-topped (rounded top), with tiny gold corner ornaments.
- Inputs: label ABOVE the field, helper text optional, error text below in error red with icon. 12px radius, 1px #9A8488 border, focus ring 2px Imperial Burgundy with 3px Rose Mist halo. No floating labels.
- Badges/Chips: pill shape, soft tinted background + icon + text; gold "Premium/New" badges use Antique Gold on a champagne tint.
- Tabs: underline style with a 2px gold indicator that slides between tabs.
- Tables (admin): sticky header on Blush Surface, 1px row dividers, tabular numerals, row hover tint in Rose Mist at 40%.
- Dividers: Double gold hairline rule (two parallel 1px lines, 3px apart) under major headings; ornamental centered diamond separator between sections.
- Loaders: skeleton shimmer in burgundy-tinted neutrals matching exact layout; no circular spinners.
- Empty states: composed illustration (line-art iris flower + jewelry box) + one sentence + one action.
- Toasts: dark Oxblood surface with champagne text and a gold left-edge indicator (right edge in RTL).

## 5. Layout Principles
- 12-column grid, content max-width 1280px (storefront) / 1440px (admin). CSS Grid, no percentage hacks.
- Storefront Hero is asymmetric (text zone + tall arched image zone), never centered. No overlapping: text never sits on top of other text or imagery; every element has its own clean zone.
- Avoid the generic "three equal cards in a row". Use zig-zag editorial splits, staggered-height tiles, horizontal scroll rails with a peek of the next item, or numbered lists.
- Section rhythm alternates Ivory Canvas, Parchment and deep burgundy sections separated by curved dividers or double gold rules. Generous vertical spacing (96-128px desktop, 56-72px mobile).
- Mobile (<768px): everything collapses to one column; thumb-friendly 44px targets; sticky bottom action bars; bottom sheets for filters and pickers; safe-area padding.
- Full-height sections use min-height 100dvh, never fixed 100vh.

## 6. Motion & Interaction
- Spring physics (stiffness 100, damping 20) for interactive elements; durations 200-450ms; easing cubic-bezier(0.22, 1, 0.36, 1). No linear easing.
- Staggered reveals: sections fade-up 24px with 80ms cascade; never mount lists instantly.
- Perpetual micro-interactions: a very subtle gold shimmer passes over premium badges every ~6s; floating iris ornament drifts slowly.
- Header morphs on scroll (transparent to solid burgundy blur, shrinking height, gold hairline appears).
- Animate only transform and opacity. Respect prefers-reduced-motion.

## 7. Imagery & Signature Details
- Photography: macro jewelry on burgundy velvet or ivory marble, soft side lighting, shallow depth of field; warm color grade; no stark white backgrounds.
- Signature motifs: line-art iris flower monogram, double gold rules, arch frames, faint 4% geometric lattice, 3% film grain, gold diamond bullets.
- Use realistic data: Iraqi governorates (بغداد، البصرة، أربيل…), order numbers like #1054, prices like 18,000 د.ع, SKUs like NK-102. No placeholder names like "John Doe".

## 8. Anti-Patterns (NEVER DO)
No emojis. No Inter. No pure black (#000). No neon or outer-glow shadows. No purple or neon-blue accents. No gradient text on large headlines. No custom mouse cursors. No overlapping text/imagery. No centered hero. No equal 3-card rows. No filler UI text such as "scroll to explore" or bouncing scroll arrows. No fake round numbers (99.99%). No generic marketing clichés (Elevate, Seamless, Unleash, Next-Gen). No more than one gold accent family. No Latin-only copy.
```

### كتلة الستايل المختصرة (تُلصق مع أي برومبت إذا أردت تثبيتاً إضافياً)

```text
Style: luxury Arabic RTL — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines and ornaments, El Messiri display headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain texture, soft burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.
```

---

## 3. مكتبة الحركات وتأثيرات التمرير (Motion & Scroll FX Library)

> **كيف تستفيد منها؟**
> 1. **مع Stitch:** بعض التأثيرات تُرى كـ **حالات ثابتة** (الهيدر قبل/بعد التمرير، حالة Hover، الشريط اللاصق). لهذه الحالات برومبتات جاهزة داخل أقسام الشاشات.
> 2. **عند البرمجة لاحقاً:** ألصق وصف `FX-xx` المطلوب مع أداة البرمجة (React + **Framer Motion** / **GSAP ScrollTrigger** / CSS Scroll-driven Animations) وهي تنفّذه حرفياً.
> 3. كل شاشة في الأقسام 4–7 تذكر الرموز المناسبة لها.

### 3.0 ثوابت الحركة (Motion Tokens)

| المتغير | القيمة | الاستخدام |
|---|---|---|
| **Easing الأساسي** | `cubic-bezier(0.22, 1, 0.36, 1)` | كل الدخول والخروج (انسيابي ثقيل الإحساس) |
| **Spring** | `stiffness 100 · damping 20` (Framer Motion) | الأدراج، الأوراق السفلية، الأزرار، الإضافة للسلة |
| **المدد** | micro `150ms` · standard `300ms` · emphasis `600ms` · hero `1200ms` | حسب أهمية العنصر |
| **مسافة الدخول** | `translateY(24px)` + `opacity 0→1` | كشف الأقسام |
| **Stagger** | `80ms` بين العناصر (حتى 8 عناصر ثم تُجمَّع) | القوائم والبطاقات |
| **نقطة التفعيل** | عند دخول العنصر `15%` من الشاشة، **مرة واحدة** | Reveal |
| **الأداء** | تحريك `transform` و`opacity` **فقط** (ممنوع تحريك width/height/top/left) · `will-change` عند الحاجة · حبيبات/Grain على طبقة ثابتة منفصلة | سلاسة 60fps على الهواتف |
| **الوصولية** | `prefers-reduced-motion` ← FX-22 | إلزامي |
| **اتجاه RTL** | كل الحركات الأفقية **معكوسة**: الشرائح تبدأ من اليمين، الأدراج تدخل من اليسار للسلة، شريط التقدم يمتلئ من اليمين | |
| **تقسيم النص العربي** | قسّم **بالأسطر أو الكلمات فقط — لا بالحروف أبداً** (تقسيم الحروف يكسر اتصالها) | FX-18 |

---

### FX-01 · تحويل الهيدر عند التمرير (Header Morph)

```text
Header behavior on scroll: at the top of the page the header is fully transparent over the hero (88px tall, ivory nav text, full-size wordmark). After 80px of scroll it morphs over 350ms into a solid deep-oxblood bar (rgba(58,10,22,0.88)) with a 14px backdrop blur, height shrinks to 64px, the wordmark scales to 86%, nav text switches to champagne gold, and a 1px hairline gold border fades in along the bottom edge. The active nav item shows a short gold underline that slides between items with a spring. When scrolling down fast past 400px the header slides up out of view; scrolling up brings it back instantly.
```
**التنفيذ:** عنصر حارس `IntersectionObserver` + فئة CSS · انتقالات `transform/opacity` (الارتفاع عبر Padding داخل غلاف).

### FX-02 · شريط تقدم التمرير الذهبي (Scroll Progress)

```text
A 2px royal-gold gradient progress line is fixed at the very top of the viewport and fills from the right edge toward the left (RTL) as the user scrolls the page. It is subtle: 70% opacity, no glow.
```
**التنفيذ:** `animation-timeline: scroll()` أو GSAP `scrub` على `scaleX` مع `transform-origin: right`.

### FX-03 · عمق الـ Hero (Parallax & Slow Zoom)

```text
Hero depth: the arch-framed jewelry photo sits on a slower layer than the text — as the user scrolls it moves up at 0.4x speed while the text block moves at 0.8x, and the photo inside the arch scales gently from 1.08 to 1.0 (a slow Ken-Burns settle over 1.6s on load). A faint line-art iris ornament drifts 6px up and down on an 8-second loop. The background lattice pattern moves at 0.2x for subtle depth. Nothing overlaps the text.
```

### FX-04 · كشف الأقسام المتتابع (Section Reveal Cascade)

```text
Every section reveals as it enters the viewport: the section heading first (masked line reveal), then the double gold rule drawing outward, then the content items fading up 24px with an 80ms stagger using a soft spring. Each element animates only once. Product grids reveal row by row from the right side first (RTL).
```

### FX-05 · رسم الخط الذهبي المزدوج (Gold Rule Draw)

```text
Ornamental divider: two parallel 1px royal-gold lines (3px apart) draw outward from the center to both sides over 900ms when the divider enters the viewport (stroke-dashoffset), while a small gold diamond in the center scales from 0 to 1 and rotates 45 degrees with a spring. Used under major section headings and between sections.
```

### FX-06 · شريط المنتجات الأفقي (Snap Rail)

```text
Horizontal product rail: scroll-snap with the first card starting at the right edge (RTL) and about 12% of the next card peeking at the left edge to invite swiping. On desktop the rail can be dragged with inertia and has two round arrow buttons (1px gold hairline border, ivory fill) that fade out at the ends. A thin gold progress hairline under the rail fills in sync with the scroll position. The snapped card scales from 0.97 to 1.0.
```

### FX-07 · قسم القصة المثبّت (Pinned Storytelling)

```text
Pinned story section (used for "How to order" and brand story): the left half holds a tall arched image that stays pinned for the height of the section while the right half scrolls through 4 numbered steps. As each step crosses the viewport center, the pinned image crossfades to the matching photo (500ms) and a vertical gold progress line beside the steps fills up. A small gold monospace counter shows "01 / 04". The pin releases after the last step.
```

### FX-08 · تفاعل بطاقة المنتج (Product Card Hover — Desktop)

```text
Product card hover: the second product photo crossfades over the first in 400ms with a slight 1.04 scale; a hairline gold frame fades in around the image; a burgundy "أضف إلى السلة" bar slides up from the bottom edge of the image (translateY 100% to 0, spring); the heart icon fades in at the top corner; the whole card lifts 4px with a burgundy-tinted shadow. On touch devices there is no hover — a small round "+" quick-add button is always visible instead.
```

### FX-09 · كشف الصور بالستارة (Curtain Image Reveal)

```text
Image curtain reveal: when an editorial image enters the viewport, a deep-burgundy panel covering it slides away toward the left (clip-path inset animating from 0 to 100%) over 900ms while the image inside scales from 1.15 down to 1.0. Used for the gift-set editorial blocks and the story section.
```

### FX-10 · شريط الثقة المتحرك (Trust Marquee)

```text
Trust marquee strip on Deep Oxblood: a slow continuous ticker (about 40 seconds per loop, the only place linear easing is allowed) moving left-to-right as Arabic tickers do, repeating phrases in champagne gold separated by tiny gold diamonds: "توصيل لجميع المحافظات", "الدفع عند الاستلام", "تغليف هدايا أنيق", "استبدال خلال 7 أيام", "خدمة عملاء عبر واتساب". Pauses on hover. Hairline gold borders above and below.
```

### FX-11 · عدّ الأرقام ورسم المخططات (Count-up — لوحة الإدارة)

```text
Dashboard KPI entrance: each KPI number counts up from 0 to its real value over 800ms with ease-out (tabular numerals so digits don't jitter), the sparkline draws itself from right to left, and the delta chip pops in with a small spring. Charts animate their bars/lines growing from the baseline on first load only. Numbers are only animated when they come from real data.
```

### FX-12 · شريط الشراء اللاصق (Sticky Buy Bar)

```text
Sticky buy bar: once the main "أضف إلى السلة" button scrolls out of view, a compact bar springs up from the bottom (mobile) or drops down as a slim bar under the header (desktop) showing a tiny thumbnail, product name, price, quantity stepper and the add button. It hides again when the footer comes into view. A WhatsApp shortcut icon sits beside it.
```

### FX-13 · أزرار ملموسة ولمعان ذهبي (Tactile Buttons + Gold Sheen)

```text
Buttons feel tactile: on press they move 1px down and scale to 0.99; on hover a narrow diagonal band of gold light sweeps once across the button in 700ms (never looping); focus shows a 2px burgundy ring with a 3px rose halo. The premium gold-foil button has a very slight brightness lift on hover. No outer glow, no neon.
```

### FX-14 · لمعان معدني خافت دائم (Gold Shimmer Micro-loop)

```text
Perpetual micro-interaction: on "جديد" and "عرض" badges and the featured price tag, a narrow highlight band passes across the gold surface every 6 seconds (1.2s duration, 50% opacity). It is barely noticeable — it makes the metal feel alive without distracting.
```

### FX-15 · الإضافة للسلة والدرج (Fly-to-Cart + Cart Drawer)

```text
Add-to-cart choreography: the product thumbnail shrinks and flies along a gentle curved path to the bag icon in 600ms, the bag icon does a small spring pulse and its gold count dot increments with a flip; then the cart drawer slides in from the left edge (RTL) with a spring, and its line items cascade in with an 80ms stagger. The drawer has a scrim in rgba(30,7,13,0.55).
```

### FX-16 · هياكل التحميل (Skeleton Shimmer)

```text
Loading skeletons mirror the exact layout of the content (product cards, table rows, chat bubbles) in burgundy-tinted neutrals (#F1E6E4 base, #F8F0EE shimmer) with a soft shimmer sweeping from right to left. No circular spinners anywhere.
```

### FX-17 · تغيّر لون الخلفية مع التمرير (Section Theme Shift)

```text
Scroll-linked theme shift: as the viewport enters a deep-burgundy section, the page background and the header adapt (ivory to wine over 600ms, header text from ink to ivory); sections are separated by curved SVG dividers or a double gold rule rather than hard straight edges.
```

### FX-18 · كشف العناوين بالقناع (Masked Headline Reveal)

```text
Headline reveal: each LINE of a large Arabic headline slides up from behind an invisible mask (translateY 110% to 0, 700ms, 90ms stagger between lines), then the double gold rule draws beneath it. Split by lines or words only — never by individual letters (it would break Arabic letter joining).
```

### FX-19 · تكبير صورة المنتج (Product Zoom)

```text
Product image zoom: on desktop, hovering the main photo shows a 2x zoom pane beside it (soft hairline-burgundy frame) following the pointer — no custom cursor. On mobile, double-tap or pinch zooms with a spring; the gallery swipes horizontally with snap and tiny gold pagination dots. Tapping opens a full-screen viewer with swipe-down to dismiss.
```

### FX-20 · سلوك التطبيق على الهاتف (Mobile Chrome)

```text
Mobile app behaviors: the bottom tab bar slides down out of view when scrolling down and returns on scroll up; large screen titles collapse into a compact title bar with a hairline gold line; pull-to-refresh uses a small rotating gold iris ornament; bottom sheets have a drag handle and spring physics; light haptic feedback on add-to-cart, confirm and toggle actions; list rows reveal secondary actions by swipe only for non-destructive actions.
```

### FX-21 · انتقالات الصفحات (Page Transitions)

```text
Page transitions: 250ms crossfade with the incoming content sliding 16px from the start side (right in RTL). Tapping a product card morphs its image into the product gallery (shared-element transition, 450ms). Back navigation reverses the motion.
```

### FX-22 · تقليل الحركة (Reduced Motion)

```text
When the user prefers reduced motion: disable parallax, marquee, shimmer and fly-to-cart; replace slide/scale reveals with simple 150ms opacity fades; keep functional state changes instant; never autoplay carousels.
```

### FX-23 · نص يتلوّن مع التمرير (Scroll-linked Text Highlight)

```text
Brand statement block: a large Arabic pull-quote in El Messiri where each word starts in Muted Rosewood at 35% opacity and turns to Warm Ink at 100% as the user scrolls it into the center of the viewport, word by word, with a small gold diamond bullet appearing at the end.
```

### FX-24 · حركات لوحة الإدارة الدقيقة (Admin Micro-interactions)

```text
Admin micro-interactions (restrained): table rows get a Rose Mist 40% hover tint; the sticky table header gains a soft shadow once the table scrolls; tabs have a 2px gold indicator that slides between tabs; the sidebar's active item has a gold marker bar that slides vertically with a spring; KPI cards lift 2px on hover; toasts spring in from the bottom-left corner; the notification bell gives one small swing when a new notification arrives; dialogs scale from 0.97 to 1 with a 200ms fade.
```

---

### 3.1 خريطة التمرير للصفحة الرئيسية (Home Scroll Storyboard)

> هذا هو "سيناريو النزول للأسفل" الكامل لصفحة المتجر الرئيسية. استخدمه لتوجيه التنفيذ لاحقاً، أو الصق الجزء المناسب في Stitch عند توليد كل جزء من الصفحة.

| موضع التمرير | القسم | ما يحدث |
|---|---|---|
| **0%** (التحميل) | الهيدر + Hero | الهيدر شفاف · FX-18 عنوان الـ Hero يظهر سطراً سطراً · FX-03 الصورة تستقر (Slow Zoom) · FX-09 ستارة عنابية تنزاح عن إطار الصورة · الزخرفة الذهبية تطفو (FX-14 على شارة المجموعة) |
| **0 → 80px** | الهيدر | FX-01 يتحول إلى عنابي مصمت مع Blur وخط ذهبي · FX-02 يبدأ شريط التقدم |
| **10%** | شريط الثقة | FX-10 شريط الثقة يتحرك ببطء |
| **15%** | التصنيفات | FX-04 عنوان بقناع + FX-05 خط ذهبي يُرسم · بلاطات التصنيف المقوّسة تظهر بارتفاعات متدرجة بـ Stagger |
| **30%** | وصل حديثاً | FX-06 الشريط الأفقي بنقطة Snap · FX-08 تفاعل البطاقات (Hover) · FX-14 شارة "جديد" |
| **45%** | الأكثر طلباً | قائمة مرقّمة 01–05 تظهر بتتابع · الأرقام الكبيرة الذهبية تتحرك بـ Parallax أخف من النص |
| **55%** | العروض | FX-17 الخلفية تتحول إلى عنابي عميق بحدود منحنية · عدّاد تنازلي (أرقام تقلب) · شارات الخصم FX-14 |
| **65%** | مجموعات الهدايا | قطع تحريرية Zig-Zag · FX-09 كشف الصور بالستارة |
| **72%** | المنتجات المحدودة | قسم داكن · "متبقي 3 قطع" بنبضة خفيفة واحدة عند الظهور |
| **80%** | كيف تطلب | FX-07 قسم مثبّت: 4 خطوات + صورة تتبدل + خط تقدم ذهبي عمودي |
| **88%** | بيان العلامة + أسئلة شائعة | FX-23 نص يتلوّن كلمة كلمة · الأسئلة (Accordion) تنفتح بـ Spring |
| **95%** | التواصل + التذييل | أزرار WhatsApp/Instagram/Chat تظهر بـ Stagger · التذييل يرتفع بحركة خفيفة (Reveal) |
| **دائماً** | عناصر عالمية | FX-12 شريط الشراء (في صفحة المنتج) · زر التواصل العائم يدخل بعد 3 ثوانٍ بـ Spring |

---

## 4. برومبتات موقع المتجر — Desktop (Stitch ← **Web**)

**الجمهور:** العميل (يصل غالباً من Instagram أو الهاتف، لذلك كل شاشة تُصمَّم أيضاً بنسخة متجاوبة — انظر برومبت التحسين R-06) · **المقاس:** 1440px · **المرجع:** §2.1، §5، §12، §68

> **ترتيب التوليد المقترح:** W-01a ← W-01b ← W-01c ← W-01d ← W-04 ← W-02 ← W-05 ← W-06 ← W-07 ← W-08 ← باقي الشاشات.

---

### W-01a · الصفحة الرئيسية — الجزء 1: الهيدر + Hero + التصنيفات + وصل حديثاً

**الحركات:** FX-01 · FX-02 · FX-03 · FX-04 · FX-05 · FX-06 · FX-08 · FX-09 · FX-14 · FX-18

```text
Design the TOP part of a desktop (1440px) luxury e-commerce homepage for "IRIS | آيريس", an Arabic-language boutique selling necklaces, rings, bracelets, earrings and gift sets. Full RTL layout, all UI text in Arabic.

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Build, from top to bottom:
1. Announcement bar: slim Deep Oxblood strip with centered small champagne-gold text "توصيل لجميع المحافظات  ·  الدفع عند الاستلام  ·  استبدال خلال 7 أيام", items separated by tiny gold diamonds, 1px gold hairline at the bottom.
2. Header (transparent over the hero in this frame, 88px tall): on the right the IRIS wordmark in Instrument Serif with "آيريس" in small El Messiri beneath it; centered navigation: الرئيسية، القلائد، الخواتم، الأساور، الأقراط، الهدايا، العروض — the active item has a short gold underline; on the left a search icon, an account icon and a shopping-bag icon with a tiny gold count dot. Thin line icons, stroke 1.5px.
3. Hero — asymmetric two-zone layout, NOT centered, no overlap. Right zone (55%): small gold eyebrow "مجموعة الخريف", large two-line headline in El Messiri "قطعٌ تحكي حكايتكِ", a short paragraph (max 55 characters per line) "قلائد وخواتم وأساور منتقاة بعناية، مغلّفة بأناقة وتصل إلى باب بيتك.", then ONE primary button "تصفّح المجموعة" (imperial burgundy fill, ivory text, 1px inner gold hairline, arrow icon pointing left). Below, a discreet row of three tiny trust items with gold line icons: "تغليف هدايا"، "دفع عند الاستلام"، "توصيل سريع". Left zone (45%): one tall arch-topped photo frame with tiny gold corner ornaments, showing a macro photograph of a gold pendant necklace resting on deep burgundy velvet with soft side lighting; directly below the frame (not overlapping) a small caption chip "قلادة رقم 102  ·  18,000 د.ع". Background: warm ivory with a very faint 4% geometric lattice, 3% film grain and one large soft burgundy radial tint at the far left edge.
4. Categories: heading "تسوّق حسب الفئة" with a double gold hairline rule beneath it. A row of 5 tall arch-shaped image tiles with staggered heights (not equal), each with the category name below and a small count: القلائد (42 قطعة)، الخواتم (28 قطعة)، الأساور (31 قطعة)، الأقراط (24 قطعة)، مجموعات الهدايا (12 مجموعة).
5. New arrivals: heading "وصل حديثاً" on the right with a text link "عرض الكل" and a left arrow on the left; a horizontal product rail showing 4 full cards and a peek of the 5th. Product card: 4:5 photo with 16px radius, tiny gold "جديد" badge, name, price like "18,000 د.ع", heart icon; one card shown in hover state with a burgundy "أضف إلى السلة" bar sliding over the bottom of the photo. Products: "قلادة ذهبية رقم 102"، "خاتم فضي رقم 31"، "سوار ناعم رقم 08"، "أقراط لؤلؤ رقم 17"، "قلادة قلب رقم 55".
```

---

### W-01b · الصفحة الرئيسية — الجزء 2: الأكثر طلباً + العروض + الهدايا + المحدودة

**الحركات:** FX-04 · FX-05 · FX-09 · FX-14 · FX-17 · FX-18

```text
Continue the same IRIS (آيريس) Arabic RTL desktop homepage (1440px) — design the MIDDLE part, with the same design system.

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Sections, top to bottom:
1. Best sellers ("الأكثر طلباً") on Parchment #F3EADB: an editorial numbered list, NOT a card grid. Left side: five rows numbered with large thin gold numerals 01–05 (El Messiri), each row has a small square photo, product name, short material line ("ذهب عيار 18 مطلي"), price, and a quiet "عرض" link; hairline dividers between rows. Right side (sticky): one tall arch-framed photo of the #1 bestseller with a small caption.
2. Offers ("العروض") on a deep burgundy (#5A0F22) full-width section with a curved top edge: heading in ivory with a champagne-gold double rule; a countdown "ينتهي العرض خلال" with four flip-style digit blocks (days, hours, minutes, seconds) in gold; a horizontal rail of 4 product cards on dark glass-less surfaces (burgundy 800 with gold hairline), each with a gold discount badge "-20%", old price struck through in muted rose and new price in champagne gold.
3. Gift sets ("مجموعات الهدايا") on Ivory: two editorial zig-zag rows (image/text, then text/image), NOT three equal cards. Each row: a large arch-topped photo of a jewelry gift box with ribbon on burgundy tissue, a small gold eyebrow "هدية مغلّفة", a headline ("طقم الخطوبة"، "هدية الأمهات"), two lines of text, price "من 45,000 د.ع" and a text link "اكتشف المجموعة". Add small gold corner ornaments to the photo frames.
4. Limited pieces ("قطع محدودة") on Wine Night #1E070D: a calm 2-column layout — text on the right: heading in ivory, line "كميات محدودة من كل تصميم"; on the left a row of three tall product tiles each with a small gold pill "متبقي 3 قطع" / "متبقي قطعتان" / "آخر قطعة". Subtle gold hairline frame around each tile.
Keep generous vertical spacing (112px between sections) and a centered gold diamond ornament between ivory sections.
```

---

### W-01c · الصفحة الرئيسية — الجزء 3: الثقة + كيف تطلب + الأسئلة + التواصل + التذييل

**الحركات:** FX-07 · FX-10 · FX-12(زر التواصل العائم) · FX-17 · FX-23

```text
Continue the same IRIS (آيريس) Arabic RTL desktop homepage (1440px) — design the BOTTOM part, same design system.

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Sections, top to bottom:
1. Brand statement on Ivory: a very large pull-quote in El Messiri, 3 lines, "كل قطعة نختارها لها حكاية، وكل هدية نغلّفها تصل بعناية." — words in two tones (ink and muted rosewood) to suggest a scroll-linked highlight; a gold diamond at the end. Nothing else around it, lots of whitespace.
2. Trust strip on Deep Oxblood: a single-line ticker of champagne-gold phrases separated by gold diamonds: "توصيل لجميع المحافظات"، "الدفع عند الاستلام"، "تغليف هدايا أنيق"، "استبدال خلال 7 أيام"، "خدمة عملاء عبر واتساب"; hairline gold borders above and below.
3. How to order ("كيف تطلب") — pinned storytelling layout: right column with 4 numbered steps connected by a vertical gold progress line (steps: "اختر قطعتك"، "اطلب عبر الموقع أو واتساب أو إنستغرام"، "نؤكد طلبك معك"، "يصلك الطلب إلى باب بيتك"), each with a small gold line icon and one sentence; left column a tall arch-framed photo of a hand opening a burgundy jewelry box; small gold counter "01 / 04".
4. FAQ ("أسئلة شائعة") on Blush Surface: two columns — right: heading + short text + button "كل الأسئلة"; left: 5 accordion rows (first one open) with plus/minus icons in gold and hairline dividers. Questions: "كم تستغرق مدة التوصيل؟"، "هل يمكنني الدفع عند الاستلام؟"، "كيف أستبدل قطعة؟"، "هل المنتجات أصلية؟"، "كيف أتتبع طلبي؟".
5. Contact call-to-action on burgundy 800: heading "هل تحتاجين مساعدة في الاختيار؟" and three compact pill buttons with line icons: "واتساب", "إنستغرام", "محادثة مباشرة" (the first in gold foil, the others outlined in gold hairline).
6. Footer on Wine Night: wide right block with IRIS wordmark + 2 lines about the boutique + social icons (Instagram, WhatsApp, Facebook) in champagne gold; then link columns "المتجر" (القلائد، الخواتم، الأساور، الأقراط، الهدايا)، "المساعدة" (تتبع طلبك، الأسئلة الشائعة، الشحن والتوصيل، الاستبدال والاسترجاع)، "تواصل معنا" (phone, working hours "10:00 ص – 10:00 م", address); bottom row with "© 2026 آيريس" and small payment note "الدفع عند الاستلام". Add a floating round contact button at the bottom-left with gold hairline border.
```

---

### W-01d · حالات الصفحة الرئيسية (Frames): الهيدر بعد التمرير + Hover + السلة الجانبية

**الحركات:** FX-01 · FX-08 · FX-13 · FX-15

```text
For the IRIS (آيريس) Arabic RTL desktop store, create three state frames of the same page, keeping the same design system.

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame A — "Scrolled header": the page scrolled 300px down showing the "وصل حديثاً" product rail; the header is now a compact 64px solid deep-oxblood bar at 88% opacity with backdrop blur, champagne-gold nav text, a 1px gold hairline at its bottom edge, a smaller wordmark, and a 2px gold scroll-progress line at the very top filled to 30% from the right.
Frame B — "Product card hover": a close-up of two product cards; the hovered one shows the second photo, a hairline gold frame, a burgundy "أضف إلى السلة" bar over the bottom of the photo, a visible heart icon, a 4px lift with burgundy-tinted shadow, and the price "18,000 د.ع" with old price "25,000 د.ع" struck through.
Frame C — "Mini cart drawer": the page dimmed with a Wine Night scrim at 55%, and a 420px cart drawer sliding from the LEFT edge (RTL) on ivory: title "سلة التسوق (2)", two line items (photo, name, variant "ذهبي / 45 سم", quantity stepper, price, remove icon), a coupon field "كود الخصم", subtotal "43,000 د.ع", note "رسوم التوصيل تُحسب عند إتمام الطلب", a full-width burgundy button "إتمام الطلب" and a text link "متابعة التسوق".
```

---

### W-02 · قائمة المنتجات / التصنيف

**المرجع:** §6، §36 · **الحركات:** FX-04 · FX-08 · FX-16

```text
Design a desktop (1440px) product listing page for the category "القلائد" of the Arabic RTL luxury jewelry store IRIS (آيريس).

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Layout: the same solid-oxblood compact header as the scrolled state. Below it, a slim page header on Parchment: breadcrumb "الرئيسية › القلائد", a large El Messiri title "القلائد", a short line "42 منتجاً" and a double gold rule.
Main area (RTL): the FILTER SIDEBAR is on the RIGHT (280px) and the product grid on the left. Sidebar sections separated by hairlines: التصنيف (radio list with counts), السعر (dual-handle range slider with the minimum on the right, two small input fields "من" and "إلى"), اللون (round color swatches with names: ذهبي، فضي، وردي، أسود), المادة (checkboxes: ذهب مطلي، فضة، ستانلس ستيل)، المقاس (pill chips 40، 45، 50 سم), switches "المتوفر فقط" and "عليه خصم", and a text button "مسح الفلاتر".
Grid area: top bar with active filter chips (pill, gold hairline, small x) such as "ذهبي ×" and "أقل من 20,000 ×", a result count, and a sort dropdown "الترتيب: الأحدث" (options: الأحدث، الأكثر مبيعاً، السعر من الأقل، السعر من الأعلى). Product grid of 4 columns × 3 rows; after the 6th product insert one wide editorial banner tile spanning 2 columns on burgundy with arch photo and text "مجموعة الهدايا — تغليف مجاني". Product cards show different states: one with gold "جديد" badge, one with "-28%" discount and struck price, one with "آخر قطعتين" amber-gold tag, one dimmed "نفد المخزون" without a buy button, and a small row of 3 color swatches on some. At the bottom: a gold hairline progress bar "عرض 12 من 42" and a "عرض المزيد" button (secondary, burgundy outline).
```

---

### W-03 · طبقة البحث (Search Overlay)

**المرجع:** §77 · **الحركات:** FX-04 · FX-21

```text
Design a desktop (1440px) full-width search overlay that drops down from the header of the Arabic RTL luxury jewelry store IRIS (آيريس), over a dimmed page (Wine Night scrim 60%).

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Ivory panel, 1200px content width. A large search field with a search icon on the right and a close icon on the left, text typed "102", placeholder style hint "ابحث بالاسم أو رقم القطعة". Under it two columns: right column "المنتجات" with 4 result rows (small photo, name with the matched "102" highlighted in burgundy, SKU "NK-102" in monospace, price); left column "التصنيفات" with chips (القلائد، الخواتم) and "عمليات البحث الأخيرة" with small clock icons and "الأكثر بحثاً" list. Footer row of the panel: link "عرض كل النتائج (6)". Include a tiny hint "الرقم الظاهر على القطعة يساعدك في الوصول إليها بسرعة".
```

---

### W-04 · تفاصيل المنتج (Product Detail)

**المرجع:** §6، §10، §69 · **الحركات:** FX-12 · FX-13 · FX-15 · FX-19

```text
Design a desktop (1440px) product detail page for "قلادة ذهبية رقم 102" on the Arabic RTL luxury jewelry store IRIS (آيريس).

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Layout (RTL): the GALLERY is on the RIGHT and product info on the LEFT, each in its own clean column.
Gallery: one large arch-topped main photo (gold pendant necklace on burgundy velvet) with a zoom hint icon, and a vertical column of 4 thumbnails beside it (the active thumbnail has a gold hairline frame); tiny gold pagination.
Info column: breadcrumb "الرئيسية › القلائد › قلادة ذهبية رقم 102"; gold "جديد" badge; title in El Messiri; line "رقم المنتج 102  ·  SKU: NK-102" with a small copy icon; price "18,000 د.ع" large, old price "25,000 د.ع" struck, small badge "-28%"; short description (2 lines); option "اللون" with two round swatches (ذهبي selected with gold ring، فضي); option "المقاس" with pill chips 40 سم، 45 سم، 50 سم (the last one struck-through with label "نفد"); quantity stepper with the line "متبقي 3 قطع" in warm amber; primary full-width button "أضف إلى السلة"; below it two outline buttons side by side "اطلب عبر واتساب" and "اسأل عبر إنستغرام"; a delivery estimator card: select "اختر المحافظة" with "بغداد" chosen and the result "رسوم التوصيل 5,000 د.ع  ·  خلال 1–3 أيام"; a row of three small trust items (تغليف هدايا، دفع عند الاستلام، استبدال خلال 7 أيام).
Below: four accordions (الوصف، المادة والمقاس، العناية بالقطعة، الشحن والاسترجاع) with the first open; then a horizontal rail "قد يعجبك أيضاً" with 4 product cards; then "شاهدتَ مؤخراً" smaller row. Everything separated by double gold rules.
Also show, as a second frame, the STICKY BUY BAR state: a slim ivory bar under the header with tiny thumbnail, name, price, quantity stepper, a burgundy "أضف إلى السلة" button and a WhatsApp icon button.
```

---

### W-05 · السلة

**المرجع:** §12، §39 · **الحركات:** FX-04 · FX-15

```text
Design a desktop (1440px) shopping cart page for the Arabic RTL luxury jewelry store IRIS (آيريس).

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Page header: title "سلة التسوق" with count "(3 منتجات)" and a double gold rule. RTL layout: the items list on the RIGHT (about 62%), the order summary card on the LEFT (sticky).
Items: three rows separated by hairlines, each with a 96px photo (16px radius), name "قلادة ذهبية رقم 102", variant line "ذهبي / 45 سم", SKU in muted monospace, unit price, quantity stepper, line total "18,000 د.ع", and a remove icon. Row 2 shows an inline amber notice "تغيّر سعر هذا المنتج إلى 20,000 د.ع". Row 3 is marked "غير متاح حالياً" with dimmed photo and a "إزالة" button, excluded from totals.
Summary card (white, hairline burgundy border, burgundy-tinted shadow): "ملخص الطلب"; rows المجموع الفرعي 43,000 د.ع، خصم (SPRING10) -4,300 د.ع in gold, التوصيل "يُحسب عند إتمام الطلب", a double gold rule, الإجمالي 38,700 د.ع large; a coupon input "كود الخصم" with a "تطبيق" button; a full-width burgundy button "إتمام الطلب"; text link "متابعة التسوق". Under the card small trust icons. Also provide a second frame: the EMPTY cart state — line-art iris and jewelry box illustration, text "سلتك فارغة"، button "تصفّح المنتجات"، and a rail of suggested products.
```

---

### W-06 · إتمام الطلب (Checkout)

**المرجع:** §12، §13، §40 · **الحركات:** FX-13 · FX-21

```text
Design a desktop (1440px) checkout page for the Arabic RTL luxury jewelry store IRIS (آيريس). Simple, calm, distraction-free: minimal header with only the wordmark and a lock icon "دفع آمن".

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Top: a 4-step progress line with gold fill running right to left: "معلومات الاتصال ← التوصيل ← الدفع ← المراجعة" (step 2 active).
Layout (RTL): form column on the RIGHT, sticky order summary on the LEFT.
Form, in numbered white cards with hairline borders: 
1) معلومات الاتصال (collapsed, completed with a gold check and edit link): الاسم الكامل، رقم الهاتف +964, checkbox "نفس الرقم على واتساب".
2) التوصيل (open): المحافظة (select, "بغداد"), المدينة/القضاء, الحي/المنطقة, "أقرب نقطة دالة" (full width), "تفاصيل العنوان", "ملاحظات للتوصيل"; a result chip "رسوم التوصيل 5,000 د.ع · خلال 1–3 أيام". Labels above inputs, helper text under, show one field in error state "أدخل رقماً صحيحاً مثل 0770 123 4567" (error red + icon).
3) الدفع: a selectable card "الدفع عند الاستلام" (selected, gold ring) with text "ادفع نقداً عند وصول طلبك"; disabled-looking placeholder row "وسائل دفع إلكترونية — قريباً".
4) المراجعة: checkbox "أوافق على سياسة الشحن والاسترجاع" with links.
Summary card: product mini rows (photo, name, qty ×1, price), المجموع الفرعي، الخصم، التوصيل 5,000 د.ع, a double gold rule, الإجمالي 43,700 د.ع, a highlighted line "المبلغ المستحق عند الاستلام 43,700 د.ع", and the full-width primary button "تأكيد الطلب". Small reassurance text under the button: "سنتواصل معك لتأكيد طلبك".
```

---

### W-07 · تأكيد الطلب

**المرجع:** §12، §29 · **الحركات:** FX-04 · FX-05

```text
Design a desktop (1440px) order-confirmation page for the Arabic RTL luxury jewelry store IRIS (آيريس).

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Asymmetric layout. Right (55%): a small gold line-art seal (circle with check, hand-drawn feel), eyebrow "تم الاستلام", headline in El Messiri "استلمنا طلبك" (use a warm tone: "شكراً لثقتك بنا"), order number "#1054" in large monospace with a copy button, a status pill "بانتظار التأكيد" (amber), text "سنتواصل معك قريباً لتأكيد طلبك"، a 3-step mini timeline (تم الاستلام ← تأكيد ← شحن) with the first step filled in gold. Buttons: primary "تتبع طلبي", secondary "راسلنا على واتساب", text link "متابعة التسوق".
Left (45%): an order summary card with two product rows, delivery address "بغداد — الكرادة — قرب ...", payment method "الدفع عند الاستلام", totals and "المبلغ المستحق عند الاستلام 43,700 د.ع". Below, a calm burgundy panel with arch-framed photo of a gift box and the line "تغليف أنيق في انتظارك".
```

---

### W-08 · تتبع الطلب

**المرجع:** §12، §80 · **الحركات:** FX-05 · FX-11

```text
Design a desktop (1440px) order tracking page for the Arabic RTL luxury jewelry store IRIS (آيريس), shown with results.

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Top band on Parchment: title "تتبع طلبك" and a compact form in one row: "رقم الطلب" (#1054), "رقم الهاتف" (07XX XXX XXXX), burgundy button "تتبّع".
Result: a large card with header "طلب #1054" and a status pill "تم الشحن" (info blue-tinted); a horizontal 5-step stepper filling from right to left with a gold line and gold dots: "تم الاستلام" (done), "تم التأكيد" (done), "قيد التجهيز" (done), "تم الشحن" (current, gold ring pulse), "تم التسليم" (upcoming, hollow) — each with date/time. Under it two columns: right "آخر التحديثات" vertical timeline ("اليوم 3:20 م — تم شحن طلبك", "اليوم 11:30 ص — قيد التجهيز", "أمس 10:05 ص — تم تأكيد طلبك"); left "تفاصيل الطلب": products, "الإجمالي 43,700 د.ع", "المدفوع 0 د.ع", "المتبقي 43,700 د.ع", delivery address. Bottom actions: outline button "طلب إلغاء", button "طلب إرجاع" (disabled until delivery with tooltip text), and "اسأل عن طلبك عبر واتساب".
```

---

### W-09 · تسجيل الدخول + حسابي

**المرجع:** §2.1 (حساب اختياري) · **الحركات:** FX-21

```text
Design two desktop (1440px) frames for the optional customer account of the Arabic RTL luxury jewelry store IRIS (آيريس).

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — Login by phone: split screen. Right: Wine Night panel with a tall arch photo of jewelry on velvet, IRIS wordmark and the line "أهلاً بعودتك". Left: ivory form, title "تسجيل الدخول", phone input with +964 prefix, burgundy button "أرسل رمز التحقق"; then the next state shown below it: six separate OTP digit boxes with the active one outlined in burgundy, countdown "إعادة الإرسال بعد 00:42", button "تأكيد", and a text link "المتابعة كضيف".
Frame 2 — "حسابي": page header with avatar initials and name; horizontal tabs "طلباتي" (active, gold underline)، "عناويني"، "بياناتي"، "الإشعارات". Orders tab: a table-like list of order cards (رقم الطلب #1054، التاريخ، حالة pill، الإجمالي، زر "تفاصيل" and "إعادة الطلب"); statuses shown: بانتظار التأكيد، تم الشحن، مكتمل، ملغي. A calm empty-state variant for addresses with a line-art illustration and button "إضافة عنوان".
```

---

### W-10 · طلب إرجاع / استبدال

**المرجع:** §30 · **الحركات:** FX-05

```text
Design a desktop (1440px) return-request page for the Arabic RTL luxury jewelry store IRIS (آيريس).

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Centered narrow column (720px) on Ivory with a title "طلب إرجاع أو استبدال" and a 4-step gold progress line: المنتجات ← السبب ← المطلوب ← المراجعة (step 2 active).
Step 1 (completed summary): order #1054 with product "خاتم فضي رقم 31 — مقاس 8" and a quantity selector limited to 1 ("الحد الأقصى 1").
Step 2 (open): reason select "السبب" (منتج تالف، غير مطابق، مقاس خاطئ، غيّرت رأيي، أخرى), text area "اشرح لنا أكثر", and a photo uploader with dashed gold hairline border and 2 thumbnails.
Step 3 preview: three selectable cards "استرداد المبلغ", "رصيد في المتجر", "استبدال".
Final note card: "نراجع طلبك ونتواصل معك. لا يُرد المبلغ أو يُعاد الصنف إلا بعد الفحص والاعتماد." Primary button "إرسال الطلب".
```

---

### W-11 · الأسئلة الشائعة · W-12 · تواصل معنا · W-13 · عن المتجر

**المرجع:** §2.1، §23 · **الحركات:** FX-04 · FX-05 · FX-18 · FX-23

```text
Design three desktop (1440px) content pages for the Arabic RTL luxury jewelry store IRIS (آيريس) as three frames.

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — الأسئلة الشائعة: title band on burgundy 800 with a search field "ابحث في الأسئلة"; right sticky list of categories (الطلب، الدفع، التوصيل، الاستبدال والاسترجاع، المنتجات) and left an accordion with hairline dividers, one open answer, and a closing card "لم تجد إجابتك؟" with a WhatsApp button.
Frame 2 — تواصل معنا: split layout. Right: three contact tiles in different heights (واتساب، إنستغرام، الهاتف) with line icons, plus "ساعات العمل: 10:00 ص – 10:00 م" and address. Left: a message form (الاسم، الهاتف، الموضوع، الرسالة) with burgundy button "إرسال", and a small map placeholder in burgundy tones.
Frame 3 — عن المتجر: asymmetric editorial layout: huge El Messiri headline "نختار بعناية… ونغلّف بحب" with a double gold rule, two staggered arch-framed photos (jewelry workshop detail and gift wrapping) each in its own zone, a three-item "ما يميزنا" list as an editorial numbered list (01 جودة مختارة، 02 تغليف أنيق، 03 خدمة عملاء قريبة), and a closing burgundy band with a button "تسوّق الآن".
```

---

### W-14 · محادثة الموقع (Chat Widget)

**المرجع:** §23، §24، §81 · **الحركات:** FX-15 · FX-20

```text
Design the open live-chat widget for the Arabic RTL luxury jewelry store IRIS (آيريس), shown over a dimmed product page (desktop 1440px). The widget is anchored at the bottom-LEFT corner, 380×560px, radius 20px.

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Header: deep burgundy with a small gold iris logo, "دعم آيريس", a green availability dot with "متصلون الآن", minimize and close icons. Body on ivory: a bot-free greeting bubble "مرحباً، كيف يمكننا مساعدتك؟", quick-reply chips "هل القطعة متوفرة؟"، "تتبع طلبي"، "أسئلة التوصيل"; customer message bubble "هل لديكم القلادة رقم 102؟" (burgundy fill, ivory text); staff reply "نعم متوفرة، متبقي 3 قطع" with an attached mini product card (photo, name, price "18,000 د.ع", button "عرض"). Typing indicator dots in gold. Footer: attach icon, text input "اكتب رسالتك…", send button (arrow pointing left). Also show the collapsed floating contact button speed-dial with three options: واتساب، إنستغرام، محادثة.
```

---

### W-15 · صفحات النظام (404 · صيانة)

```text
Design two desktop (1440px) system pages for the Arabic RTL luxury jewelry store IRIS (آيريس) as two frames.

Style: luxury Arabic RTL storefront — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, faint lattice + grain, burgundy-tinted shadows. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — 404: asymmetric layout; right: huge thin gold "404" numerals, headline "الصفحة غير موجودة", text "ربما انتقلت القطعة التي تبحث عنها", a search field and button "العودة للرئيسية"; left: an arch frame with an empty velvet jewelry display and a single gold ring. Below, a rail of 4 suggested products.
Frame 2 — صيانة: full-bleed Wine Night page with the iris line-art monogram in gold, headline in ivory "نجهّز لكم شيئاً أجمل"، text "المتجر في صيانة قصيرة، نعود قريباً"، expected time "نعود الساعة 6:00 م", and two outline gold buttons "واتساب" and "إنستغرام".
```

---

## 5. برومبتات تطبيق العميل — Mobile (Stitch ← **App**)

**الجمهور:** العميل · **المقاس:** 393×852 (iPhone) · **التنقل:** شريط سفلي بخمس تبويبات: **الرئيسية · التصنيفات · السلة · تواصل · حسابي** · **المرجع:** §2.1، §68، §100

> **ملاحظة تصميمية:** يختلف التطبيق عن الموقع بـ: شريط سفلي عائم بحافة ذهبية رفيعة، أوراق سفلية (Bottom Sheets) للفلاتر والمتغيرات، هيدر كبير يتقلّص عند التمرير، وإشعارات Push بروابط عميقة. كل شاشة تُصمَّم بمساحات لمس 44px وهوامش آمنة (Safe Area).

---

### M-01 · الشاشة الافتتاحية + التعريف (Splash & Onboarding)

**الحركات:** FX-03 · FX-09 · FX-21

```text
Design 4 mobile app frames (393×852) for IRIS (آيريس), an Arabic RTL luxury accessories boutique app.

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — Splash: full-bleed Wine Night (#1E070D) with a faint 4% lattice; in the center the gold line-art iris flower monogram and the IRIS wordmark in champagne gold with "آيريس" beneath; a thin gold hairline loading bar at the bottom.
Frames 2–4 — Onboarding (3 slides), each with a tall arch-topped photo in the upper 60% (frame 2: gold necklace on burgundy velvet; frame 3: gift box with ribbon; frame 4: hand receiving a parcel), a double gold rule, a headline in El Messiri, one sentence of body text, three gold pagination dots (the active one elongated), and a bottom button. Copy: slide 1 "قطع منتقاة بعناية" / "اكتشفي قلائد وخواتم وأساور بتصاميم أنيقة"; slide 2 "هدايا تُغلَّف بحب" / "اختاري المجموعة المناسبة ونحن نتكفل بالتغليف"; slide 3 "اطلبي بسهولة" / "من التطبيق أو عبر واتساب وإنستغرام، والدفع عند الاستلام". Top-left link "تخطي"; button "التالي" on slides 1–2 and "ابدأ التسوق" on slide 3 (burgundy fill, ivory text, gold hairline).
```

---

### M-02a · الرئيسية — الجزء العلوي

**الحركات:** FX-01(نسخة التطبيق: FX-20) · FX-03 · FX-04 · FX-06 · FX-14 · FX-18

```text
Design the TOP of the Home tab (393×852) of the Arabic RTL luxury accessories shopping app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Top to bottom:
1. Compact app bar on ivory: on the right the IRIS wordmark (Instrument Serif) with small "آيريس"; on the left a search icon button and a notification bell with a tiny gold dot.
2. A rounded search field (12px radius, gold hairline) "ابحث بالاسم أو رقم القطعة" with a small camera/scan icon.
3. Hero card: NOT centered text — right-aligned text block on a burgundy 800 panel with a gold eyebrow "مجموعة الخريف", headline in El Messiri "قطعٌ تحكي حكايتكِ", one button "تصفّح المجموعة" (gold foil fill, Wine Night text); the arch-topped photo of a gold pendant sits in its own area on the left half of the card with a gold hairline frame. Three small pagination dots below.
4. Category chips row (horizontal scroll, first chip at the right): circular photo avatars 64px with gold hairline ring and name below: القلائد، الخواتم، الأساور، الأقراط، الهدايا.
5. Section "وصل حديثاً" with a "عرض الكل" link: horizontal rail of product cards (width 160px, 4:5 photo, gold "جديد" tag, name, price "18,000 د.ع", round "+" quick-add button at the photo corner) with the next card peeking on the left edge.
6. Floating bottom tab bar (rounded 24px, ivory with burgundy-tinted shadow and a thin gold top hairline): الرئيسية (active, burgundy icon with small gold dot), التصنيفات، السلة (with count badge 2)، تواصل، حسابي.
```

---

### M-02b · الرئيسية — الجزء السفلي (بعد التمرير)

**الحركات:** FX-04 · FX-05 · FX-09 · FX-17 · FX-20

```text
Continue the Home tab (393×852) of the Arabic RTL luxury accessories app IRIS (آيريس) — design the part visible after scrolling down about 1200px. Keep the bottom tab bar visible.

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Sections:
1. "الأكثر طلباً": a numbered vertical list 01–03 with thin gold numerals, small square photo, name, price and a quiet "عرض" link.
2. "العروض" on a deep burgundy section with a curved top edge: heading in ivory, a countdown of four small digit blocks in gold, a horizontal rail of 2.3 cards with gold "-20%" badges and champagne prices.
3. "مجموعات الهدايا": one large arch-topped photo card with text and a text link, below it a smaller second one — staggered, not equal.
4. "قطع محدودة" on Wine Night: two tall tiles with gold pills "متبقي 3 قطع" and "آخر قطعة".
5. A calm trust list with four rows and gold line icons: توصيل لجميع المحافظات، الدفع عند الاستلام، تغليف هدايا أنيق، استبدال خلال 7 أيام.
6. A closing card on burgundy: "هل تحتاجين مساعدة في الاختيار؟" with two buttons: "واتساب" (gold foil) and "محادثة مباشرة" (gold outline).
```

---

### M-03 · التصنيفات

```text
Design the Categories tab (393×852) of the Arabic RTL luxury accessories app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Large collapsing title "التصنيفات" with a double gold rule. A two-column masonry of tall arch-topped photo tiles with staggered heights (not equal): القلائد (42 قطعة)، الخواتم (28 قطعة)، الأساور (31 قطعة)، الأقراط (24 قطعة)، مجموعات الهدايا (12 مجموعة)، العروض (9 قطع) — name in ivory on a bottom burgundy gradient strip inside each tile (text never over the photo's focal area), a small arrow icon on the left. Bottom floating tab bar with "التصنيفات" active.
```

---

### M-04 · قائمة المنتجات + الفلاتر

**المرجع:** §36 · **الحركات:** FX-16 · FX-20

```text
Design three frames (393×852) for the product listing of "القلائد" in the Arabic RTL luxury accessories app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — Listing: top bar with a right-pointing back arrow (RTL), title "القلائد", search and bag icons; a sticky row with two buttons "الفلاتر (2)" and "الترتيب: الأحدث"; active chips "ذهبي ×" "أقل من 20,000 ×"; a 2-column product grid of cards (4:5 photo, tags: "جديد", "-28%", "آخر قطعتين", one dimmed "نفد المخزون"; name; price with struck old price; round + button); a "عرض المزيد" secondary button and a thin gold progress line "12 من 42".
Frame 2 — Filter bottom sheet (rises over the dimmed list, drag handle, 16px top radius): sections التصنيف، السعر (range slider with min on the right and two small inputs), اللون (round swatches), المادة (checkbox list), المقاس (pill chips), switches "المتوفر فقط" and "عليه خصم"; sticky footer with text button "مسح" and burgundy button "عرض 18 منتج".
Frame 3 — Sort bottom sheet: radio list الأحدث (selected, gold check)، الأكثر مبيعاً، السعر من الأقل، السعر من الأعلى.
```

---

### M-05 · البحث

```text
Design the search screen (393×852) of the Arabic RTL luxury accessories app IRIS (آيريس), two frames.

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — before typing: focused search field with keyboard hint area, "عمليات البحث الأخيرة" with small clock icons and removable chips, "الأكثر بحثاً" chips, and "تصنيفات سريعة" as small arch thumbnails.
Frame 2 — typing "102": suggestions list with 4 result rows (thumbnail, name with "102" highlighted in burgundy, SKU "NK-102" monospace, price), a categories row, and a footer link "عرض كل النتائج (6)". Empty-result variant text below: "لم نجد «خاتم ذهبي 999»" with button "اسألنا عبر واتساب".
```

---

### M-06 · تفاصيل المنتج

**المرجع:** §6، §10، §69 · **الحركات:** FX-12 · FX-15 · FX-19 · FX-21

```text
Design the product detail screen (393×852) for "قلادة ذهبية رقم 102" in the Arabic RTL luxury accessories app IRIS (آيريس), plus its variant bottom sheet.

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — Detail: a swipeable full-width arch-topped photo gallery (macro gold pendant on burgundy velvet) with 4 small gold pagination dots, translucent round back and share buttons above it (not over the product focal area); below: gold "جديد" tag, title in El Messiri, "رقم المنتج 102 · SKU: NK-102" with copy icon, price "18,000 د.ع" with struck "25,000 د.ع" and a "-28%" pill; color swatches (ذهبي selected، فضي); size chips 40/45/50 سم (50 struck "نفد"); amber line "متبقي 3 قطع"; delivery row "التوصيل إلى بغداد — 5,000 د.ع — خلال 1–3 أيام" with a change link; accordions الوصف، المادة والمقاس، العناية بالقطعة، الشحن والاسترجاع; a rail "قد يعجبك أيضاً".
Sticky bottom bar (above the safe area): quantity stepper on the right, a wide burgundy button "أضف إلى السلة", and two small round buttons for WhatsApp and Instagram.
Frame 2 — the "اختيار الخيارات" bottom sheet with drag handle: thumbnail, price, color swatches, size chips, quantity, and a full-width button "أضف إلى السلة — 18,000 د.ع".
```

---

### M-07 · السلة

```text
Design the Cart tab (393×852) of the Arabic RTL luxury accessories app IRIS (آيريس), two frames.

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — filled cart: title "سلة التسوق (3)"; line items as rows (72px photo, name, variant "ذهبي / 45 سم", price, quantity stepper, remove icon); one row with an amber inline note "تغيّر سعر هذا المنتج إلى 20,000 د.ع"; one dimmed row "غير متاح حالياً" with "إزالة"; a coupon field "كود الخصم" with "تطبيق"; summary card with المجموع الفرعي، الخصم، التوصيل "يُحسب عند إتمام الطلب"، الإجمالي; a sticky bottom area with total "38,700 د.ع" and button "إتمام الطلب" above the tab bar.
Frame 2 — empty cart: line-art iris and jewelry box illustration, "سلتك فارغة", button "تصفّح المنتجات", and a rail of suggestions.
```

---

### M-08 · إتمام الطلب (خطوات)

**المرجع:** §12، §13، §40 · **الحركات:** FX-13 · FX-21

```text
Design three frames (393×852) of a stepped checkout in the Arabic RTL luxury accessories app IRIS (آيريس). Header: back arrow (pointing right), title "إتمام الطلب", and a 4-step gold progress line filling right-to-left with labels "الاتصال، التوصيل، الدفع، المراجعة".

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 (step 1 — الاتصال): fields الاسم الكامل، رقم الهاتف (+964), checkbox "نفس الرقم على واتساب", optional البريد; link "تسجيل الدخول لتعبئة بياناتي".
Frame 2 (step 2 — التوصيل): المحافظة select (بغداد), المدينة/القضاء, الحي/المنطقة, "أقرب نقطة دالة", تفاصيل العنوان, ملاحظات للتوصيل; a result chip "رسوم التوصيل 5,000 د.ع · 1–3 أيام"; one field showing an error state with helper text in red and an icon.
Frame 3 (step 4 — المراجعة): payment card "الدفع عند الاستلام" (selected with gold ring), items summary, totals with "المبلغ المستحق عند الاستلام 43,700 د.ع", terms checkbox "أوافق على سياسة الشحن والاسترجاع". Each frame has a sticky bottom bar: total on the right and a burgundy button ("متابعة" or "تأكيد الطلب") on the left.
```

---

### M-09 · تأكيد الطلب

```text
Design the order-success screen (393×852) of the Arabic RTL luxury accessories app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Top: a gold line-art seal (circle with a check) drawn in a hand-engraved feel; eyebrow "تم الاستلام"; headline in El Messiri "شكراً لثقتك بنا"; order number "#1054" in large monospace with a copy icon; amber status pill "بانتظار التأكيد"; sentence "سنتواصل معك قريباً لتأكيد طلبك". Then a 3-step mini timeline (تم الاستلام ← تأكيد ← شحن) with the first dot filled gold. A summary card: items, delivery address "بغداد — الكرادة", payment "الدفع عند الاستلام", "المبلغ المستحق 43,700 د.ع". Buttons: primary "تتبع طلبي", outline "راسلنا على واتساب", text link "متابعة التسوق".
```

---

### M-10 · طلباتي + التتبع

**المرجع:** §12، §80

```text
Design two frames (393×852) of order history and tracking in the Arabic RTL luxury accessories app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — "طلباتي": segmented control "الكل | جارية | مكتملة | ملغاة"; order cards with order number #1054, date, thumbnail strip of items, status pills (بانتظار التأكيد amber، تم الشحن blue-tinted، مكتمل green-tinted، ملغي red-tinted), total, and buttons "تتبع" / "إعادة الطلب".
Frame 2 — order detail/tracking: header "طلب #1054" with a pill "تم الشحن"; a VERTICAL stepper with a gold line: تم الاستلام، تم التأكيد، قيد التجهيز، تم الشحن (current, soft ring), تم التسليم (hollow) with times; "آخر تحديث" card; items list; payment block "الإجمالي 43,700 · المدفوع 0 · المتبقي 43,700 د.ع"; delivery address; bottom actions "طلب إلغاء"، "طلب إرجاع" (disabled until delivery), and a WhatsApp help button.
```

---

### M-11 · تواصل (محادثة + قنوات)

**المرجع:** §23، §81، §82 · **الحركات:** FX-20

```text
Design two frames (393×852) of the "تواصل" tab in the Arabic RTL luxury accessories app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — channels hub: title "تواصل معنا"; a hero card on burgundy with "نحن هنا لمساعدتك" and working hours "10:00 ص – 10:00 م"; three large tiles in staggered sizes: "محادثة مباشرة" (primary, gold foil, availability dot), "واتساب", "إنستغرام"; below a short list "الأسئلة الشائعة" with accordions.
Frame 2 — in-app chat: header with small iris logo, "دعم آيريس", availability dot; quick-reply chips; customer bubble (burgundy fill, ivory text) "هل لديكم القلادة رقم 102؟"; staff bubble (white with hairline) "نعم متوفرة، متبقي 3 قطع" followed by an attached product card (photo, name, price, button "عرض"); typing dots in gold; input bar with attach icon, field "اكتب رسالتك…" and a send button (arrow pointing left).
```

---

### M-12 · حسابي

```text
Design three frames (393×852) of the "حسابي" tab in the Arabic RTL luxury accessories app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — guest state: arch photo, "أهلاً بك في آيريس", phone field with +964 and button "أرسل رمز التحقق", text link "المتابعة كضيف", and a settings list below (اللغة، الإشعارات، الشروط).
Frame 2 — OTP: six digit boxes, countdown "إعادة الإرسال بعد 00:42", button "تأكيد".
Frame 3 — logged-in profile: avatar initials, name and phone with a verified gold check; list rows with icons and left chevrons: طلباتي، عناويني، بياناتي، الإشعارات، الإرجاع والاستبدال، السياسات، تسجيل الخروج؛ and at the very bottom a subtle destructive text row "حذف الحساب".
```

---

### M-13 · طلب إرجاع (تطبيق)

```text
Design two frames (393×852) of the return request flow in the Arabic RTL luxury accessories app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — choose items and reason: order #1054 summary, item "خاتم فضي رقم 31 — مقاس 8" with a quantity selector (max 1), reason select, text area, photo uploader with dashed gold hairline.
Frame 2 — outcome and review: three selectable cards "استرداد المبلغ"، "رصيد في المتجر"، "استبدال"; info note "لا يُرد المبلغ أو يُعاد الصنف إلا بعد الفحص والاعتماد"; sticky button "إرسال الطلب". Then a small success sheet "تم إرسال طلب الإرجاع R-0031" with a status pill "قيد المراجعة".
```

---

### M-14 · الإشعارات + حالات النظام

```text
Design three frames (393×852) in the Arabic RTL luxury accessories app IRIS (آيريس).

Style: luxury Arabic RTL mobile app — ivory #FBF6EF canvas, imperial burgundy #721328 and deep oxblood #3A0A16 surfaces, royal-gold #C9A24B hairlines, El Messiri headings, IBM Plex Sans Arabic body, arch-topped image frames, double gold rules, subtle grain, burgundy-tinted shadows, 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — notifications inbox: grouped by "اليوم" and "الأسبوع الماضي"; rows with a small gold line icon, title, one-line body and time: "تم تأكيد طلبك #1054"، "تم شحن طلبك"، "عاد المنتج الذي تنتظره إلى المخزون"، "عرض ينتهي قريباً"; unread rows have a burgundy dot and a rose-mist background.
Frame 2 — no connection: line-art illustration, "لا يوجد اتصال بالإنترنت", text "تحقق من اتصالك وحاول مجدداً", button "إعادة المحاولة", and a note that the cart is saved.
Frame 3 — update required and maintenance in one frame pair stacked: a card "يتوفر تحديث جديد" with button "تحديث الآن" and a card "نعود قريباً" for maintenance.
```

---

## 6. برومبتات لوحة الإدارة — Desktop (Stitch ← **Web**)

**الجمهور:** المالك · الموظفة · المحاسب · أمين المخزن (§3) · **المقاس:** 1440px · **المرجع:** §20، §65، §76

> **اتجاه التصميم:** نفس العنابي والذهبي لكن **أكثر هدوءاً وكفاءة**: الشريط الجانبي عنابي ليلي، المحتوى عاجي، البطاقات بيضاء بحدود عنابية رفيعة، والذهبي لنقاط محدودة فقط (المؤشر النشط، الأرقام المهمة). **خطوط Sans فقط** وأرقام Tabular. الألوان الدلالية للحالات (نجاح/تحذير/خطأ) كما في القسم 1.2.
>
> **ترتيب التوليد المقترح:** A-02 (الهيكل + اللوحة) أولاً لأنه يحدد الشريط الجانبي، ثم A-04 ← A-05 ← A-06 ← A-08 ← A-09 ← باقي الشاشات. كل برومبت يقول "Same app shell" ليبقى الهيكل ثابتاً.

---

### A-01 · تسجيل الدخول + استعادة كلمة المرور + 2FA

**المرجع:** §4 · **الحركات:** FX-21 · FX-24

```text
Design three desktop (1440px) frames for the admin login of IRIS (آيريس), an Arabic RTL accessories store management platform.

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — login: split screen. Right 50%: Wine Night panel with a faint lattice pattern, the gold iris monogram, IRIS wordmark and the line "لوحة إدارة آيريس" (no business data shown). Left 50%: ivory form card (420px): title "تسجيل الدخول", field "البريد الإلكتروني أو اسم المستخدم", password field with show/hide icon, checkbox "تذكر هذا الجهاز", full-width burgundy button "دخول", link "نسيت كلمة المرور؟". Show an inline neutral error "بيانات الدخول غير صحيحة" and a small note "المحاولات المتكررة تُقيَّد مؤقتاً".
Frame 2 — password reset request + new password: the same split; form "استعادة كلمة المرور" with a success note "إن كان الحساب موجوداً فسيصلك رابط لإعادة التعيين"; below it the new-password state with strength meter and live rules checklist (8 أحرف على الأقل، حرف كبير وصغير، رقم) using gold check marks.
Frame 3 — two-factor: six code boxes, "استخدم رمز استرداد" link, attempts note, burgundy button "تحقق".
```

---

### A-02 · هيكل اللوحة + لوحة المعلومات (المالك)

**المرجع:** §20، §65، §75، §76 · **الحركات:** FX-11 · FX-24

```text
Design the desktop (1440px) Owner Dashboard of IRIS (آيريس), an Arabic RTL accessories store management platform. This is the master app-shell screen.

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

App shell: right-side 264px Wine Night sidebar with the IRIS wordmark and these 18 items with thin gold line icons: لوحة المعلومات (active: rose-tinted fill + gold marker bar), الطلبات (count badge 12), المنتجات، التصنيفات، المخزون (badge 5)، المشتريات، الموردون، العملاء، صندوق الوارد (badge 3)، المدفوعات، المصاريف، المحاسبة، التقارير، الموظفون، الإشعارات (badge 7)، الأرشيف، سجل التدقيق، الإعدادات; a small user card at the bottom. Top bar on ivory: breadcrumb, a wide global search field "بحث في كل شيء (Ctrl+K)", a "+" quick-actions button (منتج، طلب، شراء، مصروف، عميل، تسوية مخزون), notification bell with count, avatar menu.
Content, uncluttered, in this order: header "لوحة المعلومات" with date-range chips (اليوم selected، أمس، هذا الأسبوع، هذا الشهر، الشهر الماضي، هذه السنة، نطاق مخصص) and a "تخصيص" button. Two rows of six KPI cards (white, hairline, subtle sparkline, delta chip with arrow, whole card clickable): مبيعات اليوم 1,250,000 د.ع (+12%)، طلبات اليوم 14، بانتظار التأكيد 5، طلبات مؤكدة 9، طلبات مسلّمة 6، مخزون منخفض 8 | نفد المخزون 2، العملاء 318، مستحقات العملاء 640,000 د.ع، المصاريف 210,000 د.ع، الربح الإجمالي 480,000 د.ع، الربح التشغيلي 270,000 د.ع. Then a large "المبيعات والطلبات" chart card (burgundy bars for sales, gold line for orders, toggle يومي/أسبوعي/شهري) beside a "المبيعات حسب القناة" donut (إنستغرام 40%، الموقع 35%، واتساب 20%، أخرى 5%) in burgundy, gold, rosewood and slate tones. Then three columns: أفضل المنتجات، أفضل التصنيفات، مخزون منخفض (with a "إنشاء أمر شراء" link). Then "أحدث الطلبات" (5 rows with status badges and a "تثبيت" button on pending) beside "أحدث المحادثات" (channel icons, unread dots). A final "لقطة مالية" strip: صافي المبيعات 4,700,000 | تكلفة البضاعة 2,600,000 | الربح الإجمالي 2,100,000 | المصاريف 600,000 | الربح التشغيلي 1,500,000.
```

---

### A-03 · لوحة الموظفة (يومي)

**المرجع:** §66، §67، §78

```text
Design the desktop (1440px) Employee Dashboard "يومي" of IRIS (آيريس) for a sales/customer-service employee (no profit or cost data anywhere).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell as the owner dashboard but the sidebar shows only: لوحة المعلومات، الطلبات، المنتجات، العملاء، صندوق الوارد، الإشعارات. Content: a greeting "صباح الخير، سارة" with two primary buttons "+ طلب جديد" and "+ عميل جديد". Four small KPI cards: محادثاتي المفتوحة 6، طلبات تنتظر التأكيد 3، طلباتي اليوم 5، عمولتي هذا الشهر (a lock icon with tooltip "تظهر عند تفعيل العمولات"). Two columns: "محادثات تنتظر الرد" (rows with channel icon Instagram/WhatsApp/Website, name, preview, waiting time, "فتح" button) and "طلبات تحتاج إجراء" (rows: #1054 بانتظار التأكيد 43,700 د.ع with "تثبيت", #1051 قيد التجهيز). Below, a quick-actions row: عميل جديد، طلب جديد، بحث عن منتج، فتح محادثة. A small "منتجات منخفضة المخزون" list that shows available quantity only (no cost).
```

---

### A-04 · قائمة الطلبات

**المرجع:** §9، §21، §36 · **الحركات:** FX-16 · FX-24

```text
Design the desktop (1440px) Orders list screen of IRIS (آيريس), an Arabic RTL accessories store management platform.

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell as the dashboard, "الطلبات" active. Page header: title "الطلبات" with count "212 طلباً", buttons "+ طلب جديد" (burgundy) and "تصدير" (outline). Quick tabs with counts: الكل، بانتظار التأكيد (12, amber), قيد التنفيذ، تم الشحن، مكتملة، ملغاة/مرتجعة، مسودات. Toolbar: search "رقم الطلب، اسم العميل، الهاتف"، filters (الحالة، حالة الدفع، القناة، الموظفة، المحافظة)، date-type toggle (إنشاء/تأكيد/تسليم) with range picker, "الأعمدة", "العروض المحفوظة". Active filter chips. A data table with sticky header: checkbox, رقم الطلب (#1054 monospace), التاريخ، العميل (name + phone), القناة (icon badges: إنستغرام، الموقع، واتساب، هاتف، المحل), الحالة (badges: مسودة، بانتظار التأكيد، مؤكَّد، قيد التجهيز، جاهز، تم الشحن، تم التسليم، مكتمل، ملغي، مرتجع جزئياً), الدفع (badge + remaining amount), الإجمالي، الموظفة، المحافظة، kebab menu. Show 8 realistic rows; one pending row has an amber left edge and a quick "تثبيت" button; one row has a small warning icon with tooltip "كمية أحد الأصناف أكبر من المتاح". Show the bulk bar with 3 rows selected: "تثبيت المحدد"، "تغيير الحالة"، "طباعة ورقة التجهيز"، "تصدير". Footer: page size and pagination.
```

---

### A-05 · إنشاء طلب (موقع / Instagram / WhatsApp / هاتف / المحل)

**المرجع:** §10، §25، §46، §54، §67

```text
Design the desktop (1440px) "طلب جديد" screen of IRIS (آيريس) — a single order form used for every sales channel.

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "الطلبات" active. Header: breadcrumb "الطلبات › طلب جديد" and three buttons on the left: "حفظ كمسودة" (ghost), "إنشاء الطلب" (outline), "إنشاء وتثبيت" (burgundy).
Layout: the form column on the RIGHT (about 68%) with six numbered collapsible white cards; a STICKY SUMMARY card on the LEFT.
1) العميل: search field "ابحث بالهاتف أو الاسم" and "+ عميل جديد"; a selected customer card "أحمد علي — 0770 123 4567 — بغداد" with an amber badge "مبلغ مستحق 10,000 د.ع"; a match banner "هذا الرقم يخص عميلاً موجوداً".
2) مصدر الطلب: select "إنستغرام" (options: الموقع، إنستغرام، واتساب، فيسبوك، هاتف، المحل، أخرى), field "مرجع (حساب/رابط الرسالة)" with "@ahmed", and a linked-conversation chip "محادثة أحمد — إنستغرام".
3) المنتجات: a search/scan field "ابحث بالاسم أو SKU أو امسح الباركود"; two line items — photo, name, variant, SKU in monospace, "متاح 4" chip, quantity stepper, unit price (with a small pencil "تعديل السعر يتطلب صلاحية"), line total, remove; below "+ إضافة خصم" and a coupon field. (No cost or profit anywhere in this view.)
4) التوصيل: address select, المحافظة "بغداد", automatic fee "5,000 د.ع (منطقة بغداد)" with an edit link, delivery notes.
5) الدفع: method select "الدفع عند الاستلام", "المدفوع الآن 0", reference, attach-proof dropzone; computed "المتبقي 43,700 د.ع".
6) ملاحظات: segmented control "داخلية (lock icon) / ظاهرة للعميل" with a text area.
Summary card: items, المجموع الفرعي 43,000، الخصم -4,300، التوصيل 5,000، الإجمالي 43,700 د.ع, المدفوع 0, المستحق 43,700, and a "الأثر على المخزون عند التثبيت" mini table: Necklace-102: 4 ← 3 ; Ring-31: 1 ← 0 with a warning icon "آخر قطعة". Include an alert banner: "عند التثبيت سيتم خصم المخزون مرة واحدة فقط".
```

---

### A-06 · تفاصيل الطلب

**المرجع:** §9، §30، §72، §80، §85 · **الحركات:** FX-24

```text
Design the desktop (1440px) Order Details screen "طلب #1054" of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "الطلبات" active. Header: back arrow, title "طلب #1054", badges "مؤكَّد" (info), "غير مدفوع" (error), channel badge "إنستغرام", created time. Actions on the left: primary "بدء التجهيز", secondary "إضافة دفعة", and a "⋯" menu (تعديل، طباعة الفاتورة، ورقة التجهيز، إنشاء إرجاع، إلغاء الطلب).
A horizontal status stepper with a gold progress line: بانتظار التأكيد (done) ← مؤكَّد (current) ← قيد التجهيز ← جاهز ← تم الشحن ← تم التسليم.
Three-column layout (RTL): center/right main area, left side column with the Activity Timeline.
Main: a customer card (name, phone with call and WhatsApp buttons, address, "الموظفة المسندة: سارة", source reference "@ahmed" with "فتح المحادثة" button); tabs: نظرة عامة، العناصر، الدفعات، الشحن، الإرجاع، الملاحظات، السجل. In "العناصر": a table with photo, name + variant (as it was at order time), SKU, quantity, "سعر الوحدة وقت الطلب" 18,000 with a tiny info icon "السعر الحالي 25,000 — لم يتغير هذا الطلب", discount, line total; (for owner only, a subtle extra column "تكلفة الوحدة وقت الطلب" and "الهامش" in muted gray with an eye icon). Totals card: المجموع الفرعي، الخصم، التوصيل، الإجمالي 43,700، المدفوع 0، المستحق 43,700 with a gold progress bar showing paid share. Add a "الأثر على المخزون" card listing movements: "−1 Necklace-102 — حركة #8841".
Side timeline: 10:02 إنشاء الطلب (الموقع) · 10:05 تثبيت الطلب بواسطة سارة (المخزون −1 −1) · 10:07 إضافة ملاحظة · 11:30 قيد التجهيز; read-only entries with small gold nodes and a lock icon note "السجل للقراءة فقط".
```

---

### A-07 · معالجة الإرجاع

**المرجع:** §30، §71، §101 · **الحركات:** FX-24

```text
Design the desktop (1440px) Return Processing screen "إرجاع R-0031 للطلب #1054" of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "الطلبات" active. Header with badge "قيد المراجعة" and buttons "موافقة" (burgundy) and "رفض" (outline red). A 5-step gold progress line: مطلوب ← مراجعة ← موافَق عليه ← استلام وفحص ← استرداد/رصيد.
Main (right): table of returned items — "خاتم فضي رقم 31 / مقاس 8": الكمية المطلوبة، المسلَّمة 1، المرتجعة سابقاً 0، الكمية المرتجعة (input, max 1 with hint "لا يمكن تجاوز الكمية المسلّمة")، الحالة بعد الفحص (select: قابل لإعادة البيع / تالف). A "حساب الاسترداد" card showing the formula: سعر الوحدة وقت الطلب 25,000 × 1 − حصة الخصم 2,500 = 22,500 د.ع, outcome radio cards (استرداد، رصيد في المتجر، استبدال) and method select (نقداً). A yellow-tinted info card "الأثر على المخزون": قابل لإعادة البيع ← حركة إرجاع عميل +1; تالف ← تسجيل تالف دون زيادة المتاح.
Left: customer request card (reason "مقاس خاطئ", description, two photo thumbnails) and the activity timeline.
```

---

### A-08 · قائمة المنتجات

**المرجع:** §6، §7، §36، §37

```text
Design the desktop (1440px) Products list screen of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "المنتجات" active. Header: "المنتجات (318)", buttons "+ إضافة منتج" (burgundy) and "تصدير". Tabs "نشط | مؤرشف". Toolbar: search "الاسم أو SKU"، filters التصنيف، الحالة، المخزون، السعر، plus view toggle (جدول/شبكة). Table columns: checkbox, photo (48px, arch crop), المنتج (name + variants count "4 متغيرات"), SKU (monospace), التصنيف، السعر (with struck old price when discounted)، المخزون (quantity with a small bar), الحالة badge (منشور، مسودة، مخفي، مخزون منخفض، نفد المخزون، مؤرشف), آخر تعديل، kebab menu (تعديل، نسخ، أرشفة، حذف نهائي disabled with tooltip "مرتبط بـ 14 طلباً — استخدم الأرشفة"). Show 8 rows with realistic jewelry products (قلادة ذهبية رقم 102 — NK-102، خاتم فضي رقم 31 — RG-31، سوار ناعم رقم 08 — BR-08، أقراط لؤلؤ رقم 17 — ER-17). Bulk bar for selected rows: نشر، إخفاء، أرشفة، تصدير. Also show the "مؤرشف" tab variant as a small second frame with an "استعادة" button on each row.
```

---

### A-09 · إضافة / تعديل منتج

**المرجع:** §6.1، §6.2، §61، §69، §73

```text
Design the desktop (1440px) Product form "إضافة منتج" of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "المنتجات" active. Header with breadcrumb and a sticky action bar: "حفظ كمسودة"، "حفظ ونشر" (burgundy)، "إلغاء". Left sticky side card "معاينة في المتجر" showing a live product card and a "نشر على الموقع" switch with status badge.
Main (right) with horizontal tabs: الأساسيات (active)، الصور، التسعير، المتغيرات، المخزون، SEO، الخصائص والوسوم، السجل. Show the first tab fully: الاسم، رقم/SKU (auto-generated "NK-103" with refresh icon)، التصنيف (select), الوصف (rich text with a minimal toolbar), المادة، اللون، النوع، الوزن (غرام)، الوسوم (chips). Below, a visible compact "الصور" card: drag-and-drop zone with dashed gold hairline and 4 uploaded thumbnails (the first marked "الرئيسية" with a gold star, drag handles, alt-text field under each: "نص بديل للصورة"). A "التسعير" card: سعر البيع 18,000 د.ع، سعر ما بعد الخصم، and a "تكلفة الشراء" field with a lock/eye icon "ظاهر للمالك والمحاسب فقط". A "المتغيرات" card: a small table of variants (ذهبي/40، ذهبي/50، فضي/40، فضي/50) with SKU, barcode, price, quantity, and an "+ إضافة متغير" button. A "المخزون" card: الكمية الابتدائية، الحد الأدنى للمخزون 3 with a note "تُسجَّل الكمية الابتدائية كحركة مخزون". A SEO card: عنوان SEO، الوصف، الرابط "/products/gold-necklace-103" with a Google-style preview.
```

---

### A-10 · التصنيفات

```text
Design the desktop (1440px) Categories screen of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "التصنيفات" active. Left/right split: a draggable category TREE on the right (القلائد › قلائد ذهبية، قلائد فضية؛ الخواتم؛ الأساور؛ الأقراط؛ مجموعات الهدايا) with drag handles, product counts, visibility switches and a kebab menu (تعديل، أرشفة)؛ tabs "نشط | مؤرشف". On the left an edit panel: image uploader, الاسم، الرابط (slug), التصنيف الأب، الوصف، SEO fields, a "ظاهر في المتجر" switch, and buttons "حفظ" / "أرشفة التصنيف" with an info note "المنتجات المرتبطة (42) لن تُحذف".
```

---

### A-11 · المخزون (نظرة عامة)

**المرجع:** §8، §47، §56

```text
Design the desktop (1440px) Inventory overview of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "المخزون" active. Header "المخزون" with buttons "تسوية مخزون", "جرد جديد", "حركات المخزون". Four KPI cards: إجمالي القطع 1,840، منخفض المخزون 8 (amber)، نفد المخزون 2 (red-tinted)، منتجات راكدة 11 (neutral). Tabs: الكل، منخفض، نافد، راكد. Table: photo, المنتج/المتغير, SKU, المتاح (large tabular number), الحد الأدنى, آخر حركة (type + date), الحالة badge (متوفر، منخفض، نافد), actions (حركة، تسوية، إنشاء شراء). Highlight low rows with an amber left edge. A right-side drawer preview of one product "Necklace-102 — ذهبي / 45" with the last 5 movements as a mini timeline (شراء +50، بيع −2، مرتجع عميل +1، تالف −1) and the running balance 68. Include a small info banner: "لا تُعدَّل الكمية مباشرة — التعديل يتم عبر حركة مسجّلة بسبب".
```

---

### A-12 · حركات المخزون + نافذة التسوية

**المرجع:** §8.1، §31، §86

```text
Design two desktop (1440px) frames for inventory movements of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — the immutable ledger: same app shell, "المخزون" active. Table "حركات المخزون" with filters (النوع، المنتج، المستخدم، الفترة). Columns: التاريخ والوقت، المنتج/المتغير، نوع الحركة (badges: رصيد افتتاحي، استلام شراء، بيع لعميل، مرتجع عميل، مرتجع مورد، تالف، مفقود، تسوية يدوية، جرد)، الكمية (+50 green, −2 red, tabular), قبل، بعد، المرجع (link like "طلب #1054" or "شراء P-0412"), المستخدم، السبب. A lock icon in the header: "السجل غير قابل للتعديل أو الحذف". No edit buttons anywhere.
Frame 2 — "تسوية مخزون" dialog over the dimmed page: product picker, current system quantity 68 shown large, input "الكمية الفعلية" 65, computed difference "−3" in red, required select "السبب" (جرد فعلي، تالف، مفقود، تصحيح خطأ، أخرى), note, an "الأثر" preview row "68 ← 65", and buttons "إلغاء" / "تأكيد وتسجيل الحركة". Under the title a small note: "لن يمكن تعديل الرقم دون ذكر السبب".
```

---

### A-13 · الجرد (Stock Count)

**المرجع:** §31

```text
Design the desktop (1440px) Stock Count session screen "جرد مخزون — 01/10/2026" of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "المخزون" active. Header with status badge "قيد الجرد", progress "34 من 120 صنفاً" with a gold progress bar, buttons "حفظ مؤقت" and "اعتماد الجرد" (burgundy). A scan field "امسح الباركود أو اكتب SKU". Table: SKU, المنتج/المتغير، كمية النظام، الكمية الفعلية (editable input), الفرق (green/red/neutral badge), ملاحظة. Highlight rows with differences (−3, +1) in a soft rose tint. A summary card: عدد الفروقات 5، إجمالي النقص −7، إجمالي الزيادة +2. A confirmation modal preview text: "سيتم إنشاء حركات تسوية بسبب «جرد فعلي» باسمك".
```

---

### A-14 · الموردون + ملف المورد

**المرجع:** §17

```text
Design two desktop (1440px) frames for suppliers of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — list: same app shell, "الموردون" active; table with اسم المورد، الهاتف، المنتجات المرتبطة، إجمالي المشتريات، المدفوع، المستحق (amber when > 0)، آخر شراء، الحالة؛ tabs "نشط | مؤرشف"; button "+ مورد جديد".
Frame 2 — supplier profile "مورد الذهب المطلي": summary cards (إجمالي المشتريات 8,400,000 د.ع، المدفوع 7,000,000، المستحق 1,400,000 with a "تسجيل دفعة" button), contact card, tabs: المشتريات، الدفعات، المنتجات، الملاحظات، السجل; a purchases table with invoice reference, date, total, received status badge, and the payable balance with a gold progress bar.
```

---

### A-15 · شراء جديد + استلام + الدفعات

**المرجع:** §15، §16، §18، §61

```text
Design two desktop (1440px) frames for purchasing of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — "شراء جديد": same app shell, "المشتريات" active. Cards: المورد (select), رقم فاتورة المورد، تاريخ الشراء، مرفق الفاتورة (dropzone). A lines table: المنتج/المتغير (search), الكمية المشتراة 100, تكلفة الوحدة 9,000, الإجمالي 900,000, الكمية المستلمة (input, supports partial receive), المتبقي; "+ إضافة صنف". Summary: الإجمالي، المدفوع الآن، المستحق للمورد. An info panel "الأثر عند الاستلام": يزيد المخزون +100، تُنشأ دفعة جديدة (Batch B-0412)، متوسط التكلفة يصبح 8,670 د.ع، يُسجَّل مستحق على المورد. Buttons: "حفظ كمسودة"، "استلام البضاعة" (burgundy).
Frame 2 — batches: tab "دفعات الشراء" with a table: رقم الدفعة، المورد، المنتج، الكمية المشتراة، تكلفة الوحدة، الإجمالي، المستلم، المتبقي (with a small gold bar), تاريخ الشراء، فاتورة المورد. A small chip shows the costing method "طريقة التكلفة: المتوسط المرجّح".
```

---

### A-16 · العملاء + ملف العميل

**المرجع:** §11، §53

```text
Design two desktop (1440px) frames for customers (CRM) of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — list: same app shell, "العملاء" active. Table: avatar initials, الاسم، الهاتف، واتساب، المدينة، عدد الطلبات، إجمالي المشتريات، آخر عملية شراء، المستحق (amber), الحالة. Filters: المحافظة، لديه مستحق، آخر شراء. Buttons "+ عميل جديد", "تصدير". tabs "نشط | مؤرشف".
Frame 2 — profile "أحمد علي": header with avatar, phone with call/WhatsApp buttons, Instagram handle "@ahmed", city, status badge. KPI cards: إجمالي المشتريات 540,000 د.ع، عدد الطلبات 9، متوسط الطلب 60,000، المستحق 10,000 د.ع. Tabs: الملف، الطلبات، المدفوعات، المحادثات، الملاحظات، النشاط. Show the "الطلبات" tab: order rows with status badges and totals; on the left an "النشاط" timeline and a notes card with segmented "داخلية / ظاهرة". A merge-duplicates hint banner "يوجد عميل محتمل مكرر بنفس الرقم".
```

---

### A-17 · صندوق الوارد الموحّد (Unified Inbox)

**المرجع:** §24، §25، §26، §51، §52

```text
Design the desktop (1440px) Unified Inbox of IRIS (آيريس), an Arabic RTL accessories store management platform — the customer-service hub for Website chat, WhatsApp and Instagram.

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "صندوق الوارد" active. Three panes (RTL: list on the right, chat in the center, customer context on the left):
Pane 1 (list, 340px): search, filter chips (الكل، جديد، مسندة لي، بانتظار الرد، محلولة), conversation rows with avatar, name, channel badge (Instagram / WhatsApp / Website icons), last message preview, time, unread burgundy dot, status badge (مفتوحة، معلّقة، مُسندة، محلولة).
Pane 2 (chat): header with customer name, channel, assignee select "سارة", status select, "تحويل لموظفة". Messages: customer bubbles (white), staff bubbles (burgundy with ivory text), a distinct INTERNAL NOTE (pale gold tint with a lock icon, label "ملاحظة داخلية — لا تظهر للعميل"), a system event pill "تم إنشاء طلب #1054 من هذه المحادثة", and a product card message (photo, name, price, "عرض"). Composer: text field, "/" quick replies hint, buttons "+ منتج", "+ طلب", attach, a toggle "ملاحظة داخلية", and send. Show the quick-reply popup with "السعر: 18,000 د.ع", "المنتج متوفر حالياً", "هل ترغب بتثبيت الطلب؟".
Pane 3 (context, 320px): customer card (name, phone, city, "طلبات سابقة 9"، "مستحق 10,000"), linked orders list with status badges, a product search box, a primary button "إنشاء طلب من المحادثة" (burgundy), notes, and activity.
```

---

### A-18 · المدفوعات والمستحقات

**المرجع:** §13، §34، §87

```text
Design the desktop (1440px) Payments & Balances screen of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "المدفوعات" active. Tabs: المدفوعات، مستحقات العملاء (Receivables)، مستحقات الموردين (Payables). Top KPI strip: إجمالي المستحق على العملاء 640,000 د.ع، مدفوعات اليوم 410,000، مستحقات الموردين 1,400,000. Show the "مستحقات العملاء" tab: table with العميل، الطلب، الإجمالي، المدفوع، المتبقي، عمر الدين (badge: 3 أيام، 14 يوماً — amber/red-tinted)، آخر دفعة، زر "تسجيل دفعة". Also show the "تسجيل دفعة" side drawer: order #1054, remaining 43,700, amount input (cannot exceed remaining), method select (نقداً، تحويل), reference, received-by "سارة", date, attachment dropzone "صورة التحويل", and a live "المتبقي بعد الدفع". A payments ledger section with rows including a refund row labeled "استرداد" (neutral badge) — refunds are separate records, never negative payments.
```

---

### A-19 · المصاريف

**المرجع:** §19، §88

```text
Design the desktop (1440px) Expenses screen of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "المصاريف" active. Header "المصاريف", button "+ مصروف جديد", date-range chips. Left: a horizontal bar chart "المصاريف حسب التصنيف" (إعلانات، شحن، تغليف، رواتب، إيجار، خدمات، اشتراكات، صيانة، أخرى) in burgundy/gold/rosewood tones with total "210,000 د.ع". Right: table with التاريخ، التصنيف badge، الوصف، المبلغ، طريقة الدفع، المستخدم، مرفق (paperclip icon)، الحالة، kebab. An "إضافة مصروف" side drawer: التاريخ، التصنيف (select with "+ إدارة التصنيفات"), الوصف، المبلغ، طريقة الدفع، المورد/الجهة (optional), مرفق (dropzone "فاتورة أو صورة"), ملاحظات, buttons "حفظ" / "حفظ وإضافة آخر".
```

---

### A-20 · المحاسبة — قائمة الأرباح مع التفصيل (Drill-down)

**المرجع:** §14، §33، §34، §75 · **الحركات:** FX-11 · FX-24

```text
Design the desktop (1440px) Accounting screen of IRIS (آيريس), showing the operating income statement with a drill-down side panel.

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "المحاسبة" active. Header "المحاسبة" with date-range chips (هذا الشهر selected) and "تصدير PDF/Excel". Tabs: الربحية (active)، التدفق النقدي، المستحقات (العملاء)، الالتزامات (الموردون)، دفاتر السجلات. Main card "قائمة الدخل التشغيلية" as a clean statement with right-aligned labels and left-aligned tabular numbers, thin hairline rows, clickable lines (underline on hover): المبيعات الإجمالية 5,000,000 · الخصومات −200,000 · المرتجعات −100,000 · صافي المبيعات 4,700,000 (bold, gold double rule above) · تكلفة البضاعة المباعة 2,600,000 · الربح الإجمالي 2,100,000 (bold) · then expenses: إعلانات −300,000، شحن −150,000، تغليف −50,000، مصاريف أخرى −100,000 · الربح التشغيلي 1,500,000 (large, burgundy, gold double rule). Show a DRILL-DOWN side panel (slides from the left, 420px) open on "تكلفة البضاعة المباعة": a list of contributing orders (#1001, #1008, #1014 …) with quantities and unit cost snapshots and a footer total that matches 2,600,000 with a green check "المجموع مطابق". Add a small card "طريقة حساب التكلفة: المتوسط المرجّح" and a discreet note: "هذا نموذج إداري تشغيلي وليس بديلاً عن محاسبة قانونية متخصصة". Right column: a mini waterfall/bar chart from net sales to operating profit.
```

---

### A-21 · مركز التقارير

**المرجع:** §35، §55

```text
Design the desktop (1440px) Reports Center of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "التقارير" active. Frame 1 — hub: three groups of report tiles (not equal-card clutter: use list-style rows with a small icon, title, one-line description and a "فتح" link): المبيعات (يومي، أسبوعي، شهري، حسب المنتج، حسب التصنيف، حسب الموظفة، حسب قناة البيع)، المخزون (الحالي، المنخفض، النافد، حركة منتج، حركة فترة، المنتجات الراكدة)، المالية (الإيرادات، تكلفة البضاعة، الربح الإجمالي، المصاريف، الربح التشغيلي، المستحقات، الموردون). A "تقارير حديثة" strip.
Frame 2 — one open report "المبيعات حسب قناة البيع": date presets chips (اليوم، أمس، هذا الأسبوع، هذا الشهر، الشهر الماضي، هذه السنة، نطاق مخصص), comparison toggle, a stacked bar chart by channel (إنستغرام، الموقع، واتساب، فيسبوك، هاتف، المحل), a table beneath (القناة، عدد الطلبات، قيمة المبيعات، الملغاة، نسبة المساهمة) with clickable numbers, and an export menu (CSV، Excel، PDF).
```

---

### A-22 · الموظفون + الأدوار والصلاحيات

**المرجع:** §3، §78، §79، §102

```text
Design two desktop (1440px) frames for employees and permissions of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — employees list: same app shell, "الموظفون" active; table with avatar, الاسم، الدور (مالك، موظفة مبيعات، محاسب، أمين مخزن)، آخر دخول، عدد الطلبات، الحالة badge (نشط، موقوف، غير نشط، مؤرشف)، kebab (تعديل، إيقاف، أرشفة). Button "+ دعوة موظف" (an invite link is sent — no passwords shown). Info note: "لا يُحذف الموظف الذي لديه عمليات؛ يُعطَّل حسابه وتبقى عملياته".
Frame 2 — permissions for "سارة — موظفة مبيعات": left list of permission groups (المنتجات، المخزون، الطلبات، المدفوعات، المصاريف، المحاسبة، العملاء، صندوق الوارد، الإعدادات، التقارير). Main matrix with each row a permission and a THREE-STATE control (مسموح with a check icon / ممنوع with an x icon / يتطلب موافقة with a clock icon): عرض سعر البيع — مسموح؛ عرض تكلفة الشراء — ممنوع (with lock); إنشاء طلب — مسموح؛ تثبيت الطلب — مسموح؛ إلغاء الطلب — يتطلب موافقة؛ إنشاء مصروف — ممنوع؛ عرض الأرباح — ممنوع؛ محادثة العملاء — مسموح؛ تعديل الإعدادات — ممنوع؛ عرض سجل العميل — مسموح. A banner: "الصلاحيات تُطبَّق في الخادم — إخفاء الزر وحده لا يكفي". Role templates dropdown and a "حفظ" button.
```

---

### A-23 · الإشعارات + الأرشيف

**المرجع:** §28، §56، §37، §64

```text
Design two desktop (1440px) frames of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — notification center: same app shell, "الإشعارات" active; filters (الكل، غير مقروءة، طلبات، مخزون، مدفوعات، تكاملات); list grouped by day with a leading colored icon and a one-line text and action link: "طلب جديد #1054 من الموقع"، "مخزون منخفض: Ring-31 (متبقي 2)"، "دفعة مستحقة للمورد بعد يومين"، "فشل في ربط إنستغرام — إصلاح" (red-tinted row). Button "تعليم الكل كمقروء".
Frame 2 — archive: "الأرشيف" with tabs المنتجات، التصنيفات، العملاء، الموردون، الموظفون، المصاريف، الخصومات، المحادثات; table rows with "تاريخ الأرشفة" and "بواسطة", button "استعادة" per row, and a disabled "حذف نهائي" with tooltip "مرتبط بسجلات تاريخية". Info note: "الأرشفة تُخفي السجل من الاستخدام اليومي وتحافظ على تاريخه".
```

---

### A-24 · سجل التدقيق + سجل الأخطاء

**المرجع:** §32، §58، §92

```text
Design two desktop (1440px) frames of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — audit log: same app shell, "سجل التدقيق" active, with a lock icon note "سجل للقراءة فقط". Filters: المستخدم، الإجراء، الكيان، رقم الكيان، الفترة. Table: الوقت، المستخدم، الإجراء badge (تثبيت طلب، تعديل سعر، تسوية مخزون، أرشفة، استعادة، إضافة دفعة، استرداد، تسجيل دخول)، الكيان (Order #1054), السبب، IP/جهاز (masked). A side drawer for one row showing a DIFF view: "القيمة السابقة" vs "القيمة الجديدة" side by side (e.g., Status: بانتظار التأكيد ← مؤكَّد; Stock impact: −1 Necklace-102) with changed fields highlighted in a soft gold tint.
Frame 2 — system health: cards "فشل Webhooks"، "أخطاء API"، "طوابير الخلفية"، "آخر نسخة احتياطية: ناجحة منذ 3 ساعات"; a table of errors with الوقت، الخدمة، النوع، Correlation ID (monospace), الحالة (جديد، قيد المعالجة، محلول), and a human-readable message for the owner.
```

---

### A-25 · الإعدادات (عام + القنوات + المحاسبة)

**المرجع:** §27، §41، §42، §16، §50

```text
Design three desktop (1440px) frames of the Settings area of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Same app shell, "الإعدادات" active. A secondary vertical nav on the right of the content listing: العام، الهوية، العملة، الطلبات، المخزون، الدفع، الشحن والتوصيل، الإشعارات، رسائل العملاء، القنوات الاجتماعية، الموظفون، المحاسبة، الأمان.
Frame 1 — "العملة والطلبات": currency code IQD, symbol "د.ع", decimals 0, time zone; orders: switch "تأكيد تلقائي لطلبات الموقع", switch "تأكيد تلقائي لطلبات الموظفات", return window "7 أيام", approval rules.
Frame 2 — "القنوات الاجتماعية": three channel cards (واتساب، إنستغرام، محادثة الموقع) each with a connection status badge (متصل، يحتاج إعادة ربط، خطأ), account name, "آخر مزامنة", buttons "ربط عبر Meta الرسمي" / "إعادة الربط", and a small webhook activity table (الوقت، الحدث، الحالة: معالَج / فشل / قيد إعادة المحاولة). A note: "الربط يتم عبر المسارات الرسمية فقط".
Frame 3 — "المحاسبة": three radio cards for the costing method — "FIFO (الأقدم أولاً)"، "المتوسط المرجّح" (selected, gold ring)، "حسب الدفعة"; employee commission switch with rate input "2%"; shipping accounting options; a warning note "تغيير الطريقة لا يؤثر على الطلبات السابقة".
```

---

### A-26 · إدارة محتوى المتجر + الكوبونات

**المرجع:** §5، §39، §40

```text
Design two desktop (1440px) frames of IRIS (آيريس).

Style: luxury Arabic RTL admin dashboard — Wine Night #1E070D sidebar on the RIGHT with a gold active marker, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 for primary actions, royal-gold #C9A24B only for key accents, IBM Plex Sans Arabic with tabular numerals and IBM Plex Mono for SKUs and order numbers (sans-serif only), semantic status badges (color + icon + text). No emojis, no pure black, no neon glow. Follow the project DESIGN.md.

Frame 1 — storefront content manager: same app shell, "الإعدادات" active, sub-page "محتوى المتجر". Left: a live mini preview of the homepage. Right: a draggable list of homepage sections with switches — Hero (3 slides)، التصنيفات، وصل حديثاً، الأكثر طلباً، العروض، مجموعات الهدايا، قطع محدودة، الثقة، كيف تطلب، الأسئلة الشائعة، أزرار التواصل — each with an edit icon; selecting "Hero" opens an editor card: image upload, headline, subtext, button label and link.
Frame 2 — coupons & discounts: table of coupons (الكود SPRING10، النوع نسبة 10%، الحد الأدنى للطلب 30,000، الاستخدام 34/100، الفترة، الحالة نشط/منتهي) and a create drawer with type (نسبة، قيمة)، نطاق التطبيق (الكل، تصنيف، منتج)، الحد الأدنى، حد الاستخدام، مدة زمنية، and a note "الخصم يُحفظ ضمن الطلب ولا يتغير بتعديل القاعدة لاحقاً".
```

---

## 7. برومبتات تطبيق الإدارة للهاتف (الموظفة / المالك) — Mobile (Stitch ← **App**)

**الجمهور:** الموظفة (الاستخدام اليومي الأكبر) والمالك · **المقاس:** 393×852 · **المرجع:** §3، §10، §25، §67، §99

> **اتجاه التصميم:** أعمال سريعة بإبهام واحدة. شريط علوي عنابي ليلي بعنوان ذهبي فاتح، المحتوى عاجي، بطاقات بيضاء، **زر مركزي عائم "+ طلب جديد"** في الشريط السفلي. **Sans فقط** (IBM Plex Sans Arabic + Mono للأرقام). **لا بيانات تكلفة أو أرباح** في واجهة الموظفة.
>
> **شريط التبويبات:** الموظفة: **اليوم · المحادثات · (+ طلب) · الطلبات · المزيد**. المالك: **لوحة · الطلبات · المحادثات · المخزون · المزيد**.

---

### S-01 · تسجيل الدخول (بصمة + 2FA)

**المرجع:** §4

```text
Design three frames (393×852) of the login for the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — login: Wine Night upper 40% with the gold iris monogram and "آيريس — الإدارة"; below on ivory a rounded sheet: fields "البريد أو اسم المستخدم" and "كلمة المرور" (show/hide), checkbox "تذكر هذا الجهاز", burgundy button "دخول", text link "نسيت كلمة المرور؟", and an outline button "الدخول بالبصمة" with a fingerprint line icon.
Frame 2 — two-factor: six code boxes, "استخدم رمز استرداد", attempts note, button "تحقق".
Frame 3 — biometric prompt sheet: bottom sheet "تفعيل الدخول بالبصمة؟" with explanation and buttons "تفعيل" / "لاحقاً".
```

---

### S-02 · الرئيسية — الموظفة (اليوم)

**المرجع:** §66، §99

```text
Design the "اليوم" home tab (393×852) for an employee in the IRIS (آيريس) staff management mobile app (Arabic RTL). No profit or cost data.

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Deep Oxblood app bar with greeting "صباح الخير، سارة" and a bell icon with a gold dot. Below, a horizontal row of four compact KPI chips: محادثات مفتوحة 6، تنتظر التأكيد 3، طلباتي اليوم 5، مخزون منخفض 8. Quick-actions grid of four tiles in staggered sizes (not three equal cards): "طلب جديد" (large, burgundy), "فتح محادثة"، "بحث عن منتج"، "عميل جديد". Section "محادثات تنتظر الرد": rows with channel icon (Instagram/WhatsApp/Website), name, preview, waiting time, unread dot. Section "طلبات تحتاج إجراء": rows "#1054 — بانتظار التأكيد — 43,700 د.ع" with a small "تثبيت" button, "#1051 — قيد التجهيز". Bottom tab bar: اليوم (active)، المحادثات (badge 3)، a raised center round burgundy button with a gold ring and "+" (طلب جديد)، الطلبات، المزيد.
```

---

### S-03 · الرئيسية — المالك (لوحة مختصرة)

**المرجع:** §20، §76

```text
Design the owner's dashboard tab (393×852) in the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Collapsing Deep Oxblood header with the title "لوحة المعلومات" and a date-range chip row (اليوم، الأسبوع، الشهر). A hero KPI card on burgundy 800: "مبيعات اليوم" 1,250,000 د.ع in large champagne-gold numerals with a +12% chip and a small sparkline. Below a 2-column grid of compact KPI tiles (tappable): طلبات اليوم 14، بانتظار التأكيد 5، مخزون منخفض 8، مستحقات العملاء 640,000، الربح الإجمالي 480,000، الربح التشغيلي 270,000. A "المبيعات حسب القناة" horizontal stacked bar (إنستغرام 40% / الموقع 35% / واتساب 20% / أخرى 5%) with a legend. A "لقطة مالية" collapsible card. Lists: "مخزون منخفض" (3 rows) and "أحدث الطلبات" (3 rows with status badges). Bottom tab bar for the owner: لوحة (active)، الطلبات، المحادثات، المخزون، المزيد.
```

---

### S-04 · صندوق الوارد

**المرجع:** §24، §105

```text
Design the Inbox tab (393×852) in the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

App bar "المحادثات" with a search icon. Horizontal filter chips: الكل، جديد، مسندة لي، بانتظار الرد، محلولة. Conversation rows (72px): circular avatar with initials and a small channel badge (Instagram / WhatsApp / Website), name (أحمد، سارة، علي، مريم), last-message preview (e.g. "هل لديكم القلادة رقم 45؟"), time, burgundy unread dot, a status badge (مفتوحة، معلّقة، مُسندة لي، محلولة). One row is swiped slightly to reveal "إسناد" and "حل" actions. Section divider "تنتظر الرد منذ أكثر من ساعة" in amber. Tab bar with "المحادثات" active and a badge.
```

---

### S-05 · المحادثة

**المرجع:** §25، §51، §52

```text
Design the Conversation screen (393×852) in the IRIS (آيريس) staff management mobile app (Arabic RTL), with an order-from-chat bottom sheet as a second frame.

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — chat: Deep Oxblood app bar with back arrow (pointing right), customer "أحمد — إنستغرام", status chip "مُسندة لي", and a "..." menu. A thin context strip under the bar: "عميل سابق · 9 طلبات · مستحق 10,000 د.ع" tappable. Messages: customer bubbles white with hairline, staff bubbles burgundy with ivory text, a pale-gold INTERNAL NOTE with a lock icon and label "ملاحظة داخلية — لا تظهر للعميل", a system pill "تم إنشاء طلب #1054 من هذه المحادثة", and a product card message (photo, "قلادة ذهبية رقم 102"، 18,000 د.ع، "متوفر 3"). Composer: attach icon, input "اكتب رسالتك…", send arrow (pointing left); above the keyboard a chip row: "+ منتج", "+ طلب", "ردود جاهزة", "ملاحظة داخلية".
Frame 2 — "إنشاء طلب" bottom sheet over the chat: prefilled customer, channel "إنستغرام" and the product line; a primary button "متابعة الطلب".
```

---

### S-06 · إنشاء طلب (6 خطوات)

**المرجع:** §10، §46، §67 · **الحركات:** FX-13 · FX-15 · FX-20

```text
Design six frames (393×852) of the stepped "طلب جديد" flow in the IRIS (آيريس) staff management mobile app (Arabic RTL). A top gold progress line fills right-to-left over 6 steps; each frame has a sticky bottom bar with a running total and a burgundy button.

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — العميل: search by phone with a typed number and a match card "أحمد علي — 0770 123 4567 (عميل موجود)" with an amber badge "مستحق 10,000 د.ع"; link "+ عميل جديد".
Frame 2 — المصدر: segmented large chips: الموقع، إنستغرام (selected)، واتساب، فيسبوك، هاتف، المحل، أخرى; a reference field "@ahmed"; a linked-conversation chip.
Frame 3 — المنتجات: search field with a camera scan button; two product lines with photo, name, variant, "متاح 4" chip, quantity stepper, price; one line showing a red inline warning "الكمية المطلوبة أكبر من المتاح (1)".
Frame 4 — التوصيل: governorate select, area, nearest landmark, automatic fee "5,000 د.ع".
Frame 5 — الدفع: method cards (الدفع عند الاستلام selected، تحويل)، "المدفوع الآن" input, computed "المتبقي 43,700 د.ع".
Frame 6 — المراجعة: summary card, a block "الأثر على المخزون: Necklace-102 4 ← 3 · Ring-31 1 ← 0", and two buttons: "إنشاء الطلب" (outline) and "إنشاء وتثبيت" (burgundy). Also show a confirm sheet preview: "سيُخصم المخزون مرة واحدة فقط".
```

---

### S-07 · قائمة الطلبات

```text
Design the Orders tab (393×852) in the IRIS (آيريس) staff management mobile app (Arabic RTL), plus its filter sheet.

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — list: app bar "الطلبات" with search and filter icons; horizontally scrollable tabs with counts: الكل، بانتظار التأكيد (12، amber)، قيد التنفيذ، تم الشحن، مكتملة، ملغاة. Order cards: number #1054 (monospace), time, customer name + phone, channel icon, status badge, payment badge with remaining amount, total; a pending card has an amber start edge and an inline "تثبيت" button.
Frame 2 — filter bottom sheet: الحالة، حالة الدفع، القناة، التاريخ (chips: اليوم، أمس، هذا الأسبوع، هذا الشهر)، الموظفة، المحافظة; footer "مسح" / "عرض 48 طلب".
```

---

### S-08 · تفاصيل الطلب + الإجراءات

**المرجع:** §9، §46، §80 · **الحركات:** FX-13 · FX-20

```text
Design three frames (393×852) of the Order Details in the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — details: app bar "طلب #1054" with status badge; customer card with call and WhatsApp buttons and address; items list (price at order time, quantities); totals card with a gold progress bar for paid share (المدفوع 0 · المستحق 43,700 د.ع); a collapsible vertical timeline (10:02 إنشاء، 10:05 تثبيت بواسطة سارة…). Sticky bottom action bar: primary "تثبيت الطلب" and "..." for more.
Frame 2 — confirm sheet: bottom sheet "تثبيت الطلب #1054" listing the stock effect "Necklace-102: 4 ← 3 · Ring-31: 1 ← 0", a checkbox "إشعار العميل", and a burgundy button "تثبيت وخصم المخزون" that shows its loading state; text "لن يُخصم المخزون أكثر من مرة".
Frame 3 — conflict state: sheet with a red-tinted banner "تعذّر التثبيت: المتاح الآن من «قلادة رقم 102 / ذهبي» هو 1 (المطلوب 2)" and buttons "تقليل الكمية إلى 1"، "إزالة السطر"، "إلغاء".
```

---

### S-09 · بحث المنتجات + تفاصيل المنتج (عرض الموظفة)

**المرجع:** §3.2، §78

```text
Design three frames (393×852) of product lookup in the IRIS (آيريس) staff management mobile app (Arabic RTL). The employee must NOT see purchase cost or profit.

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — search: focused field with a scan button, recent searches, results rows (photo, name, SKU monospace, price, available quantity chip: متوفر 4 / منخفض 1 / نفد).
Frame 2 — product detail: photo gallery, name, price (and discounted price), variant list with quantity per variant, "متاح للبيع" large, buttons "إضافة إلى طلب" (burgundy) and "إرسال في المحادثة" (outline); a locked row "تكلفة الشراء — غير متاحة لدورك" with a lock icon.
Frame 3 — owner version of the same screen showing an extra "التكلفة والهامش" card (cost 10,000، هامش 8,000) and a "تعديل المخزون" button.
```

---

### S-10 · ماسح الباركود

```text
Design two frames (393×852) of the barcode/SKU scanner in the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — camera view dimmed with a rounded scan window with four gold corner brackets and a thin gold scan line; top bar with close icon and flash toggle; bottom area with a manual entry field "أدخل SKU يدوياً" and a mode chip "إضافة لطلب".
Frame 2 — result bottom sheet: product photo, name "قلادة ذهبية رقم 102", SKU NK-102 monospace, "متاح 4", price, quantity stepper and button "إضافة إلى الطلب"; a small "مسح آخر" button.
```

---

### S-11 · المخزون (الجرد والاستلام)

**المرجع:** §8، §31، §18

```text
Design three frames (393×852) of inventory tools in the IRIS (آيريس) staff management mobile app (Arabic RTL) for the warehouse role.

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — inventory home: KPI chips (منخفض 8، نافد 2)، list with SKU and available quantity bars, tabs (الكل، منخفض، نافد), floating actions "جرد" and "استلام شراء".
Frame 2 — stock count: progress "34 من 120", scan field, rows with system quantity vs a large numeric stepper for the counted quantity, difference badge (−3 red, +1 green), sticky button "اعتماد الجرد".
Frame 3 — adjustment sheet: current quantity 68, new quantity input, required reason select (جرد فعلي، تالف، مفقود، تصحيح خطأ), effect line "68 ← 65", button "تسجيل الحركة".
```

---

### S-12 · تسجيل دفعة

**المرجع:** §13، §71، §74

```text
Design the "تسجيل دفعة" bottom sheet (393×852) over an order screen in the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Sheet with drag handle: order #1054, remaining "43,700 د.ع"; a large numeric amount field (cannot exceed the remaining; shows an inline hint) with quick chips "المبلغ كاملاً" and "نصف المبلغ"; method segmented control (نقداً، تحويل)؛ reference field; attach button "صورة التحويل" with a camera icon; received-by "سارة"; live line "المتبقي بعد الدفع: 0 د.ع"; burgundy button "تسجيل الدفعة". A second small frame: a delivered-order prompt "تم استلام 43,700 د.ع نقداً؟" with a toggle to record it automatically.
```

---

### S-13 · إضافة مصروف سريع

**المرجع:** §19، §74

```text
Design the "مصروف جديد" screen (393×852) in the IRIS (آيريس) staff management mobile app (Arabic RTL), for accountant/owner.

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

A big amount field at the top "0 د.ع" with a numeric keypad hint; category chips (إعلانات، شحن، تغليف، رواتب، إيجار، خدمات، اشتراكات، صيانة، أخرى); date picker defaulted to today; payment method; description; a camera tile "تصوير الفاتورة" with a dashed gold hairline and a thumbnail preview; button "حفظ المصروف". Below, a "آخر المصاريف" list of 3 rows.
```

---

### S-14 · العملاء + ملف العميل

```text
Design two frames (393×852) of customers in the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — list: search by phone/name, filter chips (لديه مستحق، آخر شراء)، rows with initials avatar, name, phone, city, total purchases, an amber "مستحق" badge.
Frame 2 — profile "أحمد علي": header with call / WhatsApp / message buttons, Instagram handle, KPI chips (إجمالي المشتريات 540,000 · الطلبات 9 · المستحق 10,000)، segmented tabs (الطلبات، المحادثات، الملاحظات، النشاط), order rows with status badges, and a sticky button "طلب جديد لهذا العميل".
```

---

### S-15 · الإشعارات + تقارير سريعة (المالك)

**المرجع:** §28، §35

```text
Design two frames (393×852) in the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — notifications: grouped list with colored line icons and actions: "طلب جديد #1054 من الموقع — فتح"، "مخزون منخفض: Ring-31 (متبقي 2)"، "فشل في ربط إنستغرام — إصلاح" (red-tinted)، "دفعة مستحقة للمورد بعد يومين"; "تعليم الكل كمقروء".
Frame 2 — quick reports (owner): date chips, a bar chart of daily sales, "المبيعات حسب القناة" horizontal bars, "أفضل المنتجات" list, and a "لقطة مالية" card (صافي المبيعات، تكلفة البضاعة، الربح الإجمالي، المصاريف، الربح التشغيلي) with each number tappable (chevron) for drill-down; export button.
```

---

### S-16 · المزيد + الملف الشخصي والأمان

**المرجع:** §4.3

```text
Design two frames (393×852) of the "المزيد" tab in the IRIS (آيريس) staff management mobile app (Arabic RTL).

Style: luxury Arabic RTL mobile management app — Deep Oxblood #3A0A16 app bars with champagne-gold titles, ivory #FBF6EF canvas, white cards with burgundy-tinted hairline borders, imperial burgundy #721328 primary buttons, royal-gold #C9A24B hairlines, IBM Plex Sans Arabic with IBM Plex Mono for numbers (sans-serif only), semantic status badges (color + icon + text), 44px touch targets, safe-area padding. No emojis, no pure black, no neon glow, no overlapping text. Follow the project DESIGN.md.

Frame 1 — menu: profile card (avatar, name "سارة", role badge "موظفة مبيعات")، rows with line icons and chevrons: العملاء، المنتجات، المخزون، المصاريف، التقارير، الإشعارات، الإعدادات، الأمان، تسجيل الخروج.
Frame 2 — security: "تغيير كلمة المرور"، switch "الدخول بالبصمة"، "التحقق بخطوتين"، "الجلسات النشطة" list with device, last activity and an "إنهاء" button, "نشاط الدخول" list with success/failed rows.
```

---

## 8. برومبتات التحسين والمتابعة (Refinement Prompts)

> الصقها **بعد** توليد شاشة، في نفس المحادثة، دون إعادة كتابة البرومبت الأصلي. غيّر الأقواس `[...]` فقط.

### R-01 · أفخم دون ازدحام

```text
Make this screen feel more luxurious without adding clutter: increase whitespace by about 20%, thin the gold hairlines to 1px, replace any heavy borders with soft burgundy-tinted shadows, refine the headline typography (El Messiri, weight 600, line-height 1.35), and make sure gold is used on at most 3 elements per viewport. Keep all content and layout unchanged.
```

### R-02 · تقليل الذهبي وجعله أكثر رصانة

```text
Reduce the gold: keep it only for hairlines, small icons and one premium button per screen. Replace large gold fills with imperial burgundy or ivory. The gold must look like muted antique metal (#C9A24B), never yellow or neon. Do not change layout or copy.
```

### R-03 · زيادة الدفء الذهبي

```text
Add more warmth with gold, tastefully: a double gold rule under section headings, tiny gold corner ornaments on arch image frames, gold diamond bullets in lists, and a subtle gold foil gradient on the primary premium button. Keep text legible (never gold body text on ivory). Do not add new sections.
```

### R-04 · إصلاح RTL

```text
Fix RTL issues on this screen: mirror the whole layout so the start edge is on the right; navigation, sidebars, filters, steppers and progress bars must flow right-to-left; back arrows point right; "next" arrows point left; text is right-aligned; numbers, phone numbers, SKUs and prices stay left-to-right inside Arabic text; carousels start from the right. Remove any letter-spacing on Arabic text. Keep everything else.
```

### R-05 · حالات المكوّنات

```text
Add a component states sheet for this screen: buttons (default, hover, pressed, focus ring, loading, disabled), inputs (default, focus, filled, error with message, disabled), badges for every status used here, and one toast of each type (success, error, info). Use the same design system.
```

### R-06 · نسخ متجاوبة (لوح + هاتف)

```text
Create responsive versions of this desktop screen: a tablet version (768px) and a mobile-web version (393px). On mobile collapse everything to a single column, turn the sidebar/filters into a bottom sheet or drawer, convert tables to stacked cards, use a sticky bottom action bar, 44px touch targets, and reduce vertical section gaps to 56px. Keep the design system, copy and RTL.
```

### R-07 · حالات (فارغ / تحميل / خطأ)

```text
For this screen create three extra frames: (1) loading state with burgundy-tinted skeletons that match the exact layout, (2) empty state with a line-art iris and jewelry-box illustration, one sentence in Arabic and one primary action, (3) error state with a clear Arabic message, a retry button and a small reference code. Same design system.
```

### R-08 · لوحة نظام التصميم (Style Guide)

```text
Create a single "Design System" board for IRIS (آيريس) showing: the color palette with names and hex values (burgundy, oxblood, wine night, ivory, parchment, royal gold, champagne gold, antique gold, status colors), the typography scale in Arabic (El Messiri display, IBM Plex Sans Arabic body, IBM Plex Mono numbers), buttons (primary burgundy, premium gold foil, secondary, ghost), inputs, badges for order/payment/stock/conversation statuses, product card, KPI card, table row, toast, modal, bottom sheet, iconography samples (1.5px line icons), arch image frame and double gold rule. RTL, Arabic copy.
```

### R-09 · نسخة داكنة (Wine Night)

```text
Create a dark version of this screen: Wine Night #1E070D background, Deep Oxblood #3A0A16 cards with 1px rgba(201,162,75,0.25) borders, ivory #FBF6EF text, champagne-gold #E9D49C accents, muted rose #CDB7BB secondary text (contrast above 7:1). Status badges keep their semantic hues but with darker tinted backgrounds. No pure black, no neon.
```

### R-10 · ثلاثة خيارات لقسم الـ Hero

```text
Generate 3 alternative hero sections for this page, each asymmetric and non-overlapping: (A) split with a tall arch photo on the left and a large headline on the right on ivory; (B) full-width Wine Night hero with a horizontal row of three small framed jewelry photos under the headline; (C) editorial layout where a few words of the headline contain small rounded inline photos at text height (jewelry details) between the words. Same palette, Arabic copy, one primary button only.
```

### R-11 · دقة الخط العربي

```text
Polish the Arabic typography on this screen: headlines in El Messiri, body in IBM Plex Sans Arabic with line-height 1.7, no letter-spacing, maximum 60 characters per line, consistent size hierarchy (display 56, h1 40, h2 28, h3 20, body 16, caption 13), use Arabic punctuation (،  ؛  ؟  « »), keep Latin digits for numbers and prices, and align mixed Arabic/Latin text correctly.
```

### R-12 · أكثر هدوءاً / أكثر كثافة (للوحات)

```text
Make this dashboard calmer: fewer borders, more whitespace, group related numbers, reduce the number of visible KPI cards to the 6 most important and move the rest into a "المزيد" expandable row.
```
```text
Make this table denser for power users: 40px row height, 13px text, monospace tabular numbers, sticky header and first column, keep hover tint and status badges, no cards.
```

### R-13 · بيانات واقعية

```text
Replace the placeholder content with realistic Iraqi store data: customer names (أحمد علي، سارة محمود، مريم حسين، علي كاظم، زهراء جاسم), governorates (بغداد، البصرة، أربيل، النجف، كربلاء، الموصل), phone numbers in the 07XX XXX XXXX format, order numbers #1001–#1060, SKUs like NK-102, RG-31, BR-08, ER-17, GS-05, and prices in Iraqi dinars between 9,000 and 65,000 د.ع. No "John Doe", no round fake numbers.
```

### R-14 · مراجعة الوصولية

```text
Review this screen for accessibility and fix it: text contrast at least 4.5:1, interactive targets at least 44px, visible focus states, status never conveyed by color alone (add icon + text), form labels above inputs with error messages beneath, readable text size (minimum 14px for body, 12px only for captions), and logical RTL reading order.
```

### R-15 · لقطات التمرير للصفحة الطويلة (Scroll Frames)

```text
Show this long page as four stacked scroll-state frames at 0%, 25%, 50% and 75% scroll depth. In each frame show the header in its correct state (transparent at top, compact solid oxblood with gold hairline after scrolling), the 2px gold scroll-progress line filled accordingly, and the sections that are fully revealed versus just starting to reveal (slightly faded and offset 24px). Same design system.
```

### R-16 · قوالب الطباعة (فاتورة / ورقة تجهيز)

```text
Design an A4 printable order invoice and a packing slip for IRIS (آيريس), Arabic RTL, print-friendly (white background, ink #2A1215, minimal gold hairlines only). Invoice: logo, "فاتورة طلب #1054", date, customer, address, items table (الصنف، SKU، الكمية، سعر الوحدة، الإجمالي)، المجموع الفرعي، الخصم، التوصيل، الإجمالي، المدفوع، المستحق، payment method, thank-you line and contact details. The packing slip shows items with checkboxes and the delivery address, with NO prices, no cost and no profit.
```

---

## 9. لمسات احترافية تجعل البرنامج مُتقناً

> قائمة مرجعية لمراجعة أي شاشة تولّدها قبل اعتمادها. كل بند فيه سبب عملي.

### 9.1 تفاصيل بصرية

| اللمسة | الوصف | لماذا |
|---|---|---|
| **خط ذهبي مزدوج** | خطان متوازيان رفيعان تحت العناوين الكبرى وبين الأقسام | توقيع بصري يوحي بالصياغة اليدوية |
| **إطارات مقوّسة (Arch)** | صور المنتجات المميزة بقمة منحنية | شكل محراب عرض المجوهرات، يميّز الهوية |
| **زوايا ذهبية صغيرة** | أقواس ذهبية دقيقة في زوايا الصور المميزة | لمسة نقش بلا ازدحام |
| **نسيج هادئ** | حبيبات 3% + نقش هندسي 4% في الخلفيات الكبيرة | عمق ودفء بدل الأسطح المسطحة |
| **ظلال عنابية** | `rgba(58,10,22,.12)` بدل الرمادي | تناغم لوني دقيق |
| **أيقونات موحدة** | مجموعة خطية واحدة 1.5px، عنابي/ذهبي | اتساق |
| **زخرفة السوسن** | شعار زهرة آيريس خطي أحادي في الحالات الفارغة والصفحة الافتتاحية | هوية متكررة بلا مبالغة |
| **صور موحّدة** | نفس التدرج اللوني الدافئ ونفس النسب (4:5) | منع الفوضى البصرية |
| **تدرج ذهبي معدني** | على زر واحد مميز فقط في الشاشة | الندرة تصنع الفخامة |
| **فواصل منحنية** | بين الأقسام العنابية والعاجية | انتقال سلس بدل الحدود الحادة |

### 9.2 تفاصيل تفاعلية وسلوكية

- **حالات كاملة لكل عنصر:** Default / Hover / Pressed / Focus / Loading / Disabled (مع سبب التعطيل في Tooltip).
- **هياكل تحميل (Skeleton)** بدل الدوارات.
- **حالات فارغة مرسومة** مع إجراء واحد واضح.
- **رسائل خطأ مفهومة** بالعربية + إجراء إعادة المحاولة (لا رموز تقنية للمستخدم).
- **تأكيد الإجراءات الحساسة** مع عرض الأثر قبل التنفيذ (مثل "سيُخصم من المخزون").
- **منع النقر المزدوج** على التثبيت والدفع (زر Loading + مفتاح عدم التكرار).
- **حفظ تلقائي للمسودات** في النماذج الطويلة (منتج، طلب).
- **اختصارات لوحة المفاتيح** في الإدارة: `Ctrl+K` بحث، `N` جديد، `Ctrl+S` حفظ.
- **ذاكرة الفلاتر** في الرابط لتبقى عند الرجوع.
- **توست قابل للتراجع (Undo)** لإجراءات الأرشفة.
- **اهتزاز خفيف (Haptic)** في التطبيقات عند الإضافة والتأكيد.

### 9.3 النصوص (Microcopy)

| المبدأ | مثال جيد | مثال سيئ |
|---|---|---|
| دافئ ومختصر | "استلمنا طلبك" | "تمت معالجة معاملتك بنجاح" |
| يشرح الأثر | "سيُخصم من المخزون مرة واحدة فقط" | "هل أنت متأكد؟" |
| الخطأ يرشد | "الكمية المتاحة الآن 1 — قلّل الكمية أو أزل السطر" | "خطأ 409" |
| بلا مبالغة تسويقية | "تغليف هدايا أنيق" | "تجربة تسوق لا مثيل لها" |
| ترقيم عربي صحيح | « » ، ؛ ؟ | "" , ; ? |

### 9.4 الأرقام والتنسيق

- المبالغ: `25,000 د.ع` (رقم ثم رمز، بدون كسور).
- أرقام الطلبات و`SKU` بخط أحادي (Mono) لتسهيل القراءة والنسخ.
- الأرقام في الجداول **Tabular** محاذاة للجهة اليسرى من العمود.
- التواريخ ميلادية `DD/MM/YYYY` والوقت 12 ساعة مع ص/م.
- الهاتف بصيغة محلية `0770 123 4567` ويُحفظ دولياً.

### 9.5 الهوية خارج الشاشات

- **أيقونة التطبيق:** زهرة آيريس ذهبية خطية على عنابي ليلي، حواف iOS/Android الافتراضية.
- **Splash:** عنابي ليلي + الشعار + خط تحميل ذهبي رفيع.
- **Favicon:** السوسن الذهبي على دائرة عنابية.
- **صورة المشاركة (OG):** صورة المنتج بإطار مقوّس وشعار صغير.
- **التغليف الرقمي:** رسائل واتساب/بريد بنفس الألوان والنبرة.

---

## 10. إصلاح مشكلات شائعة في Stitch

| المشكلة | البرومبت المقترح للإصلاح |
|---|---|
| **الذهبي أصفر لامع/نيون** | `The gold looks too yellow. Use a muted antique metallic gold (#C9A24B) with softer highlights (#E9D49C) and darker shadow (#8A6620); remove any glow.` |
| **التخطيط LTR رغم العربية** | استخدم **R-04** |
| **ثلاث بطاقات متساوية مملّة** | `Replace the row of three equal cards with an asymmetric layout: one large feature tile plus two smaller staggered tiles, or a horizontal snap rail.` |
| **نص يتراكب على الصورة** | `Remove all text overlapping images. Place text in its own clean zone next to the image; keep captions below the photo.` |
| **الصفحة تصبح مزدحمة** | استخدم **R-01** أو `Reduce this screen to its essential elements, double the whitespace, and group secondary actions into a menu.` |
| **خطوط لاتينية بدل العربية** | `All text must be Arabic and use El Messiri for headings and IBM Plex Sans Arabic for body. Keep only SKUs and order numbers in Latin monospace.` |
| **ألوان بنفسجية/زرقاء غير مرغوبة** | `Remove purple and blue tones. Only burgundy, oxblood, ivory and gold, plus semantic status colors in the admin.` |
| **بيانات عشوائية** | استخدم **R-13** |
| **عدم ثبات الهوية بين الشاشات** | أعد لصق **Master DESIGN.md** ثم `Regenerate this screen strictly following the design system above.` |
| **الصفحة الرئيسية طويلة جداً** | ولّدها على 3 أجزاء (W-01a/b/c) ثم R-15 لعرض حالات التمرير |

---

## 11. بعد أن ترضيك التصاميم: الانتقال إلى التنفيذ

1. **صدّر** الشاشات من Stitch (Figma أو الكود) واحتفظ بملف `DESIGN.md` الذي استخدمته.
2. عند البدء بالبرمجة (مثلاً مع Claude Code) أعطه: **التصاميم + القسم 1 (الهوية) + القسم 3 (مكتبة الحركات) + ملف الخطة**. هذا يعطيه الألوان والحركات والقواعد الوظيفية معاً.
3. **تقنيات مقترحة للحركة** (مقترح يخضع لقرارك التقني): الموقع بـ React/Next.js + Tailwind + **Framer Motion** و**GSAP ScrollTrigger**؛ التطبيقات بـ React Native (Reanimated) أو Flutter.
4. ابدأ بتحويل **نظام التصميم** إلى متغيرات (Design Tokens) في الكود أولاً، ثم المكوّنات المشتركة، ثم الشاشات حسب أولويات الخطة (§111، §117).
5. تذكّر قواعد الخطة التي تظهر في الواجهة: تثبيت الطلب يخصم المخزون **مرة واحدة**، الأرشفة بدل الحذف، لقطات الأسعار التاريخية، إخفاء التكلفة والأرباح عن الموظفة، وإمكانية تفسير كل رقم (Drill-down).
