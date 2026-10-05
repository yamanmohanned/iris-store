import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

const shared = {
  // next-intl imports "next/navigation" without an extension; let Vite resolve it.
  server: { deps: { inline: ["next-intl"] } },
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "@tests": path.join(root, "tests"),
      // Server-only guards are irrelevant outside the Next.js bundler.
      "server-only": path.join(root, "tests/support/empty.ts"),
    },
  },
};

export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/support/unit-setup.ts"],
        },
      },
      {
        ...shared,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/support/integration-global-setup.ts"],
          setupFiles: ["tests/support/integration-setup.ts"],
          // One shared database: run files sequentially to keep data isolation simple.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
