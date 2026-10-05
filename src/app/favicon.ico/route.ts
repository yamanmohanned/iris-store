import sharp from "sharp";
import { brandMarkSvg } from "@/server/brand-mark";
import { getSettings } from "@/server/services/settings";

// Built per request: depends on runtime settings/data (never baked in at build time).
export const dynamic = "force-dynamic";

/** Legacy /favicon.ico requests get the brand mark as a 48px PNG (browsers accept PNG here). */
export async function GET() {
  const color = (await getSettings()).branding.primaryColor;
  const png = await sharp(Buffer.from(brandMarkSvg(color, { size: 48 })))
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
