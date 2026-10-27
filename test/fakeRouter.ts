import { beforeEach } from "vitest";

/**
 * Stands in for the App Router, which only runs inside Next. Mock
 * `next/navigation` with it at the top of a test file:
 *
 *     vi.mock("next/navigation", async () => (await import("@test/fakeRouter")).fakeNavigation);
 *
 * then read where the screen navigated to from `fakeRouter.path`.
 */
export const fakeRouter = {
  /** The path last navigated to, or undefined before any navigation. */
  path: undefined as string | undefined,
};

beforeEach(() => {
  fakeRouter.path = undefined;
});

const navigate = (href: string) => {
  fakeRouter.path = href;
};

const router = {
  push: navigate,
  replace: navigate,
  back: () => {},
  forward: () => {},
  refresh: () => {},
  prefetch: () => {},
};

const unsupported = (name: string) => () => {
  throw new Error(`The fake router does not support ${name}`);
};

export const fakeNavigation = {
  useRouter: () => router,
  usePathname: () => "/",
  redirect: unsupported("redirect"),
  permanentRedirect: unsupported("permanentRedirect"),
};
