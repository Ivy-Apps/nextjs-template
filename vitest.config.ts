import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { unitProject } from "./vitest.unit";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      { extends: true, ...unitProject },
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
