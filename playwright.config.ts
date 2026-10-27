import { defineConfig, devices } from "@playwright/test";

const port = 3077;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // The production build `just build` made, so e2e tests what ships.
    command: `pnpm start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
