import "server-only";

/**
 * Default store mark: a petal in the brand color with a pollen dot — used for the favicon and
 * phone home-screen icons until the owner uploads a logo.
 */
export function brandMarkSvg(
  primary: string,
  opts: { size?: number; padded?: boolean } = {},
): string {
  const size = opts.size ?? 512;
  // Maskable icons need the art inside the central 80% "safe zone".
  const inset = opts.padded ? 0.18 : 0.06;
  const s = (v: number) => (inset + v * (1 - 2 * inset)) * 64;
  const path = `M${s(0.5)} ${s(0)} C${s(0.78)} ${s(0)} ${s(1)} ${s(0.22)} ${s(1)} ${s(0.5)} C${s(1)} ${s(0.78)} ${s(0.78)} ${s(1)} ${s(0.5)} ${s(1)} L${s(0.12)} ${s(1)} C${s(0.05)} ${s(1)} ${s(0)} ${s(0.95)} ${s(0)} ${s(0.88)} L${s(0)} ${s(0.5)} C${s(0)} ${s(0.22)} ${s(0.22)} ${s(0)} ${s(0.5)} ${s(0)} Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${
    opts.padded ? `<rect width="64" height="64" fill="#ffffff"/>` : ""
  }<path d="${path}" fill="${primary}"/><circle cx="${s(0.66)}" cy="${s(0.36)}" r="${(1 - 2 * inset) * 64 * 0.1}" fill="#f3c340"/></svg>`;
}
