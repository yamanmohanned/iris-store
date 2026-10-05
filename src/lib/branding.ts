import { readableForeground } from "./color";

/** Corner styles owners can pick (Branding settings). */
export const RADIUS_VALUES = { sharp: "0.375rem", soft: "0.875rem", round: "1.25rem" } as const;
export type RadiusStyle = keyof typeof RADIUS_VALUES;

/**
 * Curated brand colors: each keeps at least 4.5:1 contrast with white, so prices, links and
 * buttons stay readable whichever one the owner picks.
 */
export const BRAND_COLOR_PRESETS = [
  "#3d2c8d",
  "#1d4ed8",
  "#0f766e",
  "#166534",
  "#b4235a",
  "#c2410c",
  "#7c2d12",
  "#111827",
] as const;

/** CSS variables for one brand (the whole palette derives from the primary color). */
export function brandVariables(primary: string, radius: RadiusStyle): Record<string, string> {
  return {
    "--primary": primary,
    "--primary-foreground": readableForeground(primary),
    "--primary-soft": `color-mix(in oklch, ${primary} 9%, white)`,
    "--primary-strong": `color-mix(in oklch, ${primary} 84%, black)`,
    "--ring": `color-mix(in oklch, ${primary} 55%, transparent)`,
    "--radius": RADIUS_VALUES[radius],
  };
}
