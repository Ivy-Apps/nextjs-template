import { defineConfig, mergeConfig } from "vitest/config";
import { unitProject } from "./vitest.unit";

// The `unit` project alone: Stryker's runner has no project filter, and the
// `storybook` project's browser mode kills its dry run.
export default mergeConfig(
  unitProject,
  defineConfig({
    resolve: { tsconfigPaths: true },
    test: { setupFiles: ["test/stryker.setup.ts"] },
  }),
);
