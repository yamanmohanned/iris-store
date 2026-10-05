/** Pick black or white text for a background color (WCAG relative luminance). */
export function readableForeground(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1]!, 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L =
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255);
  // Contrast with white vs. with near-black: choose the larger.
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.06 ? "#ffffff" : "#17161d";
}
