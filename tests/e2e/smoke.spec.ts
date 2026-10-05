import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("Arabic is the default locale and renders right-to-left", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("English is served under /en and renders left-to-right", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("security headers are present on HTML pages", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("'strict-dynamic'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("unknown pages return 404 with a way home", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link", { name: "العودة إلى الرئيسية" })).toBeVisible();
  });

  test("no console errors on the home page (CSP violations would show here)", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("no Content-Security-Policy violations on the main shopping pages", async ({ page }) => {
    // Catches inline scripts without the nonce and libraries that probe eval() (e.g. zod's JIT
    // check) — such code must stay out of the browser bundle.
    await page.addInitScript(() => {
      (window as unknown as { __csp: string[] }).__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        (window as unknown as { __csp: string[] }).__csp.push(
          `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`,
        );
      });
    });
    for (const path of [
      "/",
      "/c/women",
      "/search?q=فستان",
      "/categories",
      "/cart",
      "/track",
      "/login",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const violations = await page.evaluate(
        () => (window as unknown as { __csp: string[] }).__csp,
      );
      expect(violations, path).toEqual([]);
    }
  });
});
