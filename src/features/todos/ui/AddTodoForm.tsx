import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/design-system/components/button";
import { Input } from "@/ui/design-system/components/input";
import { Label } from "@/ui/design-system/components/label";

type AddTodoFormProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

export function AddTodoForm({
  draft,
  onDraftChange,
  onSubmit,
}: AddTodoFormProps) {
  const t = useTranslations("todos");

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Label htmlFor="new-todo" className="sr-only">
        {t("newTodo")}
      </Label>
      <Input
        id="new-todo"
        name="todo"
        autoComplete="off"
        required
        placeholder={t("placeholder")}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
      />
      <Button type="submit">
        <PlusIcon />
        {t("add")}
      </Button>
    </form>
  );
}
