import { Effect } from "effect";

/**
 * Turns an Effect into a TanStack Query `queryFn`. The query's AbortSignal
 * interrupts the Effect; a failure rejects with the Effect's error.
 */
export function runQuery<A, E>(
  effect: Effect.Effect<A, E>,
): (context: { signal: AbortSignal }) => Promise<A> {
  return ({ signal }) => Effect.runPromise(effect, { signal });
}
