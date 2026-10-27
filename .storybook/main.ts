import type { StorybookConfig } from "@storybook/nextjs-vite";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  framework: { name: "@storybook/nextjs-vite", options: {} },
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-vitest"],
  core: { disableTelemetry: true },
  // Next compiles Tailwind with @tailwindcss/turbopack; Vite needs its own
  // plugin to compile the same globals.css.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
  }),
};

export default config;
