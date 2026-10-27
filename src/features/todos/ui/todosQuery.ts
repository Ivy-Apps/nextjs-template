import { queryOptions } from "@tanstack/react-query";
import { Effect, type Layer } from "effect";
import type { HttpClient } from "effect/http";
import {
  myTodos,
  type TodoFailure,
} from "@/features/todos/data/TodoRepository";
import type { TodoList } from "@/features/todos/domain/TodoList";
import { runQuery } from "@/lib/query/runQuery";

/**
 * The signed-in user's todos. The server prefetches them with
 * `SessionHttpClient` and the browser reads them with `ProxyHttpClient`.
 *
 * The backend does not store writes, so the cache is the list's source of
 * truth once loaded: it never goes stale, as a refetch would undo every
 * change the user made.
 */
export function todosQuery<E>(client: Layer.Layer<HttpClient.HttpClient, E>) {
  return queryOptions({
    queryKey: ["todos", "mine"],
    queryFn: runQuery<TodoList, TodoFailure | E>(
      myTodos.pipe(Effect.provide(client)),
    ),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
