"use client";

import { TodosView } from "@/features/todos/ui/TodosView";
import { useTodosViewModel } from "@/features/todos/ui/useTodosViewModel";

/** Render it inside a `PrefetchBoundary` that prefetched `todosQuery`. */
export function TodosContainer() {
  const { state, onEvent } = useTodosViewModel();

  return <TodosView state={state} onEvent={onEvent} />;
}
