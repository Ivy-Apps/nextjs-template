import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    // next-intl imports `next/server` without an extension, which Node's ESM
    // resolver rejects; let Vite resolve it instead.
    server: { deps: { inline: ["next-intl"] } },
  },
});
