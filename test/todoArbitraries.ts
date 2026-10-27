import { fc } from "@fast-check/vitest";
import {
  type LocalTodo,
  LocalTodoId,
  type SavedTodo,
  type Todo,
  TodoId,
  TodoTitle,
} from "@/features/todos/data/Todo";
import type { TodoList } from "@/features/todos/domain/TodoList";

export const todoTitle = fc.string({ minLength: 1 }).map(TodoTitle.make);

export const savedTodo: fc.Arbitrary<SavedTodo> = fc.record(
  {
    _tag: fc.constant("Saved"),
    id: fc.integer().map(TodoId.make),
    title: todoTitle,
    completed: fc.boolean(),
  },
  { noNullPrototype: true },
);

export const localTodo: fc.Arbitrary<LocalTodo> = fc.record(
  {
    _tag: fc.constant("Local"),
    id: fc.uuid().map(LocalTodoId.make),
    title: todoTitle,
    completed: fc.boolean(),
  },
  { noNullPrototype: true },
);

export const todo: fc.Arbitrary<Todo> = fc.oneof(savedTodo, localTodo);

/** A list where no two todos share a ref, as in the app. */
export const todoList: fc.Arbitrary<TodoList> = fc.uniqueArray(todo, {
  selector: (item) => `${item._tag}:${item.id}`,
});
