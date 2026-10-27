import { renderWithProviders } from "@test/renderWithProviders";
import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { ThemeToggle } from "@/ui/ThemeToggle";

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

it("switches from light to dark and back", async () => {
  renderWithProviders(<ThemeToggle />);
  const toggle = screen.getByRole("button", { name: "Toggle theme" });

  await userEvent.click(toggle);
  const afterFirstClick = document.documentElement.className;
  await userEvent.click(toggle);

  expect([afterFirstClick, document.documentElement.className]).toStrictEqual([
    "dark",
    "light",
  ]);
});
