import { MEDIA_KEY_PATTERN, storageDriver } from "@/server/storage";

/**
 * Serves locally stored product images (STORAGE_DRIVER=local). Keys are random and immutable,
 * so responses are cached for a year. With S3 storage, images are served by the bucket/CDN.
 */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...key]">) {
  const key = (await params).key.join("/");
  if (!MEDIA_KEY_PATTERN.test(key)) return new Response("Not found", { status: 404 });

  const file = await storageDriver("local").read(key);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(file.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Cross-Origin-Resource-Policy": "same-site",
    },
  });
}
