import { afterEach, describe, expect, it } from "vitest";
import { env, resetEnvCache } from "@/server/env";

const snapshot = { ...process.env };

afterEach(() => {
  process.env = { ...snapshot };
  resetEnvCache();
});

describe("env()", () => {
  it("parses a valid configuration with defaults", () => {
    const e = env();
    expect(e.EMAIL_DRIVER).toBe("console");
    expect(e.STORAGE_DRIVER).toBe("local");
    expect(e.TRUSTED_PROXY_COUNT).toBe(1);
  });

  it("rejects a short AUTH_SECRET with a readable message", () => {
    process.env.AUTH_SECRET = "too-short";
    resetEnvCache();
    expect(() => env()).toThrow(/AUTH_SECRET/);
  });

  it("requires SMTP_HOST when the SMTP driver is selected", () => {
    process.env.EMAIL_DRIVER = "smtp";
    resetEnvCache();
    expect(() => env()).toThrow(/SMTP_HOST/);
  });

  it("requires https APP_URL in production (except localhost)", () => {
    Object.assign(process.env, { NODE_ENV: "production", APP_URL: "http://shop.example.com" });
    resetEnvCache();
    expect(() => env()).toThrow(/APP_URL/);
  });

  it("requires Turnstile keys to be configured together", () => {
    process.env.TURNSTILE_SITE_KEY = "site";
    resetEnvCache();
    expect(() => env()).toThrow(/TURNSTILE/);
  });
});
