// @vitest-environment node
import { fakeJwt } from "@test/fakeBackend";
import { installFakeBackend } from "@test/installFakeBackend";
import { installFrozenClock, MINUTE } from "@test/installFrozenClock";
import { getRedirectUrl } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const backend = installFakeBackend();

const NOW = new Date("2026-10-27T12:00:00Z");
const clock = installFrozenClock(NOW);

function visit(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return proxy(
    new NextRequest(new URL(path, "https://app.test"), {
      headers: { cookie, "accept-language": "en" },
    }),
  );
}

function session(tokens: { accessToken: string; refreshToken: string }) {
  return {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  };
}

describe("proxy", () => {
  describe("without a session", () => {
    it("redirects a page to the login page with the page as return path", async () => {
      const response = await visit("/todos?done=true");

      expect(getRedirectUrl(response)).toBe(
        "https://app.test/login?returnTo=%2Ftodos%3Fdone%3Dtrue",
      );
    });

    it("redirects to the login page of the page's locale", async () => {
      const response = await visit("/bg/todos");

      expect(getRedirectUrl(response)).toBe(
        "https://app.test/bg/login?returnTo=%2Fbg%2Ftodos",
      );
    });

    it("redirects the home page", async () => {
      const response = await visit("/");

      expect(getRedirectUrl(response)).toBe(
        "https://app.test/login?returnTo=%2F",
      );
    });

    it.each(["/login", "/bg/login"])(
      "serves the login page %s",
      async (path) => {
        const response = await visit(path);

        expect(getRedirectUrl(response)).toBeNull();
        expect(response.status).toBe(200);
      },
    );
  });

  describe("with a live session", () => {
    it("serves the page without touching the cookies", async () => {
      const tokens = backend.current.login();

      const response = await visit("/todos", session(tokens));

      expect(getRedirectUrl(response)).toBeNull();
      expect(response.cookies.getAll()).toStrictEqual([]);
      expect(backend.current.requests).toStrictEqual([]);
    });

    it("sends the login page on to a valid return path", async () => {
      const tokens = backend.current.login();

      const response = await visit(
        "/login?returnTo=%2Fbg%2Ftodos%3Fdone%3Dtrue",
        session(tokens),
      );

      expect(getRedirectUrl(response)).toBe(
        "https://app.test/bg/todos?done=true",
      );
    });

    it.each(["https://evil.example", "//evil.example", "/\\evil.example"])(
      "sends the login page home instead of to %s",
      async (returnTo) => {
        const tokens = backend.current.login();

        const response = await visit(
          `/bg/login?returnTo=${encodeURIComponent(returnTo)}`,
          session(tokens),
        );

        expect(getRedirectUrl(response)).toBe("https://app.test/bg");
      },
    );
  });

  describe("with a stale access token", () => {
    it.each([
      ["expired", 61 * MINUTE],
      ["near expiry", 59.5 * MINUTE],
    ])("renews an %s token and serves the page with it", async (_, elapsed) => {
      const tokens = backend.current.login();
      clock.elapse(elapsed);

      const response = await visit("/todos", session(tokens));

      expect(getRedirectUrl(response)).toBeNull();
      const renewed = response.cookies.get("access_token");
      expect(renewed).toMatchObject({ httpOnly: true, secure: true });
      expect(renewed?.value).not.toBe(tokens.accessToken);
      expect(response.cookies.get("refresh_token")?.value).toBeDefined();
      // The page rendering in this request reads the renewed token too.
      expect(response.headers.get("x-middleware-request-cookie")).toContain(
        `access_token=${renewed?.value}`,
      );
    });

    it("renews when only the refresh token is left", async () => {
      const { refreshToken } = backend.current.login();

      const response = await visit("/todos", { refresh_token: refreshToken });

      expect(getRedirectUrl(response)).toBeNull();
      expect(response.cookies.get("access_token")?.value).toMatch(/\./);
    });

    it("clears the cookies and redirects to login when the refresh token is rejected", async () => {
      const expired = fakeJwt({ exp: NOW.getTime() / 1000 - 60 });

      const response = await visit("/todos", {
        access_token: expired,
        refresh_token: "revoked",
      });

      expect(getRedirectUrl(response)).toBe(
        "https://app.test/login?returnTo=%2Ftodos",
      );
      expect(response.cookies.get("access_token")).toMatchObject({
        value: "",
        maxAge: 0,
      });
      expect(response.cookies.get("refresh_token")).toMatchObject({
        value: "",
        maxAge: 0,
      });
    });
  });
});
