import { Config, Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

/**
 * Server-side HttpClient for the backend: every request is resolved against
 * `BE_URL` and non-2xx responses fail with an HttpClientError.
 */
export const BackendHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const baseUrl = yield* Config.URL("BE_URL");
    const client = yield* HttpClient.HttpClient;
    return client.pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl.href)),
      HttpClient.filterStatusOk,
    );
  }),
).pipe(Layer.provide(FetchHttpClient.layer));
