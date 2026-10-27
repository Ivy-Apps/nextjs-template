import { isServer, QueryClient } from "@tanstack/react-query";

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
    // Above zero, so data prefetched on the server is not refetched on mount.
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
}
