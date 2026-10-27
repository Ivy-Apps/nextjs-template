import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD, DEMO_USERNAME } from "@test/fakeBackend";
import { logIn, logInAtHome } from "./logIn";

const SESSION_COOKIES = ["access_token", "refresh_token"];

test("a signed-out visitor is sent to the login page with a return path", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL("/login?returnTo=%2F");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("a signed-out visitor under /bg is sent to the Bulgarian login page", async ({
  page,
}) => {
  await page.goto("/bg");

  await expect(page).toHaveURL(/^http:\/\/[^/]+\/bg\/login\?returnTo=/);
  await expect(page.getByRole("button", { name: "Вход" })).toBeVisible();
});

test("logging in returns to the requested page", async ({ page }) => {
  await page.goto("/");

  await logIn(page);

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Todos" })).toBeVisible();
});

test("the session cookies are httpOnly, out of the page's reach", async ({
  page,
  context,
}) => {
  await logInAtHome(page);

  const pageCookies = await page.evaluate(() => document.cookie);
  const cookies = await context.cookies();

  for (const name of SESSION_COOKIES) {
    expect(pageCookies).not.toContain(name);
    expect(cookies.find((cookie) => cookie.name === name)?.httpOnly).toBe(true);
  }
});

test("wrong credentials show the localized error", async ({ page }) => {
  await page.goto("/");

  await logIn(page, `not-${DEMO_PASSWORD}`);

  await expect(page.getByText("Wrong username or password.")).toBeVisible();
  await expect(page).toHaveURL("/login?returnTo=%2F");
});

test("the app renders in Bulgarian under /bg after logging in", async ({
  page,
}) => {
  await page.goto("/bg");

  await page
    .getByRole("textbox", { name: "Потребителско име" })
    .fill(DEMO_USERNAME);
  await page.getByRole("textbox", { name: "Парола" }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Вход" }).click();

  await expect(page).toHaveURL("/bg");
  await expect(page.getByRole("heading", { name: "Задачи" })).toBeVisible();
});

test("logging out clears the session and lands on the login page", async ({
  page,
  context,
}) => {
  await logInAtHome(page);

  await page.getByRole("button", { name: "Log out" }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  const names = (await context.cookies()).map((cookie) => cookie.name);
  expect(names).not.toContain(SESSION_COOKIES[0]);
  expect(names).not.toContain(SESSION_COOKIES[1]);
});

test.describe("in a light system theme", () => {
  test.use({ colorScheme: "light" });

  test("the theme toggle switches to dark", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Toggle theme" }).click();

    await expect(html).toHaveClass(/\bdark\b/);
  });
});
