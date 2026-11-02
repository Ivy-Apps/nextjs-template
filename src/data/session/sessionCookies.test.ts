// @vitest-environment node
import { Option } from "effect";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_COOKIE,
  forwardSessionUpdate,
  REFRESH_TOKEN_COOKIE,
  readSessionCookies,
} from "@/data/session/sessionCookies";
import { AccessToken, RefreshToken } from "@/data/session/Tokens";

function requestWith(cookies: Record<string, string>): NextRequest {
  const request = new NextRequest("https://app.test/");
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

function cookiesOf(request: NextRequest): Record<string, string> {
  return Object.fromEntries(
    request.cookies.getAll().map(({ name, value }) => [name, value]),
  );
}

describe("readSessionCookies", () => {
  it("reads an empty cookie as no token", () => {
    const request = requestWith({
      [ACCESS_TOKEN_COOKIE]: "",
      [REFRESH_TOKEN_COOKIE]: "",
    });

    expect(readSessionCookies(request.cookies)).toStrictEqual({
      accessToken: Option.none(),
      refreshToken: Option.none(),
    });
  });
});

describe("forwardSessionUpdate", () => {
  const LIVE_SESSION = {
    [ACCESS_TOKEN_COOKIE]: "old-access",
    [REFRESH_TOKEN_COOKIE]: "old-refresh",
    theme: "dark",
  };

  it("leaves the cookies as they are when the session is unchanged", () => {
    const request = requestWith(LIVE_SESSION);

    forwardSessionUpdate(request.cookies, { _tag: "Unchanged" });

    expect(cookiesOf(request)).toStrictEqual(LIVE_SESSION);
  });

  it("hands the rest of the request both renewed tokens", () => {
    const request = requestWith(LIVE_SESSION);

    forwardSessionUpdate(request.cookies, {
      _tag: "Renewed",
      tokens: {
        accessToken: AccessToken.make("new-access"),
        refreshToken: RefreshToken.make("new-refresh"),
      },
    });

    expect(cookiesOf(request)).toStrictEqual({
      [ACCESS_TOKEN_COOKIE]: "new-access",
      [REFRESH_TOKEN_COOKIE]: "new-refresh",
      theme: "dark",
    });
  });

  it("takes an ended session's tokens off the request, and only those", () => {
    const request = requestWith(LIVE_SESSION);

    forwardSessionUpdate(request.cookies, { _tag: "Ended" });

    expect(cookiesOf(request)).toStrictEqual({ theme: "dark" });
  });
});
