import {
  FAKE_BE_URL,
  type FakeBackend,
  type FakeBackendOptions,
  fakeBackend,
} from "@test/fakeBackend";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Installs a fresh fake backend as the global `fetch` at `BE_URL` before each
 * test, for code that reaches the backend through the app's own layers.
 * Read the current one through the returned ref.
 */
export function installFakeBackend(options: FakeBackendOptions = {}): {
  readonly current: FakeBackend;
} {
  const ref = { current: fakeBackend(options) };
  const delegate: typeof fetch = (input, init) =>
    ref.current.fetch(input, init);
  beforeEach(() => {
    ref.current = fakeBackend(options);
    vi.stubEnv("BE_URL", FAKE_BE_URL);
    // Effect caches the global fetch on first use, so install one delegate.
    vi.stubGlobal("fetch", delegate);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  return ref;
}
