import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "@/server/security/csp";

describe("CSP", () => {
  it("generates unpredictable base64 nonces", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64")).toHaveLength(16);
  });

  it("locks scripts to the nonce and forbids framing", () => {
    const csp = buildCsp("abc", { isDev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows eval only in development (React debugging)", () => {
    const csp = buildCsp("abc", { isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("adds the media CDN origin to img-src when S3 is configured", () => {
    process.env.S3_PUBLIC_URL = "https://media.example.com/bucket";
    try {
      expect(buildCsp("n", { isDev: false })).toContain(
        "img-src 'self' blob: data: https://media.example.com",
      );
    } finally {
      delete process.env.S3_PUBLIC_URL;
    }
  });
});
