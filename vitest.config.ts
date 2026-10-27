import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
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
      },
      {
        extends: true,
        // Renders every story in .storybook/main.ts and fails on a render
        // error or a failing play function.
        plugins: [storybookTest({ configDir: ".storybook" })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            // The Chromium nixpkgs builds, from PLAYWRIGHT_BROWSERS_PATH.
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
