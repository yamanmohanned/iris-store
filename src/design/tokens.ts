/**
 * Design tokens — «Imperial Velvet & Gold»
 *
 * استُخرجت من نظام التصميم في مشروع Stitch «Luxury Arabic Design System»
 * (projects/1055627941288859978) بعد توحيد إعدادات Tailwind في كل الشاشات.
 * المرجع الكامل: design/DESIGN.md
 *
 * لونا الهوية المعتمدان: #4E1825 (العنابي الأساسي) و #2A030D (العنابي الليلي الأعمق)،
 * وبقية درجات العنابي مشتقة منهما: deep-oxblood #370A15، burgundy-800 #43121E، burgundy-600 #692032.
 */

/** ألوان النظام (Material 3 roles + ألوان الدار الخاصة) */
export const colors: Record<string, string> = {
  "antique-gold": "#8A6620",
  background: "#fef9f2",
  "blush-surface": "#F7ECEC",
  "burgundy-600": "#692032",
  "burgundy-800": "#43121E",
  "champagne-gold": "#E9D49C",
  "deep-oxblood": "#370A15",
  error: "#ba1a1a",
  "error-container": "#ffdad6",
  "hairline-burgundy": "rgba(78, 24, 37, 0.14)",
  "hairline-gold": "rgba(201, 162, 75, 0.45)",
  "imperial-burgundy": "#4E1825",
  "inverse-on-surface": "#f5f0e9",
  "inverse-primary": "#ffb2b9",
  "inverse-surface": "#32302c",
  "ivory-canvas": "#FBF6EF",
  "muted-rosewood": "#6D585B",
  "on-background": "#1d1c18",
  "on-error": "#ffffff",
  "on-error-container": "#93000a",
  "on-primary": "#ffffff",
  "on-primary-container": "#fb7c8c",
  "on-primary-fixed": "#2A030D",
  "on-primary-fixed-variant": "#692032",
  "on-secondary": "#ffffff",
  "on-secondary-container": "#775800",
  "on-secondary-fixed": "#261a00",
  "on-secondary-fixed-variant": "#5b4300",
  "on-surface": "#1d1c18",
  "on-surface-variant": "#564243",
  "on-tertiary": "#ffffff",
  "on-tertiary-container": "#dc8f9a",
  "on-tertiary-fixed": "#2A030D",
  "on-tertiary-fixed-variant": "#5B2231",
  outline: "#897173",
  "outline-variant": "#dcc0c1",
  parchment: "#F3EADB",
  primary: "#4E1825",
  "primary-container": "#4E1825",
  "primary-fixed": "#ffdadc",
  "primary-fixed-dim": "#ffb2b9",
  "rose-mist": "#EED9DB",
  "royal-gold": "#C9A24B",
  secondary: "#795902",
  "secondary-container": "#fdd275",
  "secondary-fixed": "#ffdf9e",
  "secondary-fixed-dim": "#ebc166",
  "semantic-error": "#B42318",
  "semantic-error-bg": "#FDE7E4",
  "semantic-info": "#2F5A8A",
  "semantic-info-bg": "#E4EDF8",
  "semantic-success": "#1F6B4A",
  "semantic-success-bg": "#E2F2EA",
  "semantic-warning": "#8A4B08",
  "semantic-warning-bg": "#FCEBD0",
  surface: "#fef9f2",
  "surface-bright": "#fef9f2",
  "surface-container": "#f2ede6",
  "surface-container-high": "#ece7e1",
  "surface-container-highest": "#e6e2db",
  "surface-container-low": "#f8f3ec",
  "surface-container-lowest": "#ffffff",
  "surface-dim": "#ded9d3",
  "surface-tint": "#7A2E40",
  "surface-variant": "#e6e2db",
  tertiary: "#43121E",
  "tertiary-container": "#5B2231",
  "tertiary-fixed": "#ffd9dd",
  "tertiary-fixed-dim": "#ffb2bd",
  "warm-ink": "#2A030D",
  "wine-night": "#2A030D",
};

/** انحناءات الزوايا */
export const borderRadius: Record<string, string> = {
  xs: "0.125rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  DEFAULT: "0.25rem",
  full: "9999px",
  lg: "0.5rem",
  xl: "0.75rem",
};

/** مسافات النظام (gutter / margin / space-*) */
export const spacing: Record<string, string> = {
  gutter: "1.5rem",
  "gutter-mobile": "1rem",
  margin: "2.5rem",
  "margin-mobile": "1rem",
  "space-2xl": "4rem",
  "space-3xl": "6rem",
  "space-lg": "1.5rem",
  "space-md": "1rem",
  "space-sm": "0.5rem",
  "space-xl": "2.5rem",
  "space-xs": "0.25rem",
  13: "3.25rem",
  18: "4.5rem",
};

/**
 * عائلات الخطوط — ثلاث عائلات فقط في كل الموقع:
 *  - العناوين: El Messiri
 *  - النصوص والأرقام والأسعار: IBM Plex Sans Arabic (mono/public كانتا خطين لاتينيين مختلفين، وُحّدتا هنا
 *    مع أرقام جدولية من index.css حتى لا يختلف شكل الأرقام بين صفحة وأخرى)
 *  - كلمة IRIS في الشعار: Instrument Serif
 */
const TEXT = ["IBM Plex Sans Arabic", "Segoe UI", "Tahoma", "sans-serif"];
const HEADING = ["El Messiri", "IBM Plex Sans Arabic", "Segoe UI", "Tahoma", "serif"];
const BRAND = ["Instrument Serif", "Georgia", "serif"];

export const fontFamily: Record<string, string[]> = {
  body: TEXT,
  "body-lg": TEXT,
  "body-md": TEXT,
  "body-sm": TEXT,
  "body-xl": TEXT,
  "display-lg": HEADING,
  "display-lg-mobile": HEADING,
  headline: HEADING,
  "headline-lg": HEADING,
  "headline-lg-mobile": HEADING,
  "headline-md": HEADING,
  "headline-sm": HEADING,
  "headline-xl": HEADING,
  "headline-xl-mobile": HEADING,
  "instrument-serif": BRAND,
  "label-lg": TEXT,
  "label-md": TEXT,
  "label-sm": TEXT,
  mono: TEXT,
  public: TEXT,
  sans: TEXT,
  serif: HEADING,
  "serif-brand": BRAND,
};

/** سلم الطباعة */
export const fontSize: Record<string, [string, { lineHeight: string; fontWeight: string }]> = {
  "body-lg": ["1.125rem", { lineHeight: "1.7", fontWeight: "400" }],
  "body-md": ["1rem", { lineHeight: "1.7", fontWeight: "400" }],
  "body-sm": ["0.875rem", { lineHeight: "1.6", fontWeight: "400" }],
  "body-xl": ["1.25rem", { lineHeight: "1.7", fontWeight: "400" }],
  "display-lg": ["3.5rem", { lineHeight: "1.25", fontWeight: "700" }],
  "display-lg-mobile": ["2.25rem", { lineHeight: "1.3", fontWeight: "700" }],
  "headline-lg": ["2rem", { lineHeight: "1.35", fontWeight: "600" }],
  "headline-lg-mobile": ["1.625rem", { lineHeight: "1.35", fontWeight: "600" }],
  "headline-md": ["1.5rem", { lineHeight: "1.4", fontWeight: "600" }],
  "headline-sm": ["1.25rem", { lineHeight: "1.45", fontWeight: "500" }],
  "headline-xl": ["2.5rem", { lineHeight: "1.3", fontWeight: "600" }],
  "headline-xl-mobile": ["1.75rem", { lineHeight: "1.35", fontWeight: "600" }],
  "label-lg": ["0.9375rem", { lineHeight: "1.4", fontWeight: "600" }],
  "label-md": ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
  /* 12px: أصغر حجم مقروء للعربية على الهاتف (كان 11px) */
  "label-sm": ["0.75rem", { lineHeight: "1.45", fontWeight: "500" }],
};

/** ظلال بلون برغندي دافئ (لا رماديات) */
export const boxShadow: Record<string, string> = {
  "gold-glow": "0 0 16px rgba(201, 162, 75, 0.35)",
  luxury: "0 2px 14px -3px rgba(42, 3, 13, 0.05), 0 1px 3px rgba(42, 3, 13, 0.03)",
  "luxury-hover": "0 8px 24px -4px rgba(78, 24, 37, 0.08), 0 2px 6px rgba(42, 3, 13, 0.04)",
  royal: "0 12px 40px -8px rgba(42, 3, 13, 0.08), 0 2px 8px -2px rgba(42, 3, 13, 0.04)",
  subtle: "0 4px 20px -2px rgba(78, 24, 37, 0.05)",
  "2xs": "0 1px 1px rgba(42, 3, 13, 0.04)",
  xs: "0 1px 2px rgba(42, 3, 13, 0.06)",
};
