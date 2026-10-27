import { expect, test } from "@playwright/test";
import { DEMO_TODOS, DEMO_USER, type FakeTodo } from "@test/fakeBackend";
import { logInAtHome } from "./logIn";

const ownTodos = DEMO_TODOS.filter((todo) => todo.userId === DEMO_USER.id);
const open = demoTodo((todo) => !todo.completed);
const done = demoTodo((todo) => todo.completed);

test("the todos are in the first paint, before any script runs", async ({
  page,
  browser,
}) => {
  await logInAtHome(page);
  const withoutScripts = await browser.newContext({
    javaScriptEnabled: false,
    storageState: await page.context().storageState(),
  });
  const staticPage = await withoutScripts.newPage();

  await staticPage.goto("/");

  for (const todo of ownTodos) {
    await expect(staticPage.getByText(todo.todo)).toBeVisible();
  }
  await withoutScripts.close();
});

test("adding a todo shows it in the list", async ({ page }) => {
  await logInAtHome(page);

  await page.getByRole("textbox", { name: "New todo" }).fill("Call mom");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByRole("checkbox", { name: "Call mom" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "New todo" })).toHaveValue("");
});

test("toggling a todo flips its checkbox", async ({ page }) => {
  await logInAtHome(page);
  const checkbox = page.getByRole("checkbox", { name: done.todo });
  await expect(checkbox).toBeChecked();

  await checkbox.click();

  await expect(checkbox).not.toBeChecked();
});

test("deleting a todo removes it from the list", async ({ page }) => {
  await logInAtHome(page);
  await expect(page.getByRole("checkbox", { name: open.todo })).toBeVisible();

  await page.getByRole("button", { name: `Delete ${open.todo}` }).click();

  await expect(page.getByRole("checkbox", { name: open.todo })).toHaveCount(0);
});

function demoTodo(matches: (todo: FakeTodo) => boolean): FakeTodo {
  const todo = ownTodos.find(matches);
  if (todo === undefined) throw new Error("No such demo todo");
  return todo;
}
