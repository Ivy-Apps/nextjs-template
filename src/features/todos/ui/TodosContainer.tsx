"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AddTodoForm } from "@/features/todos/ui/AddTodoForm";
import { TodoItems } from "@/features/todos/ui/TodoItems";
import { useTodosViewModel } from "@/features/todos/ui/useTodosViewModel";
import type {
  UiEvent,
  UiState,
} from "@/features/todos/ui/useTodosViewModel.types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/ui/design-system/components/card";

/** Render it inside a `PrefetchBoundary` that prefetched `todosQuery`. */
export function TodosContainer() {
  const t = useTranslations("todos");
  const { state, onEvent } = useTodosViewModel();

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>
          <h1>{t("title")}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <TodosContent state={state} onEvent={onEvent} />
      </CardContent>
    </Card>
  );
}

function TodosContent({
  state,
  onEvent,
}: {
  state: UiState;
  onEvent: (event: UiEvent) => void;
}): ReactNode {
  const t = useTranslations("todos");

  switch (state._tag) {
    case "Loading":
      return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
    case "Failed":
      return (
        <p role="alert" className="text-sm text-destructive">
          {t("loadFailed")}
        </p>
      );
    case "Loaded":
      return (
        <>
          <AddTodoForm
            draft={state.draft}
            onDraftChange={(value) => onEvent({ _tag: "ChangeDraft", value })}
            onSubmit={() => onEvent({ _tag: "AddTodo" })}
          />
          {state.alert !== "None" && (
            <p role="alert" className="text-sm text-destructive">
              {t(`alerts.${state.alert}`)}
            </p>
          )}
          <TodoItems
            todos={state.todos}
            onToggle={(todo) => onEvent({ _tag: "ToggleTodo", todo })}
            onDelete={(todo) => onEvent({ _tag: "DeleteTodo", todo })}
          />
        </>
      );
  }
}
