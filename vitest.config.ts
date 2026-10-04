import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The same `@/` root as tsconfig's paths, so a test can check what content/ exports.
  resolve: { alias: { "@/": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    include: ["lib/**/*.test.ts", "scripts/**/*.test.mjs"],
    environment: "node",
  },
});
