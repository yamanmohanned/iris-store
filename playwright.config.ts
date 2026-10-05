import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// Use a pre-installed Chromium when available (e.g. cloud dev containers).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ar-IQ",
    launchOptions: { executablePath },
  },
  projects: [
    // Mobile first: the primary target is a phone-sized viewport.
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Run against a production build (`pnpm build` first) for realistic behaviour.
        command: `pnpm start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { E2E: "1" },
      },
});
