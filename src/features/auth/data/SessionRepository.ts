import { Data, Effect } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { type Credentials, LoginFailure } from "@/types/Auth";
import { User } from "@/types/User";

/*
 * The browser's side of the BFF session endpoints. Run it with an HttpClient
 * that reaches this app's own origin, such as `FetchHttpClient.layer`.
 */

/** The BFF could not end the session; the visitor is still signed in. */
export class LogoutFailed extends Data.TaggedError("LogoutFailed")<{
  readonly cause: unknown;
}> {}

/**
 * Starts a session: the BFF sets the session cookies and answers the user. A
 * transport failure or an unexpected answer counts as `BackendUnavailable`.
 */
export function logIn(
  credentials: Credentials,
): Effect.Effect<User, LoginFailure, HttpClient.HttpClient> {
  return HttpClientRequest.post("/api/auth/login").pipe(
    HttpClientRequest.bodyJsonUnsafe(credentials),
    HttpClient.execute,
    Effect.flatMap((response) =>
      response.status < 300
        ? HttpClientResponse.schemaBodyJson(User)(response)
        : HttpClientResponse.schemaBodyJson(LoginFailure)(response).pipe(
            Effect.flatMap(Effect.fail),
          ),
    ),
    Effect.catchTag("HttpClientError", backendUnavailable),
    Effect.catchTag("SchemaError", backendUnavailable),
  );
}

/** Ends the session: the BFF clears the session cookies. */
export const logOut: Effect.Effect<void, LogoutFailed, HttpClient.HttpClient> =
  HttpClient.post("/api/auth/logout").pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.asVoid,
    Effect.mapError((cause) => new LogoutFailed({ cause })),
  );

function backendUnavailable(): Effect.Effect<never, LoginFailure> {
  return Effect.fail({ _tag: "BackendUnavailable" });
}
