import type { Todo } from "@/features/todos/data/Todo";
import type { TodoList } from "@/features/todos/domain/TodoList";

export type UiState =
  | { readonly _tag: "Loading" }
  | {
      readonly _tag: "Loaded";
      readonly todos: TodoList;
      /** The new todo's text, as typed. */
      readonly draft: string;
      readonly alert: TodoAlert;
    }
  | { readonly _tag: "Failed" };

/** The last change the backend refused; the list has been rolled back. */
export type TodoAlert = "None" | "AddFailed" | "ToggleFailed" | "DeleteFailed";

export type UiEvent =
  | { readonly _tag: "ChangeDraft"; readonly value: string }
  | { readonly _tag: "AddTodo" }
  | { readonly _tag: "ToggleTodo"; readonly todo: Todo }
  | { readonly _tag: "DeleteTodo"; readonly todo: Todo };
