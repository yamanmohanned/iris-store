import { describe, expect, it } from "vitest";
import { sanitizeRichText, stripHtml } from "@/server/security/sanitize";

describe("sanitizeRichText", () => {
  it("removes scripts, event handlers and dangerous URLs", () => {
    const dirty =
      '<p onclick="steal()">Hi<script>alert(1)</script><img src=x onerror=alert(1)></p><a href="javascript:alert(1)">x</a><iframe src="https://evil"></iframe>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:|iframe|<img/i);
    expect(clean).toContain("<p>Hi</p>");
  });

  it("keeps safe formatting and hardens links", () => {
    const clean = sanitizeRichText(
      '<h1>Title</h1><ul><li><strong>Cotton</strong></li></ul><a href="https://x.com">x</a>',
    );
    expect(clean).toContain("<h2>Title</h2>");
    expect(clean).toContain("<strong>Cotton</strong>");
    expect(clean).toContain('rel="noopener noreferrer nofollow"');
    expect(clean).toContain('target="_blank"');
  });

  it("drops style attributes and protocol-relative links", () => {
    const clean = sanitizeRichText('<p style="background:url(x)">a</p><a href="//evil.com">b</a>');
    expect(clean).not.toContain("style");
    expect(clean).not.toContain("evil.com");
  });

  it("strips all markup for plain text", () => {
    expect(stripHtml("<p>قطن <b>100%</b></p>\n<p>ناعم</p>")).toBe("قطن 100% ناعم");
  });
});
