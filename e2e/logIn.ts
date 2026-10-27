import { expect, type Page } from "@playwright/test";
import { DEMO_PASSWORD, DEMO_USERNAME } from "@test/fakeBackend";

/** Logs in as the demo user through the login form of the current page. */
export async function logIn(page: Page, password = DEMO_PASSWORD) {
  await page.getByRole("textbox", { name: "Username" }).fill(DEMO_USERNAME);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/** Opens the home page and logs in, landing on the todos. */
export async function logInAtHome(page: Page) {
  await page.goto("/");
  await logIn(page);
  await expect(page.getByRole("heading", { name: "Todos" })).toBeVisible();
}
