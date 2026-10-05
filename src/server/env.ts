import "server-only";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.url().default("http://localhost:3000"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    SETUP_TOKEN: optionalString.pipe(z.string().min(24).optional()),
    CRON_SECRET: optionalString.pipe(z.string().min(24).optional()),

    EMAIL_DRIVER: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("Iris Store <no-reply@localhost>"),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    SMTP_SECURE: bool,
    RESEND_API_KEY: optionalString,

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./storage"),
    S3_ENDPOINT: optionalString,
    S3_REGION: z.string().default("auto"),
    S3_BUCKET: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_PUBLIC_URL: optionalString,

    TURNSTILE_SITE_KEY: optionalString,
    TURNSTILE_SECRET_KEY: optionalString,
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    PWNED_PASSWORDS_CHECK: bool,

    /** Which request header carries the real client IP, and how many trusted proxies append to it. */
    CLIENT_IP_HEADER: z
      .enum(["x-forwarded-for", "x-real-ip", "cf-connecting-ip", "none"])
      .default("x-forwarded-for"),
    TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).max(5).default(1),

    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_DRIVER === "smtp" && !env.SMTP_HOST) {
      ctx.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "required when EMAIL_DRIVER=smtp",
      });
    }
    if (env.EMAIL_DRIVER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "required when EMAIL_DRIVER=resend",
      });
    }
    if (env.STORAGE_DRIVER === "s3") {
      for (const key of [
        "S3_BUCKET",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "S3_PUBLIC_URL",
      ] as const) {
        if (!env[key])
          ctx.addIssue({ code: "custom", path: [key], message: "required when STORAGE_DRIVER=s3" });
      }
    }
    if (
      env.NODE_ENV === "production" &&
      !env.APP_URL.startsWith("https://") &&
      !isLocalUrl(env.APP_URL)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "must use https:// in production",
      });
    }
    if (Boolean(env.TURNSTILE_SITE_KEY) !== Boolean(env.TURNSTILE_SECRET_KEY)) {
      ctx.addIssue({
        code: "custom",
        path: ["TURNSTILE_SECRET_KEY"],
        message: "TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must be set together",
      });
    }
  });

function isLocalUrl(url: string) {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/**
 * Validated environment. Parsed lazily so `next build` works without runtime secrets;
 * the first request that needs configuration fails fast with a readable message.
 */
export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}\nSee .env.example`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: forget the cached env so tests can change process.env. */
export function resetEnvCache() {
  cached = undefined;
}

export const isProduction = () => env().NODE_ENV === "production";
