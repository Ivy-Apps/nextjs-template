import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import type { Todo } from "@/features/todos/data/Todo";
import { Button } from "@/ui/design-system/components/button";
import { Checkbox } from "@/ui/design-system/components/checkbox";
import { cn } from "@/ui/design-system/lib/utils";

type TodoItemProps = {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
};

/** One todo: its checkbox and the delete button are named by its title. */
export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const t = useTranslations("todos");
  const titleId = useId();

  return (
    <li className="flex items-start gap-3 py-2">
      <Checkbox
        className="mt-1"
        checked={todo.completed}
        onCheckedChange={onToggle}
        aria-labelledby={titleId}
      />
      <span
        id={titleId}
        className={cn(
          "min-w-0 flex-1 text-sm wrap-break-word",
          todo.completed && "text-muted-foreground line-through",
        )}
      >
        {todo.title}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="-my-1 shrink-0"
        aria-label={t("delete", { title: todo.title })}
        onClick={onDelete}
      >
        <Trash2Icon />
      </Button>
    </li>
  );
}
