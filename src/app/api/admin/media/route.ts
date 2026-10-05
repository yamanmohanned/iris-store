import { assertStaff } from "@/server/auth/session";
import { env } from "@/server/env";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { MAX_UPLOAD_BYTES, storeImage, toImageDTO } from "@/server/services/media";

/** Multipart overhead allowance on top of the image itself. */
const MAX_BODY = MAX_UPLOAD_BYTES + 64 * 1024;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Image upload for the dashboard (products, categories, banners). A route handler instead of a
 * Server Action because phone photos exceed the action body limit. Protected like an action:
 * same-origin only (CSRF), staff with catalog or content rights, per-user rate limit; the file
 * itself is sniffed, size-capped and re-encoded by `storeImage` (EXIF/GPS removed).
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== new URL(env().APP_URL).origin) || (site && site !== "same-origin"))
    return json({ error: "forbidden" }, 403);

  try {
    let staff;
    try {
      staff = await assertStaff("products:write");
    } catch (error) {
      if (isAppError(error) && error.code === "FORBIDDEN")
        staff = await assertStaff("content:write");
      else throw error;
    }
    const { actor } = staff;
    await enforceRateLimit(`media:upload:${actor.id}`, 200, 3600);

    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY)
      return json({ error: "too_large" }, 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "no_file" }, 400);
    if (file.size > MAX_UPLOAD_BYTES) return json({ error: "too_large" }, 413);

    const record = await storeImage(Buffer.from(await file.arrayBuffer()), {
      originalName: file.name.slice(0, 200),
      createdBy: actor.id,
    });
    return json(toImageDTO(record), 201);
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "FORBIDDEN"
            ? 403
            : error.code === "RATE_LIMITED"
              ? 429
              : error.code === "PAYLOAD_TOO_LARGE"
                ? 413
                : error.code === "UNSUPPORTED_MEDIA"
                  ? 415
                  : 400;
      return json({ error: error.code.toLowerCase() }, status);
    }
    logger.error({ err: error }, "admin media upload failed");
    return json({ error: "internal" }, 500);
  }
}
