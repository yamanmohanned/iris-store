export type AppErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "OUT_OF_STOCK"
  | "INVALID_COUPON"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA"
  | "INTERNAL";

/**
 * Expected, user-facing failure. `code` maps to a translated message on the client;
 * `message` is for logs/developers only and is never shown verbatim to customers.
 */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message ?? code);
    this.name = "AppError";
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

/** Postgres unique-constraint violation (drizzle wraps the driver error in `cause`). */
export function isUniqueViolation(error: unknown): boolean {
  let e: unknown = error;
  for (let depth = 0; e && depth < 4; depth++) {
    if ((e as { code?: unknown }).code === "23505") return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}
