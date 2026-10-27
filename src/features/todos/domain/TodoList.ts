import type { Todo } from "@/features/todos/data/Todo";

/*
 * Pure updates of a list of todos, as the user sees it. Each one is the
 * inverse of another, so an optimistic change can be rolled back without
 * undoing the changes made since: `insert` undoes `remove` and back, and
 * `setCompleted` undoes itself.
 */

export type TodoList = ReadonlyArray<Todo>;

/** Which todo: a saved and a local todo never share a ref. */
export type TodoRef = Pick<Todo, "_tag" | "id">;

/**
 * Puts `todo` at `index`, clamped to the list, so a rollback still lands when
 * the list has shrunk since.
 */
export function insert(list: TodoList, index: number, todo: Todo): TodoList {
  const at = Math.min(Math.max(index, 0), list.length);
  return [...list.slice(0, at), todo, ...list.slice(at)];
}

/** Where `ref` sits in the list, or -1 when it is not there. */
export function indexOf(list: TodoList, ref: TodoRef): number {
  return list.findIndex((todo) => isTodo(todo, ref));
}

export function remove(list: TodoList, ref: TodoRef): TodoList {
  return list.filter((todo) => !isTodo(todo, ref));
}

export function setCompleted(
  list: TodoList,
  ref: TodoRef,
  completed: boolean,
): TodoList {
  return list.map((todo) =>
    isTodo(todo, ref) ? { ...todo, completed } : todo,
  );
}

function isTodo(todo: Todo, ref: TodoRef): boolean {
  return todo._tag === ref._tag && todo.id === ref.id;
}
