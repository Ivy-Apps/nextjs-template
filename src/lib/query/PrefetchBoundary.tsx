import {
  dehydrate,
  HydrationBoundary,
  type QueryClient,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getQueryClient } from "@/lib/query/queryClient";

type PrefetchBoundaryProps = {
  prefetch: (queryClient: QueryClient) => Promise<void>;
  children: ReactNode;
};

/**
 * Server component: runs `prefetch` on a request-scoped client and hands the
 * cache to the client components below, so they render the data on first
 * paint instead of a loading state.
 */
export async function PrefetchBoundary({
  prefetch,
  children,
}: PrefetchBoundaryProps) {
  const queryClient = getQueryClient();
  await prefetch(queryClient);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
