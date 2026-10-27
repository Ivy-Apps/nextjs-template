import type { Todo } from "@/features/todos/data/Todo";

/*
 * Pure updates of a list of todos, as the user sees it. An optimistic add or
 * toggle rolls back by its inverse, so the changes made since survive:
 * `remove` undoes `insert`, and `setCompleted` undoes itself. A delete is not
 * applied optimistically: the todo is hidden while the delete is pending and
 * removed only once the backend confirms.
 */

export type TodoList = ReadonlyArray<Todo>;

/** Which todo: a saved and a local todo never share a ref. */
export type TodoRef = Pick<Todo, "_tag" | "id">;

/** Puts `todo` at `index`, clamped to the list. */
export function insert(list: TodoList, index: number, todo: Todo): TodoList {
  const at = Math.min(Math.max(index, 0), list.length);
  return [...list.slice(0, at), todo, ...list.slice(at)];
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
