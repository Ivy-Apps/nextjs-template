import { isServer, QueryClient } from "@tanstack/react-query";
import { SessionExpired } from "@/data/session/AuthRepository";

let browserQueryClient: QueryClient | undefined;

/**
 * A fresh client per server request, so users never share a cache; one
 * client for the whole browser session.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Above zero, so data prefetched on the server is not refetched on mount.
        staleTime: 60_000,
        // An ended session stays ended: go to login at once instead.
        retry: (failures, error) =>
          !(error instanceof SessionExpired) && failures < 3,
      },
    },
  });
}
