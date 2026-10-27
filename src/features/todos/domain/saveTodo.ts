import { Effect } from "effect";
import type { HttpClient } from "effect/http";
import type { Todo } from "@/features/todos/data/Todo";
import {
  deleteTodo,
  setCompleted,
  type TodoFailure,
} from "@/features/todos/data/TodoRepository";

/*
 * Saves a change to a todo on the backend. A local todo is not on the backend,
 * which would answer 404, so its changes stay in the browser and always
 * succeed.
 */

export function saveCompleted(
  todo: Todo,
  completed: boolean,
): Effect.Effect<void, TodoFailure, HttpClient.HttpClient> {
  switch (todo._tag) {
    case "Saved":
      return setCompleted(todo.id, completed);
    case "Local":
      return Effect.void;
  }
}

export function saveDeletion(
  todo: Todo,
): Effect.Effect<void, TodoFailure, HttpClient.HttpClient> {
  switch (todo._tag) {
    case "Saved":
      return deleteTodo(todo.id);
    case "Local":
      return Effect.void;
  }
}
