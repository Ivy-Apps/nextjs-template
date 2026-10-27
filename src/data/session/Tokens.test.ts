import { fc, test } from "@fast-check/vitest";
import { fakeJwt } from "@test/fakeBackend";
import { Option } from "effect";
import { describe, expect } from "vitest";
import {
  AccessToken,
  RENEW_MARGIN_MS,
  RefreshToken,
  type SessionCookies,
  sessionState,
  tokenExpiry,
} from "@/data/session/Tokens";

// Epoch seconds from 1970 to 2100.
const epochSeconds = fc.integer({ min: 0, max: 4_102_444_800 });

describe("tokenExpiry", () => {
  test.prop([epochSeconds, fc.dictionary(fc.string(), fc.jsonValue())])(
    "reads the exp claim of a JWT, whatever other claims it carries",
    (exp, claims) => {
      const token = fakeJwt({ ...claims, exp });

      expect(tokenExpiry(token)).toStrictEqual(
        Option.some(new Date(exp * 1000)),
      );
    },
  );

  test.prop([fc.string()])("never throws on a malformed token", (token) => {
    expect(() => tokenExpiry(token)).not.toThrow();
  });

  test.prop([fc.dictionary(fc.string(), fc.string())])(
    "has no expiry without a numeric exp claim",
    (claims) => {
      const token = fakeJwt({ ...claims, exp: "soon" });

      expect(tokenExpiry(token)).toStrictEqual(Option.none());
    },
  );
});

describe("sessionState", () => {
  const nowMs = 1_800_000_000_000;
  const accessExpiringIn = (ms: number) =>
    AccessToken.make(fakeJwt({ exp: (nowMs + ms) / 1000 }));
  const refreshToken = RefreshToken.make("refresh");
  const cookies = (
    accessToken: Option.Option<AccessToken>,
    refresh: Option.Option<RefreshToken>,
  ): SessionCookies => ({ accessToken, refreshToken: refresh });
  const anyRefresh = fc
    .option(fc.constant(RefreshToken.make("refresh")), {
      nil: undefined,
    })
    .map(Option.fromUndefinedOr);

  test.prop([
    fc.integer({ min: RENEW_MARGIN_MS + 1, max: 86_400_000 }),
    anyRefresh,
  ])("uses an access token that outlives the renew margin", (ms, refresh) => {
    const accessToken = accessExpiringIn(ms);

    expect(
      sessionState(cookies(Option.some(accessToken), refresh), nowMs),
    ).toStrictEqual({ _tag: "Active", accessToken });
  });

  test.prop([fc.integer({ min: -86_400_000, max: RENEW_MARGIN_MS })])(
    "renews an access token that is expired or within the renew margin",
    (ms) => {
      expect(
        sessionState(
          cookies(Option.some(accessExpiringIn(ms)), Option.some(refreshToken)),
          nowMs,
        ),
      ).toStrictEqual({ _tag: "Renewable", refreshToken });
    },
  );

  test.prop([fc.option(fc.string(), { nil: undefined })])(
    "renews when the access token is missing or unreadable",
    (raw) => {
      const accessToken = Option.fromUndefinedOr(raw).pipe(
        Option.map(AccessToken.make),
      );

      expect(
        sessionState(cookies(accessToken, Option.some(refreshToken)), nowMs),
      ).toStrictEqual({ _tag: "Renewable", refreshToken });
    },
  );

  test.prop([fc.integer({ min: -86_400_000, max: RENEW_MARGIN_MS })])(
    "is anonymous when the access token is stale and nothing can renew it",
    (ms) => {
      expect(
        sessionState(
          cookies(Option.some(accessExpiringIn(ms)), Option.none()),
          nowMs,
        ),
      ).toStrictEqual({ _tag: "Anonymous" });
    },
  );

  test.prop([fc.integer({ min: -86_400_000, max: 86_400_000 }), fc.nat()])(
    "once a token needs renewing, it needs renewing at every later time",
    (ms, laterMs) => {
      const session = cookies(
        Option.some(accessExpiringIn(ms)),
        Option.some(refreshToken),
      );
      fc.pre(sessionState(session, nowMs)._tag === "Renewable");

      expect(sessionState(session, nowMs + laterMs)._tag).toBe("Renewable");
    },
  );
});
