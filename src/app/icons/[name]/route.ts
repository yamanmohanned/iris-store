import sharp from "sharp";
import { brandMarkSvg } from "@/server/brand-mark";
import { getSettings } from "@/server/services/settings";

const PNG_SIZES: Record<string, { size: number; padded: boolean }> = {
  "192.png": { size: 192, padded: false },
  "512.png": { size: 512, padded: false },
  "maskable-512.png": { size: 512, padded: true },
  "apple-180.png": { size: 180, padded: true },
};

/** Favicon & home-screen icons generated from the brand color (cached for a day). */
export async function GET(_req: Request, { params }: RouteContext<"/icons/[name]">) {
  const { name } = await params;
  const color = (await getSettings()).branding.primaryColor;
  const headers = {
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "X-Content-Type-Options": "nosniff",
  };
  if (name === "mark.svg") {
    return new Response(brandMarkSvg(color, { size: 64 }), {
      headers: { ...headers, "Content-Type": "image/svg+xml" },
    });
  }
  const spec = PNG_SIZES[name];
  if (!spec) return new Response("Not found", { status: 404 });
  const png = await sharp(
    Buffer.from(brandMarkSvg(color, { size: spec.size, padded: spec.padded })),
  )
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { ...headers, "Content-Type": "image/png" },
  });
}
