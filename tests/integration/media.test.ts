import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteMedia, storeImage, toImageDTO } from "@/server/services/media";
import { storageDriver } from "@/server/storage";
import { resetDatabase } from "@tests/support/db";

async function jpeg(width: number, height: number, withExif = false) {
  let img = sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 80, b: 200 } },
  }).jpeg();
  if (withExif) {
    img = img.withExif({ IFD0: { Copyright: "secret-owner", Make: "PhoneCam" } });
  }
  return img.toBuffer();
}

describe("media service", () => {
  beforeEach(resetDatabase);

  it("re-encodes to WebP variants, strips metadata and exposes a responsive srcset", async () => {
    const row = await storeImage(await jpeg(2400, 1600, true), { originalName: "photo.jpg" });
    expect(row.variants.map((v) => v.width)).toEqual([320, 640, 960, 1280, 1920]);
    expect(row.width).toBe(1920);
    expect(row.blurDataUrl).toMatch(/^data:image\/webp;base64,/);

    const stored = await storageDriver("local").read(row.variants[0]!.key);
    const meta = await sharp(stored!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();

    const dto = toImageDTO(row);
    expect(dto.src).toMatch(/^\/media\/\d{4}\/\d{2}\/.+-1920\.webp$/);
    expect(dto.srcSet.split(", ")).toHaveLength(5);
  });

  it("never upscales small images", async () => {
    const row = await storeImage(await jpeg(500, 500));
    expect(row.variants.map((v) => v.width)).toEqual([320, 500]);
  });

  it("rejects files that are not real images whatever their name", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    await expect(storeImage(svg, { originalName: "logo.png" })).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA",
    });
    const html = Buffer.from("<html><body>hi</body></html>");
    await expect(storeImage(html)).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA" });
  });

  it("rejects oversized uploads and empty files", async () => {
    await expect(storeImage(Buffer.alloc(11 * 1024 * 1024))).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
    await expect(storeImage(Buffer.alloc(0))).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deletes files together with the record", async () => {
    const row = await storeImage(await jpeg(400, 300));
    await deleteMedia(row.id);
    expect(await storageDriver("local").read(row.variants[0]!.key)).toBeNull();
  });
});
