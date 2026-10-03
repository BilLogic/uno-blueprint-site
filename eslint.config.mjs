import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
      // The export is static with unoptimised images, and next/image adds an
      // inline style attribute that the content security policy refuses.
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["scripts/**", "e2e/**", "*.config.*"],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "node_modules/**",
    "reference/**",
    "playwright-report/**",
    "test-results/**",
    ".lighthouseci/**",
    ".netlify/**",
    "next-env.d.ts",
  ]),
]);
