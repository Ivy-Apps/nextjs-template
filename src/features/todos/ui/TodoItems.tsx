import { useTranslations } from "next-intl";
import type { Todo } from "@/features/todos/data/Todo";
import type { TodoList } from "@/features/todos/domain/TodoList";
import { TodoItem } from "@/features/todos/ui/TodoItem";

type TodoItemsProps = {
  todos: TodoList;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

export function TodoItems({ todos, onToggle, onDelete }: TodoItemsProps) {
  const t = useTranslations("todos");

  return todos.length === 0 ? (
    <p className="py-6 text-center text-sm text-muted-foreground">
      {t("empty")}
    </p>
  ) : (
    <ul className="flex flex-col divide-y divide-border">
      {todos.map((todo) => (
        <TodoItem
          key={`${todo._tag}-${todo.id}`}
          todo={todo}
          onToggle={() => onToggle(todo)}
          onDelete={() => onDelete(todo)}
        />
      ))}
    </ul>
  );
}
