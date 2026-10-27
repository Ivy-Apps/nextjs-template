import { queryOptions } from "@tanstack/react-query";
import { Effect, type Layer } from "effect";
import type { HttpClient } from "effect/http";
import { currentUser } from "@/data/session/AuthRepository";
import { runQuery } from "@/lib/query/runQuery";

/**
 * The signed-in user's query. The server prefetches it with
 * `SessionHttpClient` and the browser reads it with `ProxyHttpClient`: both
 * share the key, so the browser starts from the server's data.
 */
export function currentUserQuery<E>(
  client: Layer.Layer<HttpClient.HttpClient, E>,
) {
  return queryOptions({
    queryKey: ["auth", "currentUser"],
    queryFn: runQuery(currentUser.pipe(Effect.provide(client))),
  });
}
