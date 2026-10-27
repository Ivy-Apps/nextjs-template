import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AddTodoForm } from "@/features/todos/ui/AddTodoForm";
import { TodoItems } from "@/features/todos/ui/TodoItems";
import type {
  UiEvent,
  UiState,
} from "@/features/todos/ui/useTodosViewModel.types";
import { Alert, AlertDescription } from "@/ui/design-system/components/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/ui/design-system/components/card";

type TodosViewProps = {
  state: UiState;
  onEvent: (event: UiEvent) => void;
};

export function TodosView({ state, onEvent }: TodosViewProps) {
  const t = useTranslations("todos");

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

function TodosContent({ state, onEvent }: TodosViewProps): ReactNode {
  const t = useTranslations("todos");

  switch (state._tag) {
    case "Loading":
      return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
    case "Failed":
      return (
        <Alert variant="destructive">
          <AlertDescription>{t("loadFailed")}</AlertDescription>
        </Alert>
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
            <Alert variant="destructive">
              <AlertDescription>{t(`alerts.${state.alert}`)}</AlertDescription>
            </Alert>
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
