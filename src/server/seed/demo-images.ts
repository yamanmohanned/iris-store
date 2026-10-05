import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Generates tasteful, text-free placeholder photos for the demo catalog (no network needed):
 * a soft two-tone gradient, a pedestal shape and a large line icon.
 */
async function iconInner(icon: string): Promise<string> {
  const file = path.join(process.cwd(), "node_modules/lucide-static/icons", `${icon}.svg`);
  const svg = await readFile(file, "utf8");
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

export async function demoImage(opts: {
  icon: string;
  hue: number;
  width?: number;
  height?: number;
  shift?: number;
}): Promise<Buffer> {
  const { icon, hue, width = 1200, height = 1500, shift = 0 } = opts;
  const h2 = (hue + 28 + shift) % 360;
  const inner = await iconInner(icon);
  const iconSize = Math.min(width, height) * 0.46;
  const scale = iconSize / 24;
  const cx = width / 2;
  const cy = height * 0.47;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 70% 96%)"/>
      <stop offset="1" stop-color="hsl(${h2} 60% 88%)"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.5">
      <stop offset="0" stop-color="hsl(${hue} 90% 99%)" stop-opacity="0.95"/>
      <stop offset="1" stop-color="hsl(${hue} 90% 99%)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="${width * 0.82}" cy="${height * 0.14}" r="${width * 0.22}" fill="hsl(${h2} 70% 92%)" opacity="0.7"/>
  <circle cx="${width * 0.12}" cy="${height * 0.86}" r="${width * 0.3}" fill="hsl(${hue} 70% 93%)" opacity="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${iconSize * 0.95}" fill="url(#glow)"/>
  <ellipse cx="${cx}" cy="${cy + iconSize * 0.62}" rx="${iconSize * 0.48}" ry="${iconSize * 0.07}" fill="hsl(${hue} 35% 40%)" opacity="0.12"/>
  <g transform="translate(${cx - iconSize / 2} ${cy - iconSize / 2}) scale(${scale})"
     fill="none" stroke="hsl(${hue} 45% 32%)" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">
    ${inner}
  </g>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}
