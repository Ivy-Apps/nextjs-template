import { afterEach, beforeEach, vi } from "vitest";

export const MINUTE = 60_000;

/**
 * Freezes `Date` at `now` before each test, so tokens issued and checked in
 * the test agree on the time. `elapse` moves the clock on from `now`.
 */
export function installFrozenClock(now: Date): {
  readonly elapse: (ms: number) => void;
} {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());
  return { elapse: (ms) => vi.setSystemTime(now.getTime() + ms) };
}
