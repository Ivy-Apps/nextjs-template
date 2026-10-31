/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",
  plugins: [import.meta.resolve("@stryker-mutator/vitest-runner")],
  vitest: { configFile: "vitest.stryker.config.ts" },
  // TypeScript 7 has no JS API for Stryker's tsconfig rewrite, which crashes.
  // A missing file skips the rewrite; Vitest still reads the real tsconfig.
  // Drop it, and consider the checker plugin, once stryker-js#6110 closes.
  tsconfigFile: "tsconfig.stryker-none.json",
  // Logic only: Views are covered by Storybook and Playwright, which Stryker
  // cannot see.
  mutate: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.d.ts",
    "!src/**/*.types.ts",
    "!src/lib/i18n/messages/**",
    "!src/ui/design-system/**",
  ],
  ignoreStatic: true,
  ignorePatterns: [".next", "e2e", "playwright-report"],
  incremental: true,
  incrementalFile: "reports/stryker-incremental.json",
  // Advisory: a score is reported, never enforced.
  thresholds: { high: 90, low: 80, break: null },
  reporters: ["clear-text", "progress-append-only", "html"],
  clearTextReporter: { reportTests: false, reportMutants: false },
};
