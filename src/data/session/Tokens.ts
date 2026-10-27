import { Option, Schema } from "effect";

export const AccessToken = Schema.String.pipe(Schema.brand("AccessToken"));
export type AccessToken = typeof AccessToken.Type;

export const RefreshToken = Schema.String.pipe(Schema.brand("RefreshToken"));
export type RefreshToken = typeof RefreshToken.Type;

/** The token pair the backend issues on login and refresh. */
export const TokenPair = Schema.Struct({
  accessToken: AccessToken,
  refreshToken: RefreshToken,
});
export type TokenPair = typeof TokenPair.Type;

/** The session as the browser's cookies carry it. */
export type SessionCookies = {
  readonly accessToken: Option.Option<AccessToken>;
  readonly refreshToken: Option.Option<RefreshToken>;
};

/**
 * What a request may do with its session: use it as is, renew it first with
 * the refresh token, or treat the visitor as signed out.
 */
export type SessionState =
  | { readonly _tag: "Active"; readonly accessToken: AccessToken }
  | { readonly _tag: "Renewable"; readonly refreshToken: RefreshToken }
  | { readonly _tag: "Anonymous" };

/** Renew this long before the access token expires, so it cannot lapse mid-request. */
export const RENEW_MARGIN_MS = 60_000;

/**
 * Classifies the session at `nowMs`. An access token that is missing, expired,
 * unreadable or within {@link RENEW_MARGIN_MS} of its expiry needs renewing.
 */
export function sessionState(
  cookies: SessionCookies,
  nowMs: number,
): SessionState {
  const fresh = Option.filter(cookies.accessToken, (token) =>
    Option.exists(
      tokenExpiry(token),
      (expiresAt) => expiresAt.getTime() - nowMs > RENEW_MARGIN_MS,
    ),
  );
  return Option.match(fresh, {
    onSome: (accessToken) => ({ _tag: "Active", accessToken }),
    onNone: () =>
      Option.match(cookies.refreshToken, {
        onSome: (refreshToken) => ({ _tag: "Renewable", refreshToken }),
        onNone: () => ({ _tag: "Anonymous" }),
      }),
  });
}

/**
 * The `exp` claim of a JWT. The signature is not verified: the backend does
 * that; this only times the renewal.
 */
export function tokenExpiry(token: string): Option.Option<Date> {
  return Option.map(
    Schema.decodeUnknownOption(JwtClaims)(token.split(".")[1]),
    (claims) => new Date(claims.exp * 1000),
  );
}

/** A JWT payload segment: base64url-encoded JSON with an `exp` in epoch seconds. */
const JwtClaims = Schema.StringFromBase64Url.pipe(
  Schema.decodeTo(Schema.fromJsonString(Schema.Struct({ exp: Schema.Finite }))),
);
