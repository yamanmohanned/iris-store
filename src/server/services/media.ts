import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import sharp, { type Metadata } from "sharp";
import type { LocalizedText } from "@/lib/localized";
import { db } from "@/server/db/client";
import { media, type MediaVariant } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { storageDriver, type StorageDriverName } from "@/server/storage";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Decompression-bomb guard (~40 MP, e.g. 7300×5500). */
const MAX_INPUT_PIXELS = 40_000_000;
export const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920] as const;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export type MediaRecord = typeof media.$inferSelect;

/** Serializable image description for rendering responsive <img> tags. */
export type ImageDTO = {
  id: string;
  src: string;
  srcSet: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
  alt: LocalizedText | null;
};

function newKey() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}/${month}/${randomBytes(12).toString("base64url")}`;
}

/**
 * Validate, re-encode and store an uploaded image.
 * - real type sniffed from magic bytes (the client-sent MIME type is ignored)
 * - EXIF orientation applied, ALL metadata (GPS, camera…) stripped by re-encoding
 * - WebP variants at several widths for responsive loading on phones
 */
export async function storeImage(
  input: Buffer,
  opts: { originalName?: string; createdBy?: string | null; alt?: LocalizedText } = {},
): Promise<MediaRecord> {
  if (input.length === 0) throw new AppError("BAD_REQUEST", "empty file");
  if (input.length > MAX_UPLOAD_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "image too large");

  const type = await fileTypeFromBuffer(input);
  if (!type || !ACCEPTED.has(type.mime)) {
    throw new AppError("UNSUPPORTED_MEDIA", `unsupported image type: ${type?.mime ?? "unknown"}`);
  }

  const pipeline = () =>
    sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error", animated: false });
  let meta: Metadata;
  try {
    meta = await pipeline().metadata();
  } catch {
    throw new AppError("UNSUPPORTED_MEDIA", "corrupted or oversized image");
  }
  if (!meta.width || !meta.height) throw new AppError("UNSUPPORTED_MEDIA", "unknown dimensions");
  // EXIF orientations 5-8 rotate by 90°, swapping width and height.
  const rotated = (meta.orientation ?? 1) >= 5;
  const srcWidth = rotated ? meta.height : meta.width;

  const maxWidth = IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]!;
  const widths: number[] = IMAGE_WIDTHS.filter((w) => w < srcWidth);
  widths.push(Math.min(srcWidth, maxWidth));
  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);

  const key = newKey();
  const storage = storageDriver();
  const variants: MediaVariant[] = [];
  try {
    for (const width of uniqueWidths) {
      const { data, info } = await pipeline()
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      const variantKey = `${key}-${width}.webp`;
      await storage.put(variantKey, data, "image/webp");
      variants.push({ width: info.width, height: info.height, key: variantKey, bytes: info.size });
    }

    const blur = await pipeline().rotate().resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
    const largest = variants[variants.length - 1]!;
    const [row] = await db
      .insert(media)
      .values({
        storageDriver: storage.name,
        key,
        mimeType: "image/webp",
        originalName: opts.originalName?.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || null,
        width: largest.width,
        height: largest.height,
        bytes: variants.reduce((sum, v) => sum + v.bytes, 0),
        variants,
        blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
        alt: opts.alt ?? null,
        createdBy: opts.createdBy ?? null,
      })
      .returning();
    return row!;
  } catch (error) {
    // Don't leave orphaned files behind if anything after the first upload fails.
    await Promise.allSettled(variants.map((v) => storage.delete(v.key)));
    throw error;
  }
}

/** Delete an image and its files. Fails (FK) if a product still uses it. */
export async function deleteMedia(id: string) {
  const [row] = await db.delete(media).where(eq(media.id, id)).returning();
  if (!row) return;
  const storage = storageDriver(row.storageDriver as StorageDriverName);
  const results = await Promise.allSettled(row.variants.map((v) => storage.delete(v.key)));
  for (const r of results)
    if (r.status === "rejected") logger.warn({ err: r.reason, id }, "media file delete failed");
}

export function toImageDTO(
  row: Pick<
    MediaRecord,
    "id" | "storageDriver" | "variants" | "width" | "height" | "blurDataUrl" | "alt"
  >,
): ImageDTO {
  const storage = storageDriver(row.storageDriver as StorageDriverName);
  const variants = [...row.variants].sort((a, b) => a.width - b.width);
  const largest = variants[variants.length - 1];
  return {
    id: row.id,
    src: largest ? storage.publicUrl(largest.key) : "",
    srcSet: variants.map((v) => `${storage.publicUrl(v.key)} ${v.width}w`).join(", "),
    width: row.width,
    height: row.height,
    blurDataUrl: row.blurDataUrl,
    alt: row.alt ?? null,
  };
}
