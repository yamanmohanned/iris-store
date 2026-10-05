const HEX = /^#?([0-9a-f]{6})$/i;

/** WCAG relative luminance of a #rrggbb color (null when the value is not a hex color). */
export function relativeLuminance(hex: string): number | null {
  const m = HEX.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a) ?? 0;
  const lb = relativeLuminance(b) ?? 1;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick black or white text for a background color (WCAG relative luminance). */
export function readableForeground(hex: string): string {
  const L = relativeLuminance(hex);
  if (L === null) return "#ffffff";
  // Contrast with white vs. with near-black: choose the larger.
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.06 ? "#ffffff" : "#17161d";
}
