import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { messages } from "@/lib/i18n/messages";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

/** Renders `ui` inside the app's client providers, in English. */
export function renderWithProviders(
  ui: ReactElement,
  queryClient = testQueryClient(),
) {
  return render(ui, { wrapper: providers(queryClient) });
}

/** Runs `hook` inside the app's client providers, in English. */
export function renderHookWithProviders<Result>(
  hook: () => Result,
  queryClient = testQueryClient(),
) {
  return renderHook(hook, { wrapper: providers(queryClient) });
}

/** A fresh cache per test that fails fast instead of retrying. */
export function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
}

/**
 * The browser's cache after `PrefetchBoundary` ran `prefetch` on the server:
 * a fresh cache hydrated from the server's.
 */
export async function prefetchedQueryClient(
  prefetch: (queryClient: QueryClient) => Promise<void>,
): Promise<QueryClient> {
  const server = testQueryClient();
  await prefetch(server);
  const browser = testQueryClient();
  hydrate(browser, dehydrate(server));
  return browser;
}

function providers(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <Providers queryClient={queryClient}>{children}</Providers>
  );
}

function Providers({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale="en" messages={messages.en}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
