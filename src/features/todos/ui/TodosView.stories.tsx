import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  LocalTodoId,
  type Todo,
  TodoId,
  TodoTitle,
} from "@/features/todos/data/Todo";
import { TodosView } from "@/features/todos/ui/TodosView";

const meta = {
  component: TodosView,
  args: { onEvent: fn() },
  parameters: { layout: "padded" },
} satisfies Meta<typeof TodosView>;

export default meta;
type Story = StoryObj<typeof meta>;

const todos: ReadonlyArray<Todo> = [
  savedTodo(1, "Buy milk", false),
  savedTodo(2, "Water the plants", true),
  savedTodo(
    3,
    "Write a very long todo that wraps across several lines on a narrow phone screen without overflowing the card",
    false,
  ),
  {
    _tag: "Local",
    id: LocalTodoId.make("local-1"),
    title: TodoTitle.make("Just added in this browser"),
    completed: false,
  },
];

export const Loading: Story = { args: { state: { _tag: "Loading" } } };

export const Loaded: Story = {
  args: { state: { _tag: "Loaded", todos, draft: "", alert: "None" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", { name: "Buy milk" }));
    await expect(args.onEvent).toHaveBeenCalledWith({
      _tag: "ToggleTodo",
      todo: todos[0],
    });
    await expect(canvas.getByText("3 items left")).toBeVisible();
  },
};

const oneOpen = [
  savedTodo(1, "Buy milk", false),
  savedTodo(2, "Pay rent", true),
];

export const OneLeft: Story = {
  args: { state: { _tag: "Loaded", todos: oneOpen, draft: "", alert: "None" } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("1 item left")).toBeVisible();
  },
};

export const OneLeftInBulgarian: Story = {
  args: OneLeft.args,
  globals: { locale: "bg" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1 оставаща задача")).toBeVisible();
  },
};

export const AllDone: Story = {
  args: {
    state: {
      _tag: "Loaded",
      todos: [savedTodo(1, "Pay rent", true)],
      draft: "",
      alert: "None",
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("0 items left")).toBeVisible();
  },
};

export const Empty: Story = {
  args: { state: { _tag: "Loaded", todos: [], draft: "", alert: "None" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/items? left/)).toBeNull();
  },
};

export const Drafting: Story = {
  args: {
    state: { _tag: "Loaded", todos, draft: "Call the bank", alert: "None" },
  },
};

export const AddFailed: Story = {
  args: { state: { _tag: "Loaded", todos, draft: "", alert: "AddFailed" } },
};

export const ToggleFailed: Story = {
  args: { state: { _tag: "Loaded", todos, draft: "", alert: "ToggleFailed" } },
};

export const DeleteFailed: Story = {
  args: { state: { _tag: "Loaded", todos, draft: "", alert: "DeleteFailed" } },
};

export const Failed: Story = { args: { state: { _tag: "Failed" } } };

function savedTodo(id: number, title: string, completed: boolean): Todo {
  return {
    _tag: "Saved",
    id: TodoId.make(id),
    title: TodoTitle.make(title),
    completed,
  };
}
