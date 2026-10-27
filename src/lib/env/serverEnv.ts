import { Effect, Result, Schema } from "effect";

/**
 * The server's environment. Server-only: client bundles get `undefined` for
 * every name here, so read client values from `@/lib/env/clientEnv`.
 */
export const ServerEnv = Schema.Struct({
  BE_URL: Schema.URLFromString.pipe(
    Schema.withDecodingDefault(Effect.succeed("https://dummyjson.com")),
  ),
  NODE_ENV: Schema.Literals(["development", "production", "test"]),
});
export type ServerEnv = typeof ServerEnv.Type;

/** The raw variables `ServerEnv` decodes, as `process.env` holds them. */
export type RawServerEnv = {
  readonly [K in keyof ServerEnv]: string | undefined;
};

/**
 * The decoded `process.env`. Throws on an invalid environment, naming every
 * bad variable. The result is cached until a variable changes, so the server
 * decodes once while tests can still switch it with `vi.stubEnv`.
 */
export function serverEnv(): ServerEnv {
  const raw: RawServerEnv = {
    BE_URL: process.env.BE_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  const key = JSON.stringify(raw);
  if (cache?.key !== key) {
    cache = { key, env: decodeServerEnv(raw) };
  }
  return cache.env;
}

/** Decodes the raw variables, throwing a readable error when one is invalid. */
export function decodeServerEnv(raw: RawServerEnv): ServerEnv {
  return Result.match(decode(raw), {
    onSuccess: (env) => env,
    onFailure: (error) => {
      throw new Error(`Invalid server environment:\n${error.message}`, {
        cause: error,
      });
    },
  });
}

const decode = Schema.decodeUnknownResult(ServerEnv, { errors: "all" });

let cache: { readonly key: string; readonly env: ServerEnv } | undefined;
