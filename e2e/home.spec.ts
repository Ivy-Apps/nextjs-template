import { expect, test } from "@playwright/test";

test("the home page renders in English by default", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Next.js Template" }),
  ).toBeVisible();
});

test("the home page renders in Bulgarian under /bg", async ({ page }) => {
  await page.goto("/bg");

  await expect(
    page.getByRole("heading", { name: "Next.js шаблон" }),
  ).toBeVisible();
});
