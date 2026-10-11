# Design System: IRIS (آيريس) — Luxury Accessories Boutique & Management Platform
Language & direction: Arabic first. ALL UI copy in Arabic. Full RTL mirroring (navigation, grids, icons, progress direction, carousels start from the right). Latin digits 0-9 for prices, phones, order numbers. Currency format: "25,000 د.ع" (number then Iraqi Dinar symbol), no decimals.
## 1. Visual Theme & Atmosphere
A jewelry boutique after dark: warm ivory pages punctuated by deep burgundy "velvet" sections, finished with hairline gold details like hand-engraved metalwork. Calm, confident, editorial and expensive-feeling — never flashy. Storefront: Density 4 (airy), Variance 7 (asymmetric, offset layouts), Motion 6 (fluid, spring-based). Admin & staff app: Density 6 (efficient but breathable), Variance 3 (orderly), Motion 4 (restrained).
## 2. Color Palette & Roles
Brand colors (owner request): **#4E1825** (primary burgundy) and **#2A030D** (deepest night burgundy). The intermediate burgundies below are derived from these two. Logo: `public/brand/iris-mark.png` (from «Vector Smart Object»), rendered as a CSS mask in any color via `BrandMark`.
- Wine Night (#2A030D) — deepest surface: footer, dark sections, admin sidebar
- Deep Oxblood (#370A15) — announcement bar, secondary dark surfaces
- Burgundy 800 (#43121E) — strong burgundy panels, dark hero
- Imperial Burgundy (#4E1825) — PRIMARY brand color: primary buttons, links, active states
- Burgundy 600 (#692032) — hover / pressed state of primary
- Rose Mist (#EED9DB) — soft borders, tag backgrounds
- Blush Surface (#F7ECEC) — light secondary surface
- Ivory Canvas (#FBF6EF) — main page background
- Parchment (#F3EADB) — alternate warm section background
- Warm Ink (#2A030D) — primary text (never pure black)
- Muted Rosewood (#6D585B) — secondary text
- Royal Gold (#C9A24B) — the SINGLE accent: hairlines, icons, premium buttons, ornaments. NEVER use for body text on light backgrounds.
- Champagne Gold (#E9D49C) — gold text/icons on burgundy or dark surfaces
- Antique Gold (#8A6620) — gold TEXT on light surfaces
- Gold Foil Gradient (135deg: #8F6B1F, #E6C871, #C9A24B, #F3E2A9, #A67C2E) — metallic sheen on key buttons and large rules only
- Hairline Gold rgba(201,162,75,0.45) and Hairline Burgundy rgba(78,24,37,0.14) — 1px borders
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
- Cards: radius 20px, white or ivory fill, 1px Hairline Burgundy border, soft burgundy-tinted shadow (rgba(42,3,13,0.12)), used only where elevation communicates hierarchy. Dense areas use top-border dividers instead of cards.
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