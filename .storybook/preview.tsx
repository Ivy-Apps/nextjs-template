import "@/app/globals.css";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { type Locale, NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { messages } from "@/lib/i18n/messages";
import { routing } from "@/lib/i18n/routing";

type Theme = "light" | "dark";

/** Renders every story in the locale the toolbar picks, English by default. */
const withIntl: Decorator = (Story, { globals }) => {
  const locale: Locale = globals.locale ?? routing.defaultLocale;
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <Story />
    </NextIntlClientProvider>
  );
};

/** Renders every story in the theme the toolbar picks, light by default. */
const withTheme: Decorator = (Story, { globals }) => {
  const theme: Theme = globals.theme ?? "light";
  return (
    <ThemeProvider attribute="class" forcedTheme={theme}>
      <Story />
    </ThemeProvider>
  );
};

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true },
    layout: "centered",
  },
  globalTypes: {
    locale: {
      description: "Locale",
      toolbar: {
        icon: "globe",
        items: routing.locales.map((locale) => ({
          value: locale,
          title: locale,
        })),
        dynamicTitle: true,
      },
    },
    theme: {
      description: "Theme",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: routing.defaultLocale, theme: "light" },
  decorators: [withIntl, withTheme],
};

export default preview;
