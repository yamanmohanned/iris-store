import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Physical-direction Tailwind utilities break right-to-left layouts.
const PHYSICAL_CLASSES =
  "/(^|\\s)(ml|mr|pl|pr|left|right|scroll-m[lr]|scroll-p[lr])-|(^|\\s)(text-(left|right)|rounded-[tb]?[lr]|border-[lr])(\\s|$|-)/";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Keep RTL-safe styling: physical left/right utilities break Arabic layouts.
      "no-restricted-syntax": [
        "warn",
        ...[
          "JSXAttribute[name.name='className'] Literal",
          "JSXAttribute[name.name='className'] TemplateElement",
          "CallExpression[callee.name=/^(cn|cva)$/] Literal",
        ].map((scope) => ({
          selector: `${scope}[${scope.endsWith("TemplateElement") ? "value.raw" : "value"}=${PHYSICAL_CLASSES}]`,
          message:
            "Use logical utilities (ms-/me-/ps-/pe-/start-/end-/text-start/text-end) for RTL support.",
        })),
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["warn", { fixStyle: "inline-type-imports" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["scripts/**", "tests/**", "src/server/db/seed.ts", "src/server/db/migrate.ts"],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "drizzle/**",
    "design/**",
    ".data/**",
    "storage/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
  ]),
]);
