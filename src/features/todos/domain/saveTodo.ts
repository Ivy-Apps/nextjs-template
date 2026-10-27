import { Effect } from "effect";
import type { HttpClient } from "effect/http";
import type { Todo, TodoId } from "@/features/todos/data/Todo";
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

type Save = Effect.Effect<void, TodoFailure, HttpClient.HttpClient>;

export function saveCompleted(todo: Todo, completed: boolean): Save {
  return whenSaved(todo, (id) => setCompleted(id, completed));
}

export function saveDeletion(todo: Todo): Save {
  return whenSaved(todo, deleteTodo);
}

function whenSaved(todo: Todo, save: (id: TodoId) => Save): Save {
  switch (todo._tag) {
    case "Saved":
      return save(todo.id);
    case "Local":
      return Effect.void;
  }
}
