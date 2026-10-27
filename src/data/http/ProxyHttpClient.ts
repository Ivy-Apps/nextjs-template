import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

/**
 * The browser's HttpClient for the backend: requests go through the BFF's
 * `/proxy`, which adds the Bearer from the session cookies and renews the
 * session on a 401. Non-2xx responses fail with an HttpClientError; a 401 means
 * the session ended and the visitor must log in again.
 */
export const ProxyHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    return client.pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl("/proxy")),
      HttpClient.filterStatusOk,
    );
  }),
).pipe(Layer.provide(FetchHttpClient.layer));
