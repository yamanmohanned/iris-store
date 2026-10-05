import localFont from "next/font/local";

/**
 * Readex Pro (variable 160–700) — Arabic + Latin, self-hosted (~55 KB total for every weight).
 * Two faces split by unicode-range so each script downloads only when used.
 * To change the store font, swap the two files below (keep the CSS variable names).
 */
export const fontArabic = localFont({
  src: "../../node_modules/@fontsource-variable/readex-pro/files/readex-pro-arabic-wght-normal.woff2",
  weight: "160 700",
  style: "normal",
  variable: "--font-arabic",
  display: "swap",
  // No metric-adjusted fallback here: its local() Arial would swallow Latin glyphs
  // before they reach the Latin face below.
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC",
    },
  ],
});

export const fontLatin = localFont({
  src: "../../node_modules/@fontsource-variable/readex-pro/files/readex-pro-latin-wght-normal.woff2",
  weight: "160 700",
  style: "normal",
  variable: "--font-latin",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

export const fontVariables = `${fontArabic.variable} ${fontLatin.variable}`;
