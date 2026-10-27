import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { serverEnv } from "@/lib/env/serverEnv";

/**
 * Server-side HttpClient for the backend: every request is resolved against
 * `BE_URL` (default DummyJSON) and non-2xx responses fail with an
 * HttpClientError.
 */
export const BackendHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const baseUrl = serverEnv().BE_URL;
    const client = yield* HttpClient.HttpClient;
    return client.pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl.href)),
      HttpClient.filterStatusOk,
    );
  }),
).pipe(Layer.provide(FetchHttpClient.layer));
