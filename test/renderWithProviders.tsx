import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { messages } from "@/lib/i18n/messages";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

/** Renders `ui` inside the app's client providers, in English. */
export function renderWithProviders(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages.en}>
      <ThemeProvider>{ui}</ThemeProvider>
    </NextIntlClientProvider>,
  );
}
