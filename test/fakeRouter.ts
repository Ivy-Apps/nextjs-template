import { beforeEach } from "vitest";

/**
 * Stands in for the App Router, which only runs inside Next. `test/setup.ts`
 * mocks `next/navigation` with it for every test; read where the screen
 * navigated to from `fakeRouter.path`.
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
