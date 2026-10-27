import { Option } from "effect";
import type { NextRequest, NextResponse } from "next/server";
import {
  AccessToken,
  RefreshToken,
  type SessionCookies,
  type TokenPair,
  tokenExpiry,
} from "@/data/session/Tokens";
import { serverEnv } from "@/lib/env/serverEnv";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/** What a response does to the session cookies. */
export type SessionUpdate =
  | { readonly _tag: "Unchanged" }
  | { readonly _tag: "Renewed"; readonly tokens: TokenPair }
  | { readonly _tag: "Ended" };

/** Request cookies, from `NextRequest.cookies` or `next/headers` `cookies()`. */
export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

/** Response cookies, from `NextResponse.cookies`. */
export type CookieWriter = Pick<NextResponse["cookies"], "set">;

export function readSessionCookies(cookies: CookieReader): SessionCookies {
  return {
    accessToken: readCookie(cookies, ACCESS_TOKEN_COOKIE, AccessToken.make),
    refreshToken: readCookie(cookies, REFRESH_TOKEN_COOKIE, RefreshToken.make),
  };
}

/**
 * Writes the update as httpOnly cookies, so the tokens never reach client JS.
 * Each cookie expires with its token.
 */
export function writeSessionUpdate(
  cookies: CookieWriter,
  update: SessionUpdate,
): void {
  switch (update._tag) {
    case "Unchanged":
      return;
    case "Renewed":
      setTokenCookie(cookies, ACCESS_TOKEN_COOKIE, update.tokens.accessToken);
      setTokenCookie(cookies, REFRESH_TOKEN_COOKIE, update.tokens.refreshToken);
      return;
    case "Ended":
      cookies.set(ACCESS_TOKEN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
      cookies.set(REFRESH_TOKEN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
      return;
  }
}

/** Secure everywhere but `next dev`, so the site works on http://localhost. */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: serverEnv().NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
  } as const;
}

function readCookie<A>(
  cookies: CookieReader,
  name: string,
  make: (value: string) => A,
): Option.Option<A> {
  return Option.fromNullishOr(cookies.get(name)?.value).pipe(
    Option.filter((value) => value !== ""),
    Option.map(make),
  );
}

function setTokenCookie(
  cookies: CookieWriter,
  name: string,
  token: string,
): void {
  cookies.set(name, token, {
    ...cookieOptions(),
    expires: Option.getOrUndefined(tokenExpiry(token)),
  });
}

/** Request cookies, from `NextRequest.cookies`. */
export type RequestCookieWriter = Pick<
  NextRequest["cookies"],
  "set" | "delete"
>;

/**
 * Applies the update to the request itself, so the rest of the request (the
 * page and its server components) already sees the renewed tokens.
 */
export function forwardSessionUpdate(
  cookies: RequestCookieWriter,
  update: SessionUpdate,
): void {
  switch (update._tag) {
    case "Unchanged":
      return;
    case "Renewed":
      cookies.set(ACCESS_TOKEN_COOKIE, update.tokens.accessToken);
      cookies.set(REFRESH_TOKEN_COOKIE, update.tokens.refreshToken);
      return;
    case "Ended":
      cookies.delete([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]);
      return;
  }
}
