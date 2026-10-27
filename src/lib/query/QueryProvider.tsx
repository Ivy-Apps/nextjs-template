"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { SessionExpired } from "@/data/session/AuthRepository";
import { useRouter } from "@/lib/i18n/navigation";
import { getQueryClient } from "@/lib/query/queryClient";
import { LOGIN_PATH, RETURN_PATH_PARAM } from "@/types/ReturnPath";

type QueryProviderProps = {
  children: ReactNode;
  /** The browser's client by default. */
  client?: QueryClient;
};

/**
 * Provides the query client. A query or mutation that finds the session
 * ended goes to the login page, which returns here after the login. The cache
 * stays until the login drops it: clearing it here would refetch the queries
 * still on screen, which would fail the same way.
 */
export function QueryProvider({
  children,
  client = getQueryClient(),
}: QueryProviderProps) {
  useLoginWhenSessionEnds(client);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function useLoginWhenSessionEnds(client: QueryClient): void {
  const router = useRouter();
  useEffect(() => {
    const onError = (error: unknown) => {
      if (!(error instanceof SessionExpired)) return;
      router.replace({
        pathname: LOGIN_PATH,
        query: {
          [RETURN_PATH_PARAM]:
            window.location.pathname + window.location.search,
        },
      });
    };
    const unsubscribeQueries = client.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        onError(event.action.error);
      }
    });
    const unsubscribeMutations = client
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error") {
          onError(event.action.error);
        }
      });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [client, router]);
}
