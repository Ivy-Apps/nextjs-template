import { fc, test } from "@fast-check/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { runQuery } from "@/lib/query/runQuery";

const signal = new AbortController().signal;

test.prop([fc.anything()])(
  "resolves with the Effect's value",
  async (value) => {
    await expect(runQuery(Effect.succeed(value))({ signal })).resolves.toBe(
      value,
    );
  },
);

test.prop([fc.anything()])("rejects with the Effect's error", async (error) => {
  await expect(runQuery(Effect.fail(error))({ signal })).rejects.toBe(error);
});
