import { Clock, Effect } from "effect";
import type { HttpClient } from "effect/http";
import {
  type BackendFailure,
  refreshSession,
} from "@/data/session/AuthRepository";
import type { SessionUpdate } from "@/data/session/sessionCookies";
import {
  type AccessToken,
  type RefreshToken,
  type SessionCookies,
  sessionState,
} from "@/data/session/Tokens";

/**
 * The visitor's session for this request, and what the response must do to
 * the session cookies.
 */
export type ResolvedSession =
  | {
      readonly _tag: "SignedIn";
      readonly accessToken: AccessToken;
      readonly update: Extract<
        SessionUpdate,
        { _tag: "Unchanged" | "Renewed" }
      >;
    }
  | {
      readonly _tag: "SignedOut";
      readonly update: Extract<SessionUpdate, { _tag: "Unchanged" | "Ended" }>;
    };

/**
 * Resolves the session from its cookies, renewing it when the access token is
 * missing, expired or near expiry and a refresh token exists.
 */
export function resolveSession(
  cookies: SessionCookies,
): Effect.Effect<ResolvedSession, BackendFailure, HttpClient.HttpClient> {
  return Effect.flatMap(Clock.currentTimeMillis, (nowMs) => {
    const state = sessionState(cookies, nowMs);
    switch (state._tag) {
      case "Active":
        return Effect.succeed<ResolvedSession>({
          _tag: "SignedIn",
          accessToken: state.accessToken,
          update: { _tag: "Unchanged" },
        });
      case "Renewable":
        return renewSession(state.refreshToken);
      case "Anonymous":
        return Effect.succeed<ResolvedSession>({
          _tag: "SignedOut",
          update: { _tag: "Unchanged" },
        });
    }
  });
}

/**
 * Renews the session with the refresh token. A rejected refresh token signs
 * the visitor out and ends the session.
 */
export function renewSession(
  refreshToken: RefreshToken,
): Effect.Effect<ResolvedSession, BackendFailure, HttpClient.HttpClient> {
  return refreshSession(refreshToken).pipe(
    Effect.map(
      (tokens): ResolvedSession => ({
        _tag: "SignedIn",
        accessToken: tokens.accessToken,
        update: { _tag: "Renewed", tokens },
      }),
    ),
    Effect.catchTag("SessionExpired", () =>
      Effect.succeed<ResolvedSession>({
        _tag: "SignedOut",
        update: { _tag: "Ended" },
      }),
    ),
  );
}
