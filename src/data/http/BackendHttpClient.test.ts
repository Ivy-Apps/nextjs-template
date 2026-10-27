import { fakeBackend } from "@test/fakeBackend";
import { ConfigProvider, Effect, Exit } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { describe, expect, it } from "vitest";
import { BackendHttpClient } from "@/data/http/BackendHttpClient";

const backend = fakeBackend({
  "https://be.test/todos": { status: 200, body: { todos: [] } },
});

function runAgainstBackend<A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
) {
  return Effect.runPromiseExit(
    effect.pipe(
      Effect.provide(BackendHttpClient),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({ env: { BE_URL: "https://be.test" } }),
      ),
      Effect.provideService(FetchHttpClient.Fetch, backend),
    ),
  );
}

describe("BackendHttpClient", () => {
  it("resolves request paths against BE_URL", async () => {
    const exit = await runAgainstBackend(
      HttpClient.get("/todos").pipe(Effect.flatMap((res) => res.json)),
    );

    expect(exit).toStrictEqual(Exit.succeed({ todos: [] }));
  });

  it("fails with a status code error on a non-2xx response", async () => {
    const exit = await runAgainstBackend(
      HttpClient.get("/missing").pipe(
        Effect.flip,
        Effect.map((error) => [error.reason._tag, error.response?.status]),
      ),
    );

    expect(exit).toStrictEqual(Exit.succeed(["StatusCodeError", 404]));
  });
});
