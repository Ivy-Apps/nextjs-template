import { Effect, Schema } from "effect";
import {
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import {
  BackendFailure,
  currentUser,
  SessionExpired,
} from "@/data/session/AuthRepository";
import {
  SavedTodo,
  type TodoId,
  type TodoTitle,
} from "@/features/todos/data/Todo";

/*
 * The signed-in user's todos on the backend. Run it with an HttpClient that
 * carries the session: `SessionHttpClient` on the server, `ProxyHttpClient` in
 * the browser. The backend acknowledges writes but does not store them.
 */

export type TodoFailure = SessionExpired | BackendFailure;

/** Every todo of the signed-in user, in the backend's order. */
export const myTodos: Effect.Effect<
  ReadonlyArray<SavedTodo>,
  TodoFailure,
  HttpClient.HttpClient
> = currentUser.pipe(
  Effect.flatMap((user) =>
    // `limit=0` asks for every todo instead of the first page.
    HttpClient.get(`/auth/todos/user/${user.id}`, {
      urlParams: { limit: 0 },
    }).pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(TodoPage)),
      Effect.map((page) => page.todos),
      Effect.mapError(todoFailure),
    ),
  ),
);

/** Creates a todo for the signed-in user, not yet done. */
export function addTodo(
  title: TodoTitle,
): Effect.Effect<void, TodoFailure, HttpClient.HttpClient> {
  return currentUser.pipe(
    Effect.flatMap((user) =>
      send(
        HttpClientRequest.post("/auth/todos/add").pipe(
          HttpClientRequest.bodyJsonUnsafe({
            todo: title,
            completed: false,
            userId: user.id,
          }),
        ),
      ),
    ),
  );
}

export function setCompleted(
  id: TodoId,
  completed: boolean,
): Effect.Effect<void, TodoFailure, HttpClient.HttpClient> {
  return send(
    HttpClientRequest.put(`/auth/todos/${id}`).pipe(
      HttpClientRequest.bodyJsonUnsafe({ completed }),
    ),
  );
}

export function deleteTodo(
  id: TodoId,
): Effect.Effect<void, TodoFailure, HttpClient.HttpClient> {
  return send(HttpClientRequest.delete(`/auth/todos/${id}`));
}

/** DummyJSON's page of todos; the paging fields are not needed. */
const TodoPage = Schema.Struct({ todos: Schema.Array(SavedTodo) });

/** The backend echoes a write with values it does not store: ignore them. */
function send(
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<void, TodoFailure, HttpClient.HttpClient> {
  return HttpClient.execute(request).pipe(
    Effect.asVoid,
    Effect.mapError(todoFailure),
  );
}

/**
 * A 401 means the session ended; every other failure (transport, another
 * status, a body of the wrong shape) is a BackendFailure.
 */
function todoFailure(
  error: HttpClientError.HttpClientError | Schema.SchemaError,
): TodoFailure {
  return error._tag === "HttpClientError" &&
    error.reason._tag === "StatusCodeError" &&
    error.reason.response.status === 401
    ? new SessionExpired()
    : new BackendFailure({ cause: error });
}
