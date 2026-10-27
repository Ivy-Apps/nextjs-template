import { defineConfig, devices } from "@playwright/test";
import { FAKE_BACKEND_PORT } from "./e2e/fakeBackendServer";

const port = 3077;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A fake DummyJSON, so runs are deterministic and need no network.
  globalSetup: "./e2e/fakeBackendServer.ts",
  webServer: {
    // The production build `just build` made, so e2e tests what ships.
    command: `pnpm start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    // BE_URL is read per request, so the production build picks it up.
    env: { BE_URL: `http://localhost:${FAKE_BACKEND_PORT}` },
  },
});
