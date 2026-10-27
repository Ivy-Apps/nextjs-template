import { vi } from "vitest";

// The App Router only runs inside Next: every test navigates the fake one.
vi.mock(
  "next/navigation",
  async () => (await import("@test/fakeRouter")).fakeNavigation,
);
