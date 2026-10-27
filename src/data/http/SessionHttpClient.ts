import { Effect, Layer, Option } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { cookies } from "next/headers";
import { BackendHttpClient } from "@/data/http/BackendHttpClient";
import { readSessionCookies } from "@/data/session/sessionCookies";

/**
 * The backend HttpClient for server components and server actions: every
 * request carries the visitor's access token as a Bearer. It never renews the
 * session; `src/proxy.ts` has already done so before the page renders.
 */
export const SessionHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const { accessToken } = readSessionCookies(yield* Effect.promise(cookies));
    const client = yield* HttpClient.HttpClient;
    return Option.match(accessToken, {
      onNone: () => client,
      onSome: (token) =>
        client.pipe(
          HttpClient.mapRequest(HttpClientRequest.bearerToken(token)),
        ),
    });
  }),
).pipe(Layer.provide(BackendHttpClient));
