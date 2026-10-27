import { Data, Effect, Option, Schema } from "effect";
import {
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { rejectedStatus } from "@/data/http/rejectedStatus";
import { type RefreshToken, TokenPair } from "@/data/session/Tokens";
import type { Credentials } from "@/types/Auth";
import { User } from "@/types/User";

/** The backend rejected the username or password. */
export class InvalidCredentials extends Data.TaggedError(
  "InvalidCredentials",
) {}

/** The backend rejected the token: the visitor must log in again. */
export class SessionExpired extends Data.TaggedError("SessionExpired") {}

/** The backend was unreachable, failed, or answered in an unexpected shape. */
export class BackendFailure extends Data.TaggedError("BackendFailure")<{
  readonly cause: unknown;
}> {}

/** Access tokens live this long; the session renews them before they lapse. */
const ACCESS_TOKEN_LIFETIME_MINUTES = 30;

const LoginResponse = Schema.Struct({
  ...TokenPair.fields,
  ...User.fields,
});

export type LoginResult = { readonly user: User; readonly tokens: TokenPair };

export function login(
  credentials: Credentials,
): Effect.Effect<
  LoginResult,
  InvalidCredentials | BackendFailure,
  HttpClient.HttpClient
> {
  return postJson("/auth/login", {
    ...credentials,
    expiresInMins: ACCESS_TOKEN_LIFETIME_MINUTES,
  }).pipe(
    Effect.flatMap(HttpClientResponse.schemaBodyJson(LoginResponse)),
    Effect.map(({ accessToken, refreshToken, ...user }) => ({
      user,
      tokens: { accessToken, refreshToken },
    })),
    rejectedAs(() => new InvalidCredentials()),
  );
}

/** Exchanges the refresh token for a new token pair. */
export function refreshSession(
  refreshToken: RefreshToken,
): Effect.Effect<
  TokenPair,
  SessionExpired | BackendFailure,
  HttpClient.HttpClient
> {
  return postJson("/auth/refresh", {
    refreshToken,
    expiresInMins: ACCESS_TOKEN_LIFETIME_MINUTES,
  }).pipe(
    Effect.flatMap(HttpClientResponse.schemaBodyJson(TokenPair)),
    rejectedAs(() => new SessionExpired()),
  );
}

/**
 * The signed-in user. Run it with an HttpClient that carries the session:
 * `SessionHttpClient` on the server, `ProxyHttpClient` in the browser.
 */
export const currentUser: Effect.Effect<
  User,
  SessionExpired | BackendFailure,
  HttpClient.HttpClient
> = HttpClient.get("/auth/me").pipe(
  Effect.flatMap(HttpClientResponse.schemaBodyJson(User)),
  rejectedAs(() => new SessionExpired()),
);

function postJson(url: string, body: unknown) {
  return HttpClientRequest.post(url).pipe(
    HttpClientRequest.bodyJsonUnsafe(body),
    HttpClient.execute,
  );
}

/**
 * Maps a 4xx answer to the domain's rejection, and every other failure
 * (transport, 5xx, a body of the wrong shape) to a BackendFailure.
 */
function rejectedAs<E>(rejection: () => E) {
  return <A, R>(
    effect: Effect.Effect<
      A,
      HttpClientError.HttpClientError | Schema.SchemaError,
      R
    >,
  ): Effect.Effect<A, E | BackendFailure, R> =>
    Effect.mapError(effect, (error) =>
      Option.exists(
        rejectedStatus(error),
        (status) => status >= 400 && status < 500,
      )
        ? rejection()
        : new BackendFailure({ cause: error }),
    );
}
