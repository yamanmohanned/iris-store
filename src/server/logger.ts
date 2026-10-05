import "server-only";
import pino from "pino";

/**
 * Structured logger. Sensitive fields are redacted at any depth listed below —
 * never log raw secrets anyway; redaction is the safety net, not the policy.
 */
const redactPaths = [
  "password",
  "newPassword",
  "currentPassword",
  "otp",
  "code",
  "token",
  "secret",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "*.password",
  "*.newPassword",
  "*.otp",
  "*.code",
  "*.token",
  "*.secret",
  "*.authorization",
  "*.cookie",
  "headers.authorization",
  "headers.cookie",
  'headers["set-cookie"]',
];

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info");

export const logger = pino({
  level,
  base: { app: "iris-store" },
  redact: { paths: redactPaths, censor: "[redacted]" },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === "development" && process.env.LOG_PRETTY !== "false"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }
    : {}),
});

export type Logger = typeof logger;
