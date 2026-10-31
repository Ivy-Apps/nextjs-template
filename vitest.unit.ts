import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** The `unit` project, shared by `vitest.config.ts` and `vitest.stryker.config.ts`. */
export const unitProject = defineConfig({
  plugins: [react()],
  test: {
    name: "unit",
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    // next-intl imports `next/server` without an extension, which
    // Node's ESM resolver rejects; let Vite resolve it instead.
    server: { deps: { inline: ["next-intl"] } },
  },
});
